"""Generate reproducible synthetic questionnaires for analysis demonstrations."""

from collections import Counter
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys

from common import ROOT, new_run, utc_now, write_csv, write_json
from simple_user_study import (PARTICIPANT_FIELDS, TASK_FIELDS, FEEDBACK_FIELDS, SEQUENCES,
                               analyze, prepare, save_analysis, validate_design)

# These coefficients are illustrative simulation assumptions, not fitted human data.
PARAMETERS = {
    "version": 1,
    "driving_band_weights": [0.18, 0.12, 0.27, 0.25, 0.18],
    "knowledge_noise_sd": 1.0,
    "digital_skill_noise_sd": 0.95,
    "latent_person_noise_sd": 0.75,
    "app_log_odds_shift": 0.8,
    "app_difficulty_probability": 0.18,
    "app_difficulty_log_odds_penalty": 1.8,
    "period_two_log_odds_shift": 0.12,
    "scenario_a_log_odds_shift": -0.3,
    "scenario_b_log_odds_shift": 0.35,
    "duration_lognormal_sigma": 0.42,
}
DRIVING_LABELS = {"no_licence": "No driving licence", "under_1": "Under 1 year",
                  "1_to_3": "1–3 years", "4_to_9": "4–9 years", "10_plus": "10 or more years"}
TOOL_LABELS = {"none": "None", "calculator": "Ordinary calculator", "web": "Internet search",
               "ai": "AI assistant", "mixed": "More than one tool category"}


def rating(value):
    return str(max(1, min(5, round(value))))


def probability(log_odds):
    return 1 / (1 + math.exp(-log_odds))


def simulate_records(count, seed, design):
    validate_design(design)
    if not isinstance(count, int) or not 1 <= count <= 2000:
        raise ValueError("Synthetic record count must be between 1 and 2000.")
    rng = random.Random(seed)
    groups = [list(SEQUENCES)[index % 4] for index in range(count)]
    rng.shuffle(groups)
    answers = {row["id"]: row["expected"]["decision"] for row in design["scenarios"]}
    participants, tasks, feedback = [], [], []
    for index, group in enumerate(groups, 1):
        pid = f"SIM-{index:03}"
        driving = rng.choices(list(DRIVING_LABELS), weights=PARAMETERS["driving_band_weights"])[0]
        driving_index = list(DRIVING_LABELS).index(driving)
        knowledge = rating(rng.gauss(1.8 + 0.38 * driving_index, PARAMETERS["knowledge_noise_sd"]))
        search = rating(rng.gauss(3.2, PARAMETERS["digital_skill_noise_sd"]))
        ai = "not_used" if rng.random() < 0.23 else rating(rng.gauss(float(search) - 0.15, 1.05))
        latent = (0.45 * (int(knowledge) - 3) + 0.20 * (int(search) - 3)
                  + rng.gauss(0, PARAMETERS["latent_person_noise_sd"]))
        pace = rng.lognormvariate(0, 0.24)
        app_difficulty = rng.random() < PARAMETERS["app_difficulty_probability"]
        participants.append({"participant_id": pid, "consent": "yes", "sequence_group": group,
                             "driving_experience": driving, "insurance_knowledge": knowledge,
                             "online_search_skill": search, "ai_search_skill": ai})
        assisted_correct = None
        for period, (scenario, condition) in enumerate(SEQUENCES[group], 1):
            assisted = condition == "with_app"
            tool_weights = [0.30, 0.28, 0.24, 0.12 if ai != "not_used" else 0, 0.12]
            if assisted:
                tool_weights = [0.52, 0.17, 0.17, 0.08 if ai != "not_used" else 0, 0.06]
            tools = rng.choices(list(TOOL_LABELS), weights=tool_weights)[0]
            tool_shift = {"none": 0, "calculator": 0.15, "web": 0.30, "ai": 0.25, "mixed": 0.35}[tools]
            log_odds = (-0.05 + latent + tool_shift
                        + PARAMETERS[f"scenario_{scenario.lower()}_log_odds_shift"]
                        + (PARAMETERS["period_two_log_odds_shift"] if period == 2 else 0))
            if assisted:
                log_odds += PARAMETERS["app_log_odds_shift"] + 0.18 * (int(search) - 3)
                if app_difficulty:
                    log_odds -= PARAMETERS["app_difficulty_log_odds_penalty"]
            correct = rng.random() < probability(log_odds)
            expected = answers[scenario]
            choice = expected if correct else ("self-pay" if expected == "claim" else "claim")
            confidence = rating(rng.gauss(3.0 + 0.18 * (int(knowledge) - 3) + 0.25 * assisted
                                         + 0.25 * correct - 0.25 * (assisted and app_difficulty), 0.95))
            tool_seconds = {"none": 0, "calculator": 22, "web": 55, "ai": 45, "mixed": 78}[tools]
            median_seconds = (80 if not assisted else 105 + 10 * (3 - int(search)) + 45 * app_difficulty)
            elapsed = round(max(15, pace * (median_seconds + tool_seconds)
                                * (0.91 if period == 2 else 1)
                                * rng.lognormvariate(0, PARAMETERS["duration_lognormal_sigma"])))
            tasks.append({"participant_id": pid, "period": str(period), "scenario_id": scenario,
                          "condition": condition, "decision": choice, "confidence": confidence,
                          "app_used": "yes" if assisted else "no", "other_tools": tools, "time_seconds": str(elapsed)})
            if assisted:
                assisted_correct = correct
        feedback.append({"participant_id": pid,
                         "ease_of_use": rating(rng.gauss(3.4 + 0.20 * (int(search) - 3) - 0.8 * app_difficulty, 0.9)),
                         "usefulness": rating(rng.gauss(3.1 + 0.4 * assisted_correct - 0.5 * app_difficulty, 1.0))})
    return participants, tasks, feedback


