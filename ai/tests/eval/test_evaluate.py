import tempfile
import unittest
from pathlib import Path

from eval.evaluate import Model, evaluate, hash_prompt
from moderation.classifiers import SYSTEM_PROMPT, SHORT_ID_PLACEHOLDER


class HashPromptTest(unittest.TestCase):
    def test_same_prompt_gives_same_hash(self):
        self.assertEqual(hash_prompt(SYSTEM_PROMPT), hash_prompt(SYSTEM_PROMPT))

    def test_one_character_changes_the_hash(self):
        self.assertNotEqual(hash_prompt(SYSTEM_PROMPT), hash_prompt(SYSTEM_PROMPT + " "))


class EvaluateWritesPromptTest(unittest.TestCase):
    def test_prompt_template_is_saved_next_to_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            dataset = tmp / "dataset.jsonl"
            dataset.write_text(
                '{"id":"t-1","text":"kaixo","labels":["ok"],"language":"eu-batua",'
                '"style":"correct","kind":"normal","note":"","reviewed":true}\n'
            )
            run_dir = tmp / "runs" / f"prompt-{hash_prompt(SYSTEM_PROMPT)}"
            model = Model(
                name="fake",
                dataset_file=dataset,
                evaluation_file=run_dir / "results.jsonl",
                metrics_file=run_dir / "metrics.txt",
                prompt_file=run_dir / "prompt.txt",
                # No network: a classifier that always fails, as if the model returned nothing
                classify_function=lambda post: None,
            )

            evaluate(model)

            saved = model.prompt_file.read_text()
            self.assertEqual(saved, SYSTEM_PROMPT)
            # The template, not a prompt with a per-call delimiter already substituted
            self.assertIn(SHORT_ID_PLACEHOLDER, saved)
            self.assertEqual(len(model.evaluation_file.read_text().splitlines()), 1)


if __name__ == "__main__":
    unittest.main()
