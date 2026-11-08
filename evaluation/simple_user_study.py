"""Prepare and analyze a brief, two-task participant scenario study."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import random
import statistics
import sys

from common import ROOT, new_run, number, read_csv, utc_now, write_csv, write_json

PARTICIPANT_FIELDS = ["participant_id", "consent", "sequence_group", "driving_experience",
                      "insurance_knowledge", "online_search_skill", "ai_search_skill"]
TASK_FIELDS = ["participant_id", "period", "scenario_id", "condition", "decision", "confidence",
               "app_used", "other_tools", "time_seconds"]
FEEDBACK_FIELDS = ["participant_id", "ease_of_use", "usefulness"]
BACKGROUND_FIELDS = PARTICIPANT_FIELDS[3:]
DRIVING_OPTIONS = {"no_licence", "under_1", "1_to_3", "4_to_9", "10_plus"}
OTHER_TOOLS = {"none", "calculator", "web", "ai", "mixed"}
SEQUENCES = {
    "G1": [("A", "without_app"), ("B", "with_app")],
    "G2": [("A", "with_app"), ("B", "without_app")],
    "G3": [("B", "without_app"), ("A", "with_app")],
    "G4": [("B", "with_app"), ("A", "without_app")],
}


def validate_design(design):
    if design.get("schema_version") != 2 or {row["id"] for row in design["scenarios"]} != {"A", "B"} or len(design["scenarios"]) != 2:
        raise ValueError("Only the version 2 two-scenario study design is supported.")
    if design.get("data_origin", "collected") not in {"collected", "synthetic"}:
        raise ValueError("Unknown response-data origin.")
    for row in design["scenarios"]:
        if row["expected"]["decision"] not in {"claim", "self-pay"}:
            raise ValueError("Invalid frozen scenario answer.")


def optional_rating(value, field):
    return int(number(value, 1, 5, field, integer=True)) if value else None


def summarize_pairs(scores):
    result = {}
    for metric in ["accuracy_pct", "confidence", "time_seconds"]:
        paired = [row for row in scores if row[f"without_app_{metric}"] is not None and row[f"with_app_{metric}"] is not None]
        result[metric] = {"paired_n": len(paired),
                          "without_app_mean": statistics.mean(row[f"without_app_{metric}"] for row in paired) if paired else None,
                          "with_app_mean": statistics.mean(row[f"with_app_{metric}"] for row in paired) if paired else None,
                          "mean_paired_change": statistics.mean(row[f"with_app_{metric}"] - row[f"without_app_{metric}"] for row in paired) if paired else None}
    return result


def analyze(participants, tasks, feedback, design):
    validate_design(design)
    synthetic = design.get("data_origin") == "synthetic"
    if any(row["participant_id"].startswith("SIM-") for row in participants) and not synthetic:
        raise ValueError("SIM- identifiers require a synthetic data-origin declaration.")
    if synthetic and any(not row["participant_id"].startswith("SIM-") for row in participants):
        raise ValueError("Synthetic records use the reserved SIM- identifier namespace.")
    scenarios = {row["id"]: row for row in design["scenarios"]}
    people = {}
    for row in participants:
        pid = row["participant_id"]
        if not pid or pid in people or row["consent"] not in {"", "yes", "no"} or row["sequence_group"] not in SEQUENCES:
            raise ValueError("Participant IDs must be unique; consent and sequence group must match the template.")
        if row["consent"] != "yes" and any(row[field] for field in BACKGROUND_FIELDS):
            raise ValueError(f"Background responses require consent for {pid}.")
        if row["driving_experience"] and row["driving_experience"] not in DRIVING_OPTIONS:
            raise ValueError(f"Invalid driving experience for {pid}.")
        for field in BACKGROUND_FIELDS[1:]:
            if field == "ai_search_skill" and row[field] == "not_used":
                continue
            optional_rating(row[field], field)
        people[pid] = row
    seen_tasks, observations = set(), {}
    for row in tasks:
        pid = row["participant_id"]
        if pid not in people or row["period"] not in {"1", "2"}:
            raise ValueError("Task references an unknown participant or period.")
        key = (pid, row["period"])
        if key in seen_tasks:
            raise ValueError(f"Duplicate task for {pid}.")
        seen_tasks.add(key)
        expected_scenario, expected_condition = SEQUENCES[people[pid]["sequence_group"]][int(row["period"]) - 1]
        if (row["scenario_id"], row["condition"]) != (expected_scenario, expected_condition):
            raise ValueError(f"Scenario, condition or period mismatch for {pid}.")
        if not any(row[field] for field in TASK_FIELDS[4:]):
            continue
        if people[pid]["consent"] != "yes":
            raise ValueError(f"Task observations require consent for {pid}.")
        if row["decision"] not in {"claim", "self-pay"} or row["app_used"] != ("yes" if expected_condition == "with_app" else "no"):
            raise ValueError(f"Invalid decision or application-use mismatch for {pid}.")
        confidence = number(row["confidence"], 1, 5, "Confidence", integer=True)
        if row["other_tools"] and row["other_tools"] not in OTHER_TOOLS:
            raise ValueError(f"Invalid external-tool category for {pid}.")
        duration = number(row["time_seconds"], 0.001, 86400, "Task duration") if row["time_seconds"] else None
        observations[key] = {"scenario_id": expected_scenario, "condition": expected_condition,
                             "accuracy_pct": 100 * (row["decision"] == scenarios[expected_scenario]["expected"]["decision"]),
                             "confidence": confidence, "time_seconds": duration, "other_tools": row["other_tools"] or "not_recorded"}
    seen_feedback, feedback_values = set(), {}
    for row in feedback:
        pid = row["participant_id"]
        if pid not in people or pid in seen_feedback:
            raise ValueError("Feedback references an unknown participant or duplicates a record.")
        seen_feedback.add(pid)
        if not any(row[field] for field in FEEDBACK_FIELDS[1:]):
            continue
        if people[pid]["consent"] != "yes":
            raise ValueError(f"Feedback requires consent for {pid}.")
        feedback_values[pid] = {field: optional_rating(row[field], field) for field in FEEDBACK_FIELDS[1:]}
    consented = [pid for pid, row in people.items() if row["consent"] == "yes"]
    if not consented:
        raise ValueError("No consented participants with collected responses; blank templates are not study results.")
    scores = []
    for pid in consented:
        if any((pid, period) not in observations for period in ["1", "2"]):
            raise ValueError(f"Incomplete two-task pair for {pid}; complete it or explicitly withdraw the record.")
        score = {"participant_id": pid, "sequence_group": people[pid]["sequence_group"]}
        for period in ["1", "2"]:
            observation = observations[(pid, period)]
            score.update({f"{observation['condition']}_{metric}": observation[metric] for metric in ["accuracy_pct", "confidence", "time_seconds"]})
        scores.append(score)
    valid_observations = [row for (pid, _), row in observations.items() if pid in consented]
    by_scenario = {}
    tools = {}
    for condition in ["without_app", "with_app"]:
        tools[condition] = dict(Counter(row["other_tools"] for row in valid_observations if row["condition"] == condition))
        for sid in scenarios:
            selected = [row for row in valid_observations if row["scenario_id"] == sid and row["condition"] == condition]
            by_scenario[f"{sid}/{condition}"] = {"n": len(selected), "accuracy_pct": statistics.mean(row["accuracy_pct"] for row in selected) if selected else None}
    by_background = {}
    for field in BACKGROUND_FIELDS:
        by_background[field] = {}
        for level in sorted({people[pid][field] or "not_answered" for pid in consented}):
            selected = [row for row in scores if (people[row["participant_id"]][field] or "not_answered") == level]
            by_background[field][level] = {"n": len(selected), "metrics": summarize_pairs(selected)}
    feedback_summary = {}
    for field in FEEDBACK_FIELDS[1:]:
        values = [row[field] for pid, row in feedback_values.items() if pid in consented and row[field] is not None]
        feedback_summary[field] = {"n": len(values), "mean_1_to_5": statistics.mean(values) if values else None}
    return {"study_type": "synthetic_scenario_study" if synthetic else "participant_scenario_study",
            "data_origin": "synthetic" if synthetic else "collected",
            "record_count": len(people), "complete_pairs": len(scores),
            "actual_participants": 0 if synthetic else len(scores),
            "synthetic_complete_pairs": len(scores) if synthetic else 0,
            "enrolled": 0 if synthetic else len(people), "consented_complete": 0 if synthetic else len(scores),
            "pending_or_declined": 0 if synthetic else len(people) - len(scores), "metrics": summarize_pairs(scores),
            "sequence_groups": {group: sum(row["sequence_group"] == group for row in scores) for group in SEQUENCES},
            "by_sequence": {group: {"n": sum(row["sequence_group"] == group for row in scores),
                                    "metrics": summarize_pairs([row for row in scores if row["sequence_group"] == group])} for group in SEQUENCES},
            "by_scenario": by_scenario, "background_exploration": by_background,
            "external_tools": tools, "feedback": feedback_summary, "participant_scores": scores,
            "decision_transitions": {"incorrect_to_correct": sum(row["without_app_accuracy_pct"] == 0 and row["with_app_accuracy_pct"] == 100 for row in scores),
                                     "correct_to_incorrect": sum(row["without_app_accuracy_pct"] == 100 and row["with_app_accuracy_pct"] == 0 for row in scores)},
            "limitations": (["All questionnaire answers, consent/use flags, ratings and durations are simulated. No people participated; outputs are pipeline demonstrations, not empirical user evidence."] if synthetic else []) + ["Synthetic scenarios; no actual accident outcomes or realized savings.",
                            "One different task per condition; scenario difficulty, carryover, order and external-tool use remain possible influences.",
                            "Background skill ratings are optional self-reports, not validated ability measurements or causal subgroup effects.",
                            "Feedback items are custom ratings, not SUS. Durations are analyzed only for participants with both times recorded.",
                            "Descriptive results only; no population effectiveness or statistical-significance claim."]}


def prepare(directory, count, seed, design):
    validate_design(design)
    if not 1 <= count <= 2000:
        raise ValueError("Participant count must be between 1 and 2000.")
    directory.mkdir(parents=True, exist_ok=False)
    rng = random.Random(seed)
    groups = [list(SEQUENCES)[index % 4] for index in range(count)]
    rng.shuffle(groups)
    participants, tasks = [], []
    for index, group in enumerate(groups, 1):
        pid = f"P{index:03}"
        participants.append({field: pid if field == "participant_id" else group if field == "sequence_group" else "" for field in PARTICIPANT_FIELDS})
        for period, (scenario, condition) in enumerate(SEQUENCES[group], 1):
            tasks.append({**dict.fromkeys(TASK_FIELDS, ""), "participant_id": pid, "period": str(period),
                          "scenario_id": scenario, "condition": condition})
    write_csv(directory / "participants.csv", PARTICIPANT_FIELDS, participants)
    write_csv(directory / "tasks.csv", TASK_FIELDS, tasks)
    write_csv(directory / "feedback.csv", FEEDBACK_FIELDS, [{**dict.fromkeys(FEEDBACK_FIELDS, ""), "participant_id": row["participant_id"]} for row in participants])
    write_json(directory / "design.json", {**design, "data_origin": design.get("data_origin", "collected"),
                                          "seed": seed, "planned_participants": 0 if design.get("data_origin") == "synthetic" else count,
                                          "planned_records": count, "sequences": SEQUENCES})
    (directory / "questionnaire.md").write_text((ROOT / "evaluation/SIMPLE_STUDY_QUESTIONNAIRE.md").read_text())
    cards = ["# Participant scenario cards", "", "Show only the allocated card for the current period. Do not show design.json or the answer key.", "",
             "Both tasks use covered own-car bodywork damage, one at-fault accident, an authorised workshop, no young-driver excess, no NCD Protector and no third-party claim. Assume no subsequent accidents.", "",
             "Compare three future years. Use annual base-premium growth of 5% and a 3% discount rate. Self-pay NCD is 50%, 50%, 50%; claim NCD is 20%, 30%, 40%. These assumptions apply equally in both conditions.", "",
             "You may use an ordinary calculator, web search or AI in either condition. Use ClaimWise SG only in the with_app condition. Do not obtain the other scenario or previous answers."]
    for row in design["scenarios"]:
        inputs = row["inputs"]
        cards += ["", f"## Scenario {row['id']}: {row['title']}", "",
                  f"Policy extract: Income; annual premium after NCD S${inputs['currentPremium']}; current NCD 50%; standard excess S$600; no NCD Protector.", "",
                  f"Workshop quotation: S${inputs['repairCost']} for repairing your own vehicle.", "",
                  "Choose claim or self-pay to minimize the stated three-year discounted cost. Rate confidence from 1 to 5 and confirm whether you used ClaimWise SG. Record any other tool category; optional time can be recorded by the facilitator."]
    (directory / "scenario_cards.md").write_text("\n".join(cards) + "\n")
    key = ["# Evaluator answer key", "", "Do not distribute this file or design.json before completion. These are modeled choices, not observed real-world outcomes.", "",
           "For each future year, use gross premium = current premium / (1 - 0.50), apply the specified NCD and 5% annual growth, then discount at 3%. Sum premiums rounded to cents per year; add repair cost for self-pay or S$600 excess for claim."]
    for row in design["scenarios"]:
        answer = row["expected"]
        key += ["", f"- {row['id']}: {answer['decision']}; self-pay total S${answer['selfPayTotal']:.2f}; claim total S${answer['claimTotal']:.2f}; break-even repair cost S${answer['breakEvenRepairCost']:.2f}."]
    (directory / "answer_key.md").write_text("\n".join(key) + "\n")


def save_analysis(source, directory, report, design):
    """Keep response provenance attached to all exported analysis artifacts."""
    report["generated_at"] = utc_now()
    report["source_sha256"] = {name: hashlib.sha256((source / name).read_bytes()).hexdigest()
                               for name in ["participants.csv", "tasks.csv", "feedback.csv", "design.json"]}
    report["design"] = design
    write_json(directory / "report.json", report)
    score_rows = [{"data_origin": report["data_origin"], **row} for row in report["participant_scores"]]
    write_csv(directory / "participant_scores.csv", list(score_rows[0]), score_rows)
    synthetic = report["data_origin"] == "synthetic"
    lines = ["# Synthetic questionnaire demonstration" if synthetic else "# Collected participant scenario-study results", "",
             "Data origin: synthetic. No participants were recruited. Consent, app-use flags and elapsed times are simulated workflow fields." if synthetic else "Data origin: collected participant responses.", "",
             f"Complete record pairs: {report['complete_pairs']}/{report['record_count']}; actual participants: {report['actual_participants']}.", "",
             "| Metric | Paired participants | Without app | With app | Mean paired change |", "| --- | ---: | ---: | ---: | ---: |"]
    def fmt(value):
        return "not recorded" if value is None else f"{value:.2f}"
    for metric, values in report["metrics"].items():
        lines.append(f"| {metric} | {values['paired_n']} | {fmt(values['without_app_mean'])} | {fmt(values['with_app_mean'])} | {fmt(values['mean_paired_change'])} |")
    lines += ["", "Custom feedback (not SUS):", ""]
    lines += [f"- {field}: n={values['n']}, mean={fmt(values['mean_1_to_5'])}/5." for field, values in report["feedback"].items()]
    lines += ["", "Interpretation:", "", *[f"- {item}" for item in report["limitations"]]]
    (directory / "summary.md").write_text("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("prepare")
    create.add_argument("--directory", type=Path, required=True)
    create.add_argument("--participants", type=int, default=12, help="Blank enrollment slots, not completed participants or a power calculation.")
    create.add_argument("--seed", type=int, default=5224)
    run = commands.add_parser("analyze")
    run.add_argument("--directory", type=Path, required=True)
    run.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    if args.command == "prepare":
        design = json.loads((ROOT / "evaluation/simple_study_scenarios.json").read_text())
        prepare(args.directory, args.participants, args.seed, design)
        print(f"Prepared {args.participants} blank slots and two tasks per participant: {args.directory}")
        return 0
    design = json.loads((args.directory / "design.json").read_text())
    report = analyze(read_csv(args.directory / "participants.csv", PARTICIPANT_FIELDS),
                     read_csv(args.directory / "tasks.csv", TASK_FIELDS),
                     read_csv(args.directory / "feedback.csv", FEEDBACK_FIELDS), design)
    synthetic = report["data_origin"] == "synthetic"
    directory = new_run("synthetic-user-study" if synthetic else "simple-user-study", args.output_root)
    save_analysis(args.directory, directory, report, design)
    print(f"Analyzed {report['complete_pairs']} {'synthetic' if synthetic else 'collected'} record pairs: {directory}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError) as error:
        print(f"Study validation failed: {error}", file=sys.stderr)
        raise SystemExit(2)
