# ClaimWise-SG Contribution & Collaboration Guide

This guide defines the engineering conventions, branch lifecycle, and automated review pipeline for **ClaimWise-SG**. It is designed for both human developers and autonomous AI coding agents collaborating on this codebase.

---

## 1. Core Workflow: Protected Main & Automated PR Agent

To ensure code stability and rapid iteration, direct pushes to `main` are strictly prohibited. We follow a **Protected Main Branch + Feature Branch + Automated PR Agent** workflow:

```text
main (Protected, production-ready, always deployable)
  ▲
  │ (Pull Request -> Automated PR Agent Review -> Quality Gates -> Auto-Merge)
feat/xxx or fix/xxx (Isolated working branch)
```

- **`main` is production-ready**: Every commit on `main` must compile, build, and pass all actuarial regression tests.
- **Short-lived feature branches**: Create a dedicated branch for every feature, bug fix, or documentation update.
- **Automated AI Review & Auto-Merge**: Every Pull Request automatically triggers our built-in **PR Agent**, eliminating manual merge bottlenecks for safe, validated changes.

---

## 2. Automated PR Review & Auto-Merge Pipeline

When you open or synchronize a Pull Request against `main`, the CI workflow (`.github/workflows/pr-agent.yml`) invokes the autonomous **PR Agent** (`deepseek/deepseek-v4.1-flash`):

1. **Automated Diff Review & Conflict Resolution**:
   - The Agent fetches the target `main` branch and inspects the merge tree.
   - It performs an automated code review on all modified files, checking logic correctness, edge cases, and consistency.
   - It safely resolves trivial merge conflicts if the incoming branch has diverged from `main`.
2. **Security & Guardrail Checks**:
   - Ensures no protected `.github/` workflow files or secret tokens have been tampered with.
   - Verifies that no build artifacts, bytecode, or cache directories are committed.
   - Decides whether the change is safe: issues a `PASS` or `BLOCK` verdict.
3. **Deterministic Quality Gate**:
   - Executes the validation command: `npm test`.
   - All 14 Singapore motor insurance benchmark and decision-engine test suites must pass 100% in ~150ms.
4. **Automated GitHub Squash & Merge**:
   - If the review returns `PASS` and all tests succeed, the Agent automatically enables GitHub Auto-Merge (`gh pr merge --auto --squash`), merging the branch cleanly into `main` and archiving the feature branch.

---

## 3. Getting Started & Local Environment

Follow these steps when setting up the repository locally:

```bash
# 1. Clone the repository
git clone git@github.com:zc6600/claimwise-sg.git
cd claimwise-sg

# 2. Install dependencies
npm install

# 3. Configure local environment variables (DO NOT commit .env.local)
cp .env.example .env.local
# Obtain required development credentials from team leads and fill .env.local

# 4. Verify local application
npm run dev
# Open http://localhost:3000
```

---

## 4. Development Cycle

### Step 1: Branch from Latest `main`
```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```
**Branch naming conventions**:
- Features: `feat/decision-engine`, `feat/young-driver-rules`
- Bug fixes: `fix/excess-calculation`, `fix/route-handler-error`
- Refactoring: `refactor/clause-preview`
- Documentation: `docs/update-guide`

### Step 2: Local Verification
Always run test assertions locally before committing:
```bash
# Run unit & benchmark regression tests
npm test

# Verify Next.js build compilation
npm run build
```

### Step 3: Semantic Commits (Conventional Commits)
Write clear, atomic commit messages following the standard format:
```bash
git add <files>
git commit -m "<type>: <concise description>"
```
Examples:
- `feat: add young driver mandatory excess surcharge`
- `fix: resolve NCD protector retention edge-case`
- `test: add assertions for Etiqa unauthorized workshop penalty`

### Step 4: Rebase onto `main` (Prevent Branch Drift)
```bash
git fetch origin main
git rebase origin/main
```

### Step 5: Push Branch and Open a Pull Request
```bash
git push -u origin feat/xxx

# Create a PR via GitHub CLI
gh pr create --title "feat: brief summary" --body "Detailed rationale and scope of changes."
```
Once opened, watch the **PR Agent** automatically review and merge your PR.

---

## 5. Security & Collaboration Policies

- **Strict Secret Protection**: Never commit `.env*`, Google Cloud Service Account JSONs, or private API keys. `.env.local` is intentionally ignored by `.gitignore`.
- **Environment Schema Updates**: If introducing a new configuration variable, update and commit `.env.example` with placeholder documentation.
- **Dependency Management**: Install dependencies using `npm install <package> --save` and always commit the updated `package-lock.json` to prevent dependency drift.
- **Handling Merge Conflicts**:
  ```bash
  git checkout feat/xxx
  git fetch origin
  git merge origin/main
  # Resolve conflict markers in your IDE
  git add .
  git commit -m "merge: resolve conflicts with main"
  git push origin feat/xxx
  ```
