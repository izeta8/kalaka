from typing import Literal

import openai

from database.database import (
    RecordChanged,
    count_content_failures,
    fetch_oldest_unmoderated_post,
    update_post_moderation,
)
from moderation.classifiers import (
    GEMMA_MODEL,
    classify_gemma,
    get_labels_from_infractions,
    get_moderation_status_by_labels,
)

# After this many content failures a person reviews the post
MAX_CONTENT_FAILURES = 3

# Transient errors of the model server, raised once the client has used its own retries.
# APITimeoutError is a subclass of APIConnectionError, so it is covered too.
# Other API errors (400, 401, 404: bad config) are not caught: they must stop the worker.
INFRA_ERRORS = (openai.APIConnectionError, openai.RateLimitError, openai.InternalServerError)

Outcome = Literal["empty", "moderated", "content_failure", "infra_failure", "changed"]


def moderate_next_post() -> Outcome:
    post = fetch_oldest_unmoderated_post()
    if post is None:
        return "empty"

    post_id, content, from_status = post

    try:
        result = classify_gemma(content)
    except INFRA_ERRORS as e:
        # Not the post's fault: keep its status and don't spend an attempt
        return _save(post_id, from_status, from_status, [], repr(e), infra_failure=True, outcome="infra_failure")

    if result is None:
        # The model answered, but with invalid or blocked output
        failures = count_content_failures(post_id) + 1
        to_status = "pending_review" if failures >= MAX_CONTENT_FAILURES else "failed"
        error = f"Invalid or blocked model output (content failure {failures} of {MAX_CONTENT_FAILURES})"
        return _save(post_id, from_status, to_status, [], error, outcome="content_failure")

    labels = get_labels_from_infractions(result.infractions)
    to_status = get_moderation_status_by_labels(labels)
    return _save(post_id, from_status, to_status, labels, None, outcome="moderated")


def _save(post_id, from_status, to_status, tags, error, outcome: Outcome, infra_failure=False) -> Outcome:
    try:
        update_post_moderation(post_id, from_status, to_status, "ai", tags, GEMMA_MODEL, error, infra_failure)
    except RecordChanged as e:
        # Someone (a person) moved the post while the model was thinking: their decision wins
        print(f"Post {post_id} skipped: {e}")
        return "changed"

    print(f"Post {post_id}: {from_status} -> {to_status} ({outcome})")
    return outcome


if __name__ == "__main__":
    print(moderate_next_post())
