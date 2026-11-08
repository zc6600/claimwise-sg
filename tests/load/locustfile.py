import random
from locust import HttpUser, task, between

INSURERS = ["income", "msig", "etiqa", "fwd", "other"]
NCD_STEPS = [0, 10, 20, 30, 40, 50]
EXCESS_OPTIONS = [500, 600, 750, 1000, 1500, 2000]
LIABILITY_OPTIONS = ["at_fault", "non_fault", "partial_fault"]

class MotoristUser(HttpUser):
    """
    Simulates a Singapore motorist evaluating own-damage claim vs self-pay.
    Corresponds to Section 4.3 (Performance and Elasticity) of docs/research/Preliminary.pdf.
    """
    wait_time = between(0.05, 0.5)

    @task(8)
    def calculate_decision(self):
        payload = {
            "insurer": random.choice(INSURERS),
            "currentPremium": random.randint(950, 3200),
            "currentNcd": random.choice(NCD_STEPS),
            "excess": random.choice(EXCESS_OPTIONS),
            "repairCost": random.randint(350, 9500),
            "horizonYears": random.choice([3, 5]),
            "baseGrowthRate": random.randint(-5, 15),
            "discountRate": random.choice([2.5, 3.0, 4.0, 5.0]),
            "ncdProtector": random.random() < 0.35,
            "liability": random.choice(LIABILITY_OPTIONS),
            "thirdPartyClaim": random.random() < 0.25,
        }

        with self.client.post(
            "/api/decision",
            json=payload,
            name="POST /api/decision",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    response.success()
                else:
                    response.failure(f"API returned ok=False: {data.get('error')}")
            else:
                response.failure(f"HTTP {response.status_code}: {response.text}")

    @task(2)
    def fetch_benchmarks(self):
        with self.client.get(
            "/api/benchmarks",
            name="GET /api/benchmarks",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(1)
    def visit_calculator(self):
        with self.client.get(
            "/calculator",
            name="GET /calculator",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
