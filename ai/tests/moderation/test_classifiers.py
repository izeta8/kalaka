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
