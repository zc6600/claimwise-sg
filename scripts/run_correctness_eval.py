#!/usr/bin/env python
"""
ClaimWise SG - Correctness & Boundary Evaluation Script
Corresponds to Section 4.3 (System and User Evaluation: Correctness) of Preliminary.pdf.
Evaluates controlled hand-checked cases against the decision engine API endpoint,
verifies mathematical invariants, and outputs a formatted LaTeX table.
"""

import json
import time
import os
import urllib.request
import urllib.error

ENDPOINT = os.getenv("CLAIMWISE_API_URL", "http://localhost:3000/api/decision")
FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "../tests/fixtures/benchmark_cases.json")
OUTPUT_TEX_PATH = os.path.join(os.path.dirname(__file__), "../evaluation/correctness_results.tex")

def post_decision(payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=5) as response:
        duration_ms = (time.perf_counter() - start) * 1000.0
        res = json.loads(response.read().decode("utf-8"))
        return res.get("decision", {}), duration_ms

def evaluate():
    if not os.path.exists(FIXTURE_PATH):
        print(f"Error: Fixture file {FIXTURE_PATH} not found.")
        return

    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    os.makedirs(os.path.dirname(OUTPUT_TEX_PATH), exist_ok=True)

    print(f"=== ClaimWise SG: Correctness Evaluation ({len(cases)} Hand-Checked Cases) ===")
    results = []
    latencies = []
    all_passed = True

    for case in cases:
        case_id = case["id"]
        desc = case["description"]
        inputs = case["inputs"]
        expected = case.get("expected", {})

        try:
            decision, latency = post_decision(inputs)
            latencies.append(latency)

            # Invariant 1: Recommendation matches expected
            actual_rec = decision.get("recommendation")
            exp_rec = expected.get("recommendedOption")
            rec_ok = (actual_rec == exp_rec) if exp_rec else True

            # Invariant 2: Below excess detection
            actual_below = decision.get("isBelowExcess")
            exp_below = expected.get("isBelowExcess")
            below_ok = (actual_below == exp_below) if exp_below is not None else True

            # Invariant 3: NCD step downs
            actual_claim_ncd = decision.get("claimNcdAfter")
            exp_claim_ncd = expected.get("claimNcdAfter")
            claim_ncd_ok = (actual_claim_ncd == exp_claim_ncd) if exp_claim_ncd is not None else True

            # Mathematical Invariant 4: Monotonicity of Break-Even (R*):
            # If R < R*, Cost(self) <= Cost(claim); If R > R*, Cost(claim) <= Cost(self)
            base_scenario = decision.get("baseScenario", {})
            break_even = base_scenario.get("breakEvenRepairCost", 0)
            self_total = base_scenario.get("selfPayTotal", 0)
            claim_total = base_scenario.get("claimTotal", 0)
            repair_cost = inputs.get("repairCost", 0)

            if repair_cost > break_even:
                mono_ok = claim_total <= self_total
            elif repair_cost < break_even:
                mono_ok = self_total <= claim_total
            else:
                mono_ok = True

            passed = rec_ok and below_ok and claim_ncd_ok and mono_ok
            if not passed:
                all_passed = False

            results.append({
                "id": case_id,
                "desc": desc,
                "passed": passed,
                "latency_ms": latency,
                "rec": actual_rec,
                "breakEven": break_even,
                "claimNcd": actual_claim_ncd,
            })

            status_symbol = "✓ PASS" if passed else "✗ FAIL"
            print(f"[{case_id}] {status_symbol} ({latency:.1f}ms): {desc} -> {actual_rec} (R* = S${break_even:,.0f})")

        except Exception as e:
            all_passed = False
            print(f"[{case_id}] ✗ ERROR: {e}")
            results.append({
                "id": case_id,
                "desc": desc,
                "passed": False,
                "latency_ms": 0,
                "rec": "ERROR",
                "breakEven": 0,
                "claimNcd": 0,
            })

    total = len(results)
    passed_cnt = sum(1 for r in results if r["passed"])
    avg_lat = sum(latencies) / len(latencies) if latencies else 0.0

    print("\n=== Summary ===")
    print(f"Total Cases: {total}")
    print(f"Passed: {passed_cnt}/{total} (100.0%)" if passed_cnt == total else f"Passed: {passed_cnt}/{total}")
    print(f"Average Engine Latency: {avg_lat:.2f} ms")

    # Generate LaTeX table snippet for Section 4.3
    tex_rows = []
    for r in results:
        status_tex = "\\textbf{Pass}" if r["passed"] else "\\textbf{Fail}"
        tex_rows.append(
            f"    {r['id']} & {r['desc'][:40]}... & S\\${r['breakEven']:,.0f} & {r['rec']} & {status_tex} \\\\"
        )

    tex_content = f"""% Auto-generated by scripts/run_correctness_eval.py
% Evaluation Table for Section 4.3 (Correctness: Hand-Checked Cases)
\\begin{{table}}[h]
\\centering
\\small
\\begin{{tabular}}{{lllll}}
\\hline
\\textbf{{Case ID}} & \\textbf{{Scenario Description}} & \\textbf{{Break-Even $R^*$}} & \\textbf{{Recommendation}} & \\textbf{{Status}} \\\\
\\hline
{os.linesep.join(tex_rows)}
\\hline
\\end{{tabular}}
\\caption{{Summary of Correctness and Invariant Checks Across Controlled Boundary Scenarios ($N = {total}$, Pass Rate: {passed_cnt / total * 100:.1f}\\%, Mean Latency: {avg_lat:.2f} ms).}}
\\label{{tab:correctness_results}}
\\end{{table}}
"""

    with open(OUTPUT_TEX_PATH, "w", encoding="utf-8") as f:
        f.write(tex_content)

    print(f"\nLaTeX table written to: {OUTPUT_TEX_PATH}")

if __name__ == "__main__":
    evaluate()
