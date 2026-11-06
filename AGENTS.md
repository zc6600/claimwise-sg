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
- The test runner executes Node's native test module (`node:test`) across 26 deterministic actuarial decision engine, storage, and benchmark test cases in `tests/*.test.mjs`.
- All 26 tests must pass with 0 failures (`# pass 26, # fail 0`).
- If UI components or routes were modified, also verify compilation:
  ```bash
  npm run build
  ```

### 3. Safety Guardrails & Protected Files
- **Do not modify `.github/workflows/`** unless explicitly instructed by a human administrator. Modifications to workflow files from automated agents will result in an immediate `BLOCK` verdict by the PR Agent.
- **Do not commit secrets**: Never touch or commit `.env.local` or any private credentials/tokens.
- **Actuarial Logic Integrity**: When editing `src/decision-engine.mjs` or `data/singapore_market_stats.json`, preserve the mathematical rigor and benchmark assertions defined in `tests/decision-engine.test.mjs`.

### 4. Language, Professionalism & Clean Code Standards
- **Strict Separation Between Chat and Codebase**: While conversational chat responses with users can adapt to the user's preferred natural language (e.g., answering in Chinese when addressed in Chinese), all codebase artifacts—including source code, comments, docstrings, tests, configuration files, commit messages, and formal technical documentation—must strictly use clean, professional English.
- **Zero Meta-Language**: Never write conversational meta-commentary, prompt references, or self-referential agent artifacts into code or documentation (e.g., avoid "as requested by user", "fixed issue per conversation", "AI note:", "PR Agent: Verified", or similar prompt artifacts). Code comments must solely describe domain mechanisms, actuarial logic, edge cases, and contractual invariants.
- **No Bilingual Comments**: Avoid mixed bilingual comments (e.g., do not write `// 计算减档 / Calculate drop`). Keep all code comments, docstrings, variable identifiers, and architectural prose in unified, professional English without parallel translations or language clutter.

