import subprocess
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx2
import openai

from database.database import RecordChanged
from moderation import worker
from moderation.classifiers import ClassifierSchema, Infraction

POST = (4, "Ander, hi baino astoagorik ez dago herrian haha", "pending")


@patch.object(worker, "update_post_moderation")
@patch.object(worker, "fetch_oldest_unmoderated_post", return_value=POST)
class ModerateNextPostTest(unittest.TestCase):
    def saved_status(self, update):
        # update_post_moderation(post_id, from_status, to_status, actor, tags, model, error, infra_failure)
        args = update.call_args.args
        return args[1], args[2], args[7]

    def test_classified_post_gets_the_status_of_its_labels(self, _fetch, update):
        result = ClassifierSchema(infractions=[Infraction(evidence="astoagorik", reason="Insult", label="insult")])
        with patch.object(worker, "classify_gemma", return_value=result):
            self.assertEqual(worker.moderate_next_post(), "moderated")
        self.assertEqual(self.saved_status(update), ("pending", "censored", False))

    def test_infra_failure_keeps_the_status_and_spends_no_attempt(self, _fetch, update):
        down = openai.APIConnectionError(request=httpx2.Request("POST", "http://localhost:1"))
        with patch.object(worker, "classify_gemma", side_effect=down):
            self.assertEqual(worker.moderate_next_post(), "infra_failure")
        self.assertEqual(self.saved_status(update), ("pending", "pending", True))

    def test_third_content_failure_goes_to_human_review(self, _fetch, update):
        with patch.object(worker, "classify_gemma", return_value=None), \
             patch.object(worker, "count_content_failures", return_value=2):
            self.assertEqual(worker.moderate_next_post(), "content_failure")
        self.assertEqual(self.saved_status(update), ("pending", "pending_review", False))

    def test_post_changed_by_someone_else_is_skipped(self, _fetch, update):
        update.side_effect = RecordChanged("changed")
        with patch.object(worker, "classify_gemma", return_value=ClassifierSchema(infractions=[])):
            self.assertEqual(worker.moderate_next_post(), "changed")

    def test_shutdown_while_classifying_saves_nothing(self, _fetch, update):
        with patch.object(worker, "classify_gemma", side_effect=worker.ShutdownRequested()):
            with self.assertRaises(worker.ShutdownRequested):
                worker.moderate_next_post()
        update.assert_not_called()


class WaitSecondsTest(unittest.TestCase):
    def test_waits_only_when_there_is_nothing_useful_to_do(self):
        self.assertEqual(worker.wait_seconds("moderated"), 0)
        self.assertEqual(worker.wait_seconds("empty"), worker.EMPTY_QUEUE_WAIT_SECONDS)
        self.assertEqual(worker.wait_seconds("infra_failure"), worker.INFRA_FAILURE_WAIT_SECONDS)


# Runs the real entry point with an empty queue (no database) and stops it like `docker stop` does
WORKER_WITH_EMPTY_QUEUE = """
import runpy
from unittest.mock import patch
with patch("database.database.fetch_oldest_unmoderated_post", return_value=None):
    runpy.run_module("moderation.worker", run_name="__main__")
"""


class SigtermTest(unittest.TestCase):
    def test_sigterm_stops_the_worker_at_once_with_exit_code_0(self):
        ai_dir = Path(__file__).resolve().parents[2]
        proc = subprocess.Popen([sys.executable, "-u", "-c", WORKER_WITH_EMPTY_QUEUE],
                                cwd=ai_dir, stdout=subprocess.PIPE, text=True)
        self.assertIn("started", proc.stdout.readline())  # now it is sleeping on the empty queue

        start = time.monotonic()
        proc.terminate()  # SIGTERM
        output, _ = proc.communicate(timeout=5)

        self.assertEqual(proc.returncode, 0)
        self.assertLess(time.monotonic() - start, 1)
        self.assertIn("received SIGTERM", output)
