import unittest

from moderation.classifiers import get_moderation_status_by_labels


class ModerationStatusByLabelsTest(unittest.TestCase):
    def test_ok_post_is_approved(self):
        self.assertEqual(get_moderation_status_by_labels(["ok"]), "approved")

    def test_insult_is_censored(self):
        self.assertEqual(get_moderation_status_by_labels(["insult"]), "censored")

    def test_threat_wins_over_insult(self):
        # Mixed labels: the most severe one decides, so a person reviews it
        self.assertEqual(get_moderation_status_by_labels(["insult", "threat"]), "pending_review")


from types import SimpleNamespace
from unittest.mock import patch

from moderation import classifiers
from moderation.classifiers import ModelNotReady

# Only Gemma is configured, as in the worker's .env.worker for production
GEMMA_ONLY = dict(
    GEMINI_API_KEY=None, GEMINI_BASE_URL=None, GEMINI_MODEL=None,
    LLAMA_API_KEY=None, LLAMA_MODEL=None, LATXA_API_KEY=None, LATXA_MODEL=None,
    GEMMA_API_KEY="ollama", GEMMA_MODEL="gemma3:4b", OLLAMA_BASE_URL="http://127.0.0.1:11434/v1",
)


def served(*models):
    return [SimpleNamespace(id=m) for m in models]


class ModelClientsTest(unittest.TestCase):
    def setUp(self):
        for getter in (classifiers.gemini_client, classifiers.llama_client, classifiers.gemma_client, classifiers.latxa_client):
            getter.cache_clear()
        self.addCleanup(lambda: classifiers.gemma_client.cache_clear())

    def env(self, **overrides):
        return patch.multiple(classifiers, **{**GEMMA_ONLY, **overrides})

    def test_gemma_is_ready_without_the_settings_of_other_models(self):
        with self.env(), patch("openai.resources.models.Models.list", return_value=served("gemma3:4b", "llama3.2")):
            classifiers.check_gemma_is_ready()
            self.assertIs(classifiers.gemma_client(), classifiers.gemma_client())  # one instance, reused

    def test_an_unused_model_fails_only_when_it_is_used(self):
        with self.env():
            with self.assertRaisesRegex(ModelNotReady, "GEMINI_API_KEY"):
                classifiers.gemini_client()

    def test_missing_ollama_url_fails_instead_of_going_to_openai(self):
        with self.env(OLLAMA_BASE_URL=None):
            with self.assertRaisesRegex(ModelNotReady, "OLLAMA_BASE_URL"):
                classifiers.check_gemma_is_ready()

    def test_misspelled_model_fails(self):
        with self.env(GEMMA_MODEL="gema3:4b"), patch("openai.resources.models.Models.list", return_value=served("gemma3:4b")):
            with self.assertRaisesRegex(ModelNotReady, "gema3:4b"):
                classifiers.check_gemma_is_ready()

    def test_model_server_down_fails(self):
        # Port 9 (discard) refuses the connection at once
        with self.env(OLLAMA_BASE_URL="http://127.0.0.1:9/v1"):
            with self.assertRaisesRegex(ModelNotReady, "Can't reach"):
                classifiers.check_gemma_is_ready()
