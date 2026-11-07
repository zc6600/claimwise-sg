# Simplified Participant Scenario Study

## Objective and scope

Compare modeled claim/self-pay choices with and without ClaimWise SG using one short questionnaire and two tasks per participant. Recruit willing adult participants, including classmates or friends. A driving licence, vehicle ownership, prior insurance knowledge or a recent accident is not required. Record the actual recruitment source and licence/knowledge mix; a convenience sample does not establish effectiveness for all motorists.

This is a participant scenario study with synthetic supplied information. It does not observe real accidents, real renewal premiums, information retrieval from personal insurance documents or realized savings. Until people actually participate, only a design and blank forms exist. Script-generated test records are never participant evidence.

## Questionnaire and collection

Use [the brief questionnaire](SIMPLE_STUDY_QUESTIONNAIRE.md). Obtain agreement before recording observations. Collect an anonymous ID, four optional background answers, a choice and confidence for each task, actual app use, and two optional closing ratings. Do not collect names, contacts, age, income, claim histories, vehicle plates or personal policy records.

Background measures are licence-duration bands, self-rated car-insurance familiarity, internet information-search confidence and AI-assisted information-search confidence. They describe participants and support exploratory summaries. They do not establish actual ability or causal effects of background characteristics. Participants can skip background items or report no AI experience.

There is one questionnaire, not one full survey for each condition. The required task responses are a final claim/self-pay choice, confidence from 1 to 5, and confirmation of whether the app was used. External-tool category and measured elapsed time are optional. The two closing ratings are custom ease/usefulness questions; the simplified protocol does not collect or report SUS.

## Two scenarios and two conditions

Both scenarios involve one ordinary at-fault own-car bodywork incident, an authorised workshop, no NCD Protector, no third-party claim and no additional driver excess. The scenarios require the same types of input and comparison. Their repair quotations and premiums differ; their difficulty has not been established empirically. Pilot the wording and revise/freeze the design before collecting the main study.

| Scenario | Annual premium after NCD | Current NCD | Standard excess | Own-car repair quotation |
| --- | ---: | ---: | ---: | ---: |
| A | S$1,400 | 50% | S$600 | S$1,900 |
| B | S$1,500 | 50% | S$600 | S$2,900 |

Both conditions receive the same neutral definitions and model assumptions: a three-year horizon, 5% annual base-premium growth, 3% discount rate, self-pay renewal NCD of 50/50/50 and claim renewal NCD of 20/30/40. No later accidents occur. Decisions are judged against independently frozen cost calculations under these assumptions, not the participant's actual choice or the displayed recommendation alone. Sources and real-world validity of the underlying insurance rules are evaluated separately.

Without-app participants may use their ordinary calculator, internet search or AI, but cannot consult ClaimWise SG. The same external tools are allowed in the with-app condition. With-app participants must actually open the calculator, fill the assigned values and review its output. Record actual use; a condition/use mismatch must be resolved before including the pair. No login or saving is required. This evaluates additional assistance relative to ordinary tools, rather than app use versus unaided reasoning.

The facilitator shows only one card at a time and supplies no correctness feedback between tasks. Supply the same short navigation introduction immediately before the with-app task in either order. Do not announce that the two answer keys differ. Do not coach participants toward a choice.

## Assignment and order

Every participant completes exactly two different tasks: one without the app and one with it. Four sequences balance scenario and condition order without asking any individual to do extra tasks:

| Assignment | Period 1 | Period 2 |
| --- | --- | --- |
| G1 | A without app | B with app |
| G2 | A with app | B without app |
| G3 | B without app | A with app |
| G4 | B with app | A without app |

`simple_user_study.py prepare` shuffles assignments with a recorded seed. Planned group sizes differ by at most one; report the balance of actual completed records because nonresponse can change it. Counts divisible by four give complete planned balance. The four groups are administrative assignments, not four questionnaires or four tasks.

Order balancing addresses systematic assignment differences; it does not remove learning or carryover. Each person answers only one task per condition, so a person's paired change can also reflect scenario difficulty. Report scenario-specific and order-specific counts alongside the aggregate comparison. General guidance on nuisance factors and randomization is available in the [NIST experimental-design handbook](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm).

## Preparation and analysis

```bash
source evaluation/activate.sh
python evaluation/simple_user_study.py prepare --directory evaluation/private/simple-study-001 --participants 12
```

The count creates blank enrollment slots. Twelve is an editable preparation default, not an achieved sample size, minimum sample size or statistical power calculation. Use only the number of people actually available and willing to participate.

Preparation creates participants.csv, tasks.csv, feedback.csv, questionnaire.md, scenario_cards.md, answer_key.md and design.json. The last two contain evaluator answers and must not be shared before completion. Preserve the generated assignment/period columns. Do not copy responses into all blank rows.

- participants.csv: participant_id; consent (yes/no/pending blank); sequence_group (G1–G4); optional driving_experience (no_licence/under_1/1_to_3/4_to_9/10_plus), insurance_knowledge (1–5), online_search_skill (1–5), ai_search_skill (1–5/not_used).
- tasks.csv: participant_id; period (1/2); assigned scenario_id and condition; actual decision (claim/self-pay); confidence (1–5); app_used (yes/no); optional other_tools (none/calculator/web/ai/mixed) and time_seconds (positive measured duration).
- feedback.csv: participant_id; optional ease_of_use and usefulness, each 1–5.

Background answers and feedback can be blank. A consented participant needs both complete task responses. Unknown IDs, duplicates, mismatched assignments, app-use violations, invalid ratings, nonfinite times and incomplete consented pairs are rejected. Declined/withdrawn entries use no and have their answer cells cleared; retain aggregate exclusion reasons separately. Never silently discard an inconvenient choice or a slow response.

```bash
python evaluation/simple_user_study.py analyze --directory evaluation/private/simple-study-001
```

Only collected, consented pairs produce results. Blank templates return a validation error. The analyzer reports actual completion/sequence counts; without/with-app correctness under the supplied model; confidence; paired changes; scenario and order breakdowns; exploratory background summaries; external-tool use; and custom feedback. Optional duration comparisons include only people with both measured durations, with the paired count stated. No time is imputed. Missing feedback has an explicit zero count and no mean.

Results are descriptive. There is no automatic statistical-significance claim, validated ability score or population-level treatment estimate. Background subgroup differences may reflect scenario, tool use or sampling differences. With just two choices per person, report the counts as well as percentages. Do not infer that a high-confidence or app-following choice is independently correct.

Keep records and row-level scores under ignored private/results directories. Share only reviewed aggregate findings.

## Synthetic demonstrations

`simulate_user_study.py --records 26 --seed 5224` creates explicitly synthetic response sheets and reports in a separate results directory. The stochastic assumptions are documented in simulation.json; they are not estimated from participants. All agreement flags, app-use answers and durations are simulated. Actual participant and consented-participant counts remain zero. These outputs demonstrate the analysis pipeline and do not replace collected responses. The SIM- identifier prefix is reserved for such records and must not be used for recruited participants.
