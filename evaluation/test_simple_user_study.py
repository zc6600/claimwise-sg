"""Verify short-study assignment, paired analysis and rejection of invalid observations."""

from collections import Counter
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from common import ROOT, read_csv
from simple_user_study import (analyze, prepare, PARTICIPANT_FIELDS, TASK_FIELDS,
                               FEEDBACK_FIELDS, SEQUENCES)


def design_fixture():
    return json.loads((ROOT / "evaluation/simple_study_scenarios.json").read_text())


def collected_fixture():
    design = design_fixture()
    answers = {row["id"]: row["expected"]["decision"] for row in design["scenarios"]}
    people, tasks, feedback = [], [], []
    for index, (group, sequence) in enumerate(SEQUENCES.items()):
        pid = f"TEST{index}"
        people.append({**dict.fromkeys(PARTICIPANT_FIELDS, ""), "participant_id": pid, "consent": "yes", "sequence_group": group,
                       "driving_experience": "no_licence" if index % 2 else "1_to_3", "insurance_knowledge": "2",
                       "online_search_skill": "4", "ai_search_skill": "not_used" if index % 2 else "3"})
        for period, (scenario, condition) in enumerate(sequence, 1):
            correct = answers[scenario]
            assisted = condition == "with_app"
            tasks.append({"participant_id": pid, "period": str(period), "scenario_id": scenario, "condition": condition,
                          "decision": correct if assisted else ("self-pay" if correct == "claim" else "claim"),
                          "confidence": "5" if assisted else "2", "app_used": "yes" if assisted else "no",
                          "other_tools": "web", "time_seconds": ("20" if assisted else "60") if index < 2 else ""})
        feedback.append({"participant_id": pid, "ease_of_use": "4", "usefulness": "5"})
    return people, tasks, feedback, design


class SimpleStudyTests(unittest.TestCase):
    def test_two_tasks_per_person_balance_all_sequences_and_do_not_generate_observations(self):
        with tempfile.TemporaryDirectory() as parent:
            directory = Path(parent) / "study"
            prepare(directory, 12, 5224, design_fixture())
            people = read_csv(directory / "participants.csv", PARTICIPANT_FIELDS)
            tasks = read_csv(directory / "tasks.csv", TASK_FIELDS)
            feedback = read_csv(directory / "feedback.csv", FEEDBACK_FIELDS)
            self.assertEqual(Counter(row["sequence_group"] for row in people), dict.fromkeys(SEQUENCES, 3))
            self.assertEqual(len(tasks), 24)
            for person in people:
                assigned = [row for row in tasks if row["participant_id"] == person["participant_id"]]
                self.assertEqual({row["scenario_id"] for row in assigned}, {"A", "B"})
                self.assertEqual({row["condition"] for row in assigned}, {"with_app", "without_app"})
                self.assertTrue(all(row["decision"] == row["app_used"] == row["confidence"] == "" for row in assigned))
            self.assertNotIn("6265.23", (directory / "scenario_cards.md").read_text())
            self.assertIn("6265.23", (directory / "answer_key.md").read_text())
            with self.assertRaisesRegex(ValueError, "No consented"):
                analyze(people, tasks, feedback, design_fixture())
            with self.assertRaises(FileExistsError):
                prepare(directory, 12, 5224, design_fixture())

    def test_paired_accuracy_scenario_counts_and_optional_timing_denominators(self):
        result = analyze(*collected_fixture())
        self.assertEqual(result["consented_complete"], 4)
        self.assertEqual(result["metrics"]["accuracy_pct"]["mean_paired_change"], 100)
        self.assertEqual(result["metrics"]["confidence"]["mean_paired_change"], 3)
        self.assertEqual(result["metrics"]["time_seconds"]["paired_n"], 2)
        self.assertEqual(result["metrics"]["time_seconds"]["mean_paired_change"], -40)
        self.assertTrue(all(row["n"] == 2 for row in result["by_scenario"].values()))
        self.assertEqual(result["background_exploration"]["ai_search_skill"]["not_used"]["n"], 2)
        self.assertEqual(result["decision_transitions"]["incorrect_to_correct"], 4)
        self.assertNotIn("sus", result)

    def test_optional_background_feedback_and_missing_times_are_not_imputed(self):
        people, tasks, feedback, design = collected_fixture()
        for row in people:
            for field in PARTICIPANT_FIELDS[3:]:
                row[field] = ""
        for row in tasks:
            row["time_seconds"] = "60" if row["condition"] == "without_app" else ""
        result = analyze(people, tasks, [], design)
        self.assertEqual(result["metrics"]["time_seconds"]["paired_n"], 0)
        self.assertIsNone(result["metrics"]["time_seconds"]["with_app_mean"])
        self.assertEqual(result["feedback"]["ease_of_use"], {"n": 0, "mean_1_to_5": None})
        self.assertEqual(result["background_exploration"]["driving_experience"]["not_answered"]["n"], 4)

    def test_invalid_incomplete_nonconsented_and_misassigned_records_are_rejected(self):
        for mutation in ["missing", "duplicate", "wrong_scenario", "wrong_period", "no_consent", "app_violation", "nan", "bad_rating", "unknown_id", "duplicate_feedback", "bad_feedback", "legacy"]:
            people, tasks, feedback, design = collected_fixture()
            if mutation == "missing": tasks.pop()
            elif mutation == "duplicate": tasks.append(deepcopy(tasks[0]))
            elif mutation == "wrong_scenario": tasks[0]["scenario_id"] = "B"
            elif mutation == "wrong_period": tasks[0]["period"] = "2"
            elif mutation == "no_consent": people[0]["consent"] = "no"
            elif mutation == "app_violation": tasks[0]["app_used"] = "yes"
            elif mutation == "nan": tasks[0]["time_seconds"] = "nan"
            elif mutation == "bad_rating": people[0]["insurance_knowledge"] = "6"
            elif mutation == "unknown_id": tasks[0]["participant_id"] = "UNKNOWN"
            elif mutation == "duplicate_feedback": feedback.append(deepcopy(feedback[0]))
            elif mutation == "bad_feedback": feedback[0]["usefulness"] = "0"
            else: design["schema_version"] = 1
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                analyze(people, tasks, feedback, design)

    def test_cli_refuses_to_create_a_results_directory_from_blank_forms(self):
        with tempfile.TemporaryDirectory() as parent:
            directory = Path(parent) / "study"
            output = Path(parent) / "results"
            prepare(directory, 4, 5224, design_fixture())
            result = subprocess.run([sys.executable, str(ROOT / "evaluation/simple_user_study.py"), "analyze",
                                     "--directory", str(directory), "--output-root", str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn("No consented", result.stderr)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
