# Agent Guidelines for ClaimWise-SG

This document defines guidelines, system rules, and operational boundaries for AI agents (including automated SWE agents, coding assistants, and GitHub bots) operating in the **ClaimWise-SG** repository.

---

## 📌 Primary Reference

All contributors and autonomous agents must adhere to the engineering conventions and PR workflow defined in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

Refer to `CONTRIBUTING.md` for:
- Branching strategy and naming conventions (`feat/*`, `fix/*`, `docs/*`)
- Commit message standards (Conventional Commits)
- Environment setup and secrets hygiene (`.env.example` vs `.env.local`)
- Automated PR review and auto-merge lifecycle

---

## 🤖 Instructions for AI Agents Working on this Codebase

### 1. Branch and Contribution Policy
- **Never push directly to `main`**: All modifications must be made on a separate feature branch and proposed via a Pull Request.
- **Automated PR Review**: Every opened or updated Pull Request will be picked up by our autonomous **PR Agent** (`.github/workflows/pr-agent.yml`). The PR Agent will review the code diff against `main`, resolve minor conflicts, execute validation, and enable auto-merge.

### 2. Validation & Quality Gates
Before declaring any task or PR complete, you **must** verify that the test suite passes cleanly:
```bash
npm test
```
- The test runner executes Node's native test module (`node:test`) across 14 deterministic actuarial decision engine and benchmark test cases in `tests/*.test.mjs`.
- All 14 tests must pass with 0 failures (`# pass 14, # fail 0`).
- If UI components or routes were modified, also verify compilation:
  ```bash
  npm run build
  ```

### 3. Safety Guardrails & Protected Files
- **Do not modify `.github/workflows/`** unless explicitly instructed by a human administrator. Modifications to workflow files from automated agents will result in an immediate `BLOCK` verdict by the PR Agent.
- **Do not commit secrets**: Never touch or commit `.env.local` or any private credentials/tokens.
- **Actuarial Logic Integrity**: When editing `src/decision-engine.mjs` or `data/singapore_market_stats.json`, preserve the mathematical rigor and benchmark assertions defined in `tests/decision-engine.test.mjs`.

