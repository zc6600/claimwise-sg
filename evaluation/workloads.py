"""Synthetic calculator inputs and HTTP response contracts for load experiments."""

import math

ENDPOINTS = {"page": ["/calculator"], "decision": ["/api/decision"],
             "journey": ["/calculator", "/api/decision"]}


def decision_inputs(rng):
    return {"insurer": rng.choice(["income", "msig", "etiqa", "fwd", "other"]),
            "currentPremium": rng.randint(950, 3200), "currentNcd": rng.choice([0, 10, 20, 30, 40, 50]),
            "excess": rng.choice([500, 600, 750, 1000]), "repairCost": rng.randint(350, 9500),
            "horizonYears": rng.choice([3, 5]), "baseGrowthRate": 5, "discountRate": 3,
            "ncdProtector": rng.random() < 0.3, "liability": rng.choice(["at_fault", "non_fault", "partial_fault"]),
            "thirdPartyClaim": rng.random() < 0.25, "workshopType": rng.choice(["authorized", "independent"]),
            "youngDriverInvolved": rng.random() < 0.2, "repairType": rng.choice(["general", "windscreen"])}


def response_error(response, endpoint):
    """Return a failure reason; HTTP 200 alone does not establish success."""
    if response.status_code != 200:
        return f"Expected HTTP 200, received {response.status_code}"
    if endpoint == "/calculator":
        content = response.text.lower()
        if "text/html" not in response.headers.get("content-type", "").lower() or "<html" not in content or "claimwise" not in content:
            return "Calculator HTML contract failed"
        return None
    try:
        data = response.json()
        decision = data["decision"]
        totals = decision["baseScenario"]
        if data.get("ok") is not True or data["meta"].get("persisted") is not False:
            return "Decision success or non-persistence contract failed"
        if decision["recommendation"] not in {"claim", "self-pay"}:
            return "Invalid decision recommendation"
        if any(isinstance(totals[key], bool) or not isinstance(totals[key], (int, float)) or not math.isfinite(totals[key])
               for key in ["claimTotal", "selfPayTotal"]):
            return "Invalid decision costs"
    except (ValueError, KeyError, TypeError, AttributeError):
        return "Malformed decision JSON"
    return None