def export_questionnaires(directory, participants, tasks, feedback):
    questionnaire_dir = directory / "questionnaires"
    questionnaire_dir.mkdir()
    by_pid = {row["participant_id"]: [] for row in participants}
    for row in tasks:
        by_pid[row["participant_id"]].append(row)
    closing = {row["participant_id"]: row for row in feedback}
    combined = []
    for person in participants:
        pid = person["participant_id"]
        row = {"data_origin": "synthetic", **person}
        lines = [f"# Synthetic questionnaire response: {pid}", "",
                 "Data origin: synthetic. This is a simulated record; no person was recruited. Agreement, app use and elapsed seconds are simulated fields.", "",
                 f"Assignment: {person['sequence_group']}; simulated agreement field: yes.", "",
                 "## Background", "",
                 f"- Driving-licence duration: {DRIVING_LABELS[person['driving_experience']]}",
                 f"- Car-insurance familiarity: {person['insurance_knowledge']}/5",
                 f"- Internet information-search confidence: {person['online_search_skill']}/5",
                 f"- AI-assisted information-search confidence: {'Have not used such tools' if person['ai_search_skill'] == 'not_used' else person['ai_search_skill'] + '/5'}"]
        for task in sorted(by_pid[pid], key=lambda item: int(item["period"])):
            for field in ["scenario_id", "decision", "confidence", "app_used", "other_tools", "time_seconds"]:
                row[f"{task['condition']}_{field}"] = task[field]
            lines += ["", f"## Period {task['period']}: scenario {task['scenario_id']}, {task['condition'].replace('_', ' ')}", "",
                      f"- Choice: {'Claim insurance' if task['decision'] == 'claim' else 'Self-pay for own-car repair'}",
                      f"- Confidence: {task['confidence']}/5", f"- Simulated app-use answer: {task['app_used']}",
                      f"- Other tools: {TOOL_LABELS[task['other_tools']]}", f"- Simulated elapsed seconds: {task['time_seconds']}"]
        row.update({field: closing[pid][field] for field in FEEDBACK_FIELDS[1:]})
        lines += ["", "## Closing ratings", "", f"- Ease of use: {closing[pid]['ease_of_use']}/5",
                  f"- Usefulness: {closing[pid]['usefulness']}/5", "", "Custom ratings; no SUS score is calculated."]
        (questionnaire_dir / f"{pid}.md").write_text("\n".join(lines) + "\n")
        combined.append(row)
    # Column order is stable even when the assigned first condition differs.
    fields = ["data_origin", *PARTICIPANT_FIELDS]
    for condition in ["without_app", "with_app"]:
        fields += [f"{condition}_{field}" for field in ["scenario_id", "decision", "confidence", "app_used", "other_tools", "time_seconds"]]
    fields += FEEDBACK_FIELDS[1:]
    write_csv(directory / "synthetic_questionnaires.csv", fields, combined)


