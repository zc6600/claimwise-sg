"""Check reproducibility, questionnaire accounting and synthetic provenance exports."""

from copy import deepcopy
import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from common import ROOT
from simple_user_study import analyze
from simulate_user_study import generate, simulate_records


def design_fixture():
    design = json.loads((ROOT / "evaluation/simple_study_scenarios.json").read_text())
    design["data_origin"] = "synthetic"
    return design


class SimulationTests(unittest.TestCase):
    def test_seed_reproduces_records_and_a_different_seed_changes_the_sample(self):
        design = design_fixture()
        first = simulate_records(26, 5224, design)
        self.assertEqual(first, simulate_records(26, 5224, design))
        self.assertNotEqual(first, simulate_records(26, 5225, design))
        people, tasks, feedback = first
        self.assertEqual((len(people), len(tasks), len(feedback)), (26, 52, 26))
        self.assertEqual(len({row["participant_id"] for row in people}), 26)
        self.assertTrue(all(row["participant_id"].startswith("SIM-") for row in people))
        report = analyze(people, tasks, feedback, design)
        self.assertEqual(sorted(report["sequence_groups"].values()), [6, 6, 7, 7])
        self.assertEqual(report["actual_participants"], 0)
        self.assertEqual(report["consented_complete"], 0)
        self.assertEqual(report["complete_pairs"], 26)
        self.assertEqual(report["synthetic_complete_pairs"], 26)

    def test_reserved_identifiers_and_origin_metadata_cannot_be_silently_mixed(self):
        design = design_fixture()
        people, tasks, feedback = simulate_records(26, 5224, design)
        for mutation in ["missing_origin", "unknown_origin", "mixed_identifiers"]:
            changed_design, changed_people = deepcopy(design), deepcopy(people)
            if mutation == "missing_origin":
                changed_design.pop("data_origin")
            elif mutation == "unknown_origin":
                changed_design["data_origin"] = "unknown"
            else:
                changed_people[0]["participant_id"] = "P001"
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                analyze(changed_people, tasks, feedback, changed_design)

    def test_exports_preserve_all_26_responses_and_identify_them_as_synthetic(self):
        with tempfile.TemporaryDirectory() as parent:
            directory, report = generate(26, 5224, Path(parent))
            stored = json.loads((directory / "report.json").read_text())
            self.assertEqual(stored["data_origin"], "synthetic")
            self.assertEqual(stored["actual_participants"], 0)
            self.assertEqual(stored["enrolled"], 0)
            self.assertEqual(len(list((directory / "questionnaires").glob("SIM-*.md"))), 26)
            for card in (directory / "questionnaires").glob("*.md"):
                self.assertIn("Data origin: synthetic", card.read_text())
            for filename in ["synthetic_questionnaires.csv", "participant_scores.csv"]:
                with (directory / filename).open() as file:
                    rows = list(csv.DictReader(file))
                self.assertEqual(len(rows), 26)
                self.assertEqual({row["data_origin"] for row in rows}, {"synthetic"})
            source = json.loads((directory / "responses/design.json").read_text())
            self.assertEqual(source["planned_participants"], 0)
            self.assertEqual(source["planned_records"], 26)
            self.assertIn("actual participants: 0", (directory / "summary.md").read_text())
            self.assertIn("source_sha256", report)
            self.assertEqual(len(list(Path(parent).iterdir())), 1)

    def test_cli_reanalysis_keeps_synthetic_labels_and_counts_zero_human_participants(self):
        with tempfile.TemporaryDirectory() as parent:
            directory, _ = generate(26, 5224, Path(parent) / "source")
            output = Path(parent) / "analysis"
            result = subprocess.run([sys.executable, str(ROOT / "evaluation/simple_user_study.py"), "analyze",
                                     "--directory", str(directory / "responses"), "--output-root", str(output)],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("26 synthetic record pairs", result.stdout)
            self.assertNotIn("actual completed participant", result.stdout)
            paths = list(output.iterdir())
            self.assertEqual(len(paths), 1)
            self.assertTrue(paths[0].name.startswith("synthetic-user-study-"))
            self.assertEqual(json.loads((paths[0] / "report.json").read_text())["actual_participants"], 0)

    def test_invalid_record_counts_fail_without_creating_artifacts(self):
        for count in [0, -1, 2001]:
            with self.subTest(count=count), tempfile.TemporaryDirectory() as parent:
                with self.assertRaises(ValueError):
                    generate(count, 5224, Path(parent))
                self.assertEqual(list(Path(parent).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