def generate(count=26, seed=5224, output_root=None):
    design = json.loads((ROOT / "evaluation/simple_study_scenarios.json").read_text())
    design.update(data_origin="synthetic", simulation={"seed": seed, "parameters": PARAMETERS,
                  "actual_participants": 0, "consent": "Simulated workflow field; no human consent was obtained or claimed.",
                  "interpretation": "All profile distributions, correlations and condition effects are assumptions, not estimates from people. One pass; no outcome-targeted rerolling."})
    participants, tasks, feedback = simulate_records(count, seed, design)
    directory = new_run("synthetic-study", output_root).resolve()
    responses = directory / "responses"
    prepare(responses, count, seed, design)
    write_csv(responses / "participants.csv", PARTICIPANT_FIELDS, participants)
    write_csv(responses / "tasks.csv", TASK_FIELDS, tasks)
    write_csv(responses / "feedback.csv", FEEDBACK_FIELDS, feedback)
    frozen = json.loads((responses / "design.json").read_text())
    report = analyze(participants, tasks, feedback, frozen)
    save_analysis(responses, directory, report, frozen)
    export_questionnaires(directory, participants, tasks, feedback)
    manifest = {"data_origin": "synthetic", "actual_participants": 0, "synthetic_records": count,
                "synthetic_task_rows": len(tasks), "generated_at": utc_now(), "seed": seed,
                "parameters": PARAMETERS, "sequence_groups": dict(Counter(row["sequence_group"] for row in participants)),
                "source_sha256": {name: hashlib.sha256((ROOT / "evaluation" / name).read_bytes()).hexdigest()
                                  for name in ["simulate_user_study.py", "simple_user_study.py", "simple_study_scenarios.json"]}}
    write_json(directory / "simulation.json", manifest)
    (directory / "README.md").write_text("\n".join([
        "# Synthetic questionnaire demonstration", "", "Data origin: synthetic. Actual participants: 0.", "",
        f"This directory contains {count} reproducibly simulated questionnaires and {len(tasks)} synthetic task records. No people were contacted, no browser sessions were observed and no times were measured.", "",
        "The numerical and categorical answers vary through a seeded stochastic model. The model permits incorrect answers, low confidence, navigation difficulty and either direction of paired change. Its positive average app-effect parameter is an illustrative assumption, not evidence that the app helps people. No particular improvement percentage is enforced.", "",
        "## Files", "", "- synthetic_questionnaires.csv: one filled questionnaire per row, with an explicit synthetic origin field.",
        "- questionnaires/: 26 individual filled response sheets by default, each labeled synthetic.",
        "- responses/: normalized CSVs, frozen design and original question/scenario wording; SIM- identifiers distinguish simulated records.",
        "- summary.md and report.json: descriptive analysis of simulated responses, with actual participant count zero.",
        "- participant_scores.csv: per-record scores, preserving the synthetic origin.",
        "- simulation.json: random seed, unvalidated model parameters and source hashes.", "",
        "## Reproduction", "", "```bash", "source evaluation/activate.sh",
        f"python evaluation/simulate_user_study.py --records {count} --seed {seed}", "```", "",
        "Changing the seed changes the simulated sample. Do not select a seed to achieve a desired study conclusion. Use this material to demonstrate questionnaires, check data handling or plan collection. It does not replace participant recruitment or empirical evaluation.", ""]))
    return directory, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--records", type=int, default=26)
    parser.add_argument("--seed", type=int, default=5224)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    directory, report = generate(args.records, args.seed, args.output_root)
    print(f"Generated {report['complete_pairs']} synthetic record pairs; actual participants: 0; {directory}")
    print(json.dumps({"data_origin": "synthetic", "metrics": report["metrics"],
                      "feedback": report["feedback"], "decision_transitions": report["decision_transitions"]}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError) as error:
        print(f"Simulation failed: {error}", file=sys.stderr)
        raise SystemExit(2)
