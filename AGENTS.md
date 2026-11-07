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
- The test runner executes Node's native test module (`node:test`) across 64 deterministic actuarial decision engine, storage, security headers, GIA private settlement, trajectory visualizer, PHV commercial actuarial, consecutive claim stress test, offline PWA emergency kit, and benchmark test cases in `tests/*.test.mjs`.
- All 64 tests must pass with 0 failures (`# pass 64, # fail 0`).
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


## 🔄 Continuous Iterative Optimization & Co-Review via Codex (伴随式持续迭代优化与双 Agent 闭环)

在算法研发、代码实现与系统调优过程中，**严禁仅在所有工作结束的最后阶段做一次性提交**。必须建立“**优化 -> Codex 伴随审查 -> 吸收反馈再优化 -> 再审查**”的高频递进迭代循环：

### 1. 迭代循环规范（Iterative Evolution Loop）

每次提出优化方案或重构时，遵循以下五步递进环：
1. **假设与改进实现（Design & Optimize）**：针对性能瓶颈或上一轮失效根因，提出具备数学/逻辑自洽性的优化假设并落实代码。
2. **实现即时伴随审查（Accompanied Code Review）**：代码完成后立即调用 Codex (`gpt-6-luna`) 进行理论自洽性、边界条件、异常分支与潜在副作用审查，防患于未然。
3. **针对性实证验证（Targeted Empirical Verification）**：在真实案例集/基准子集上执行实证评测，获取第一手量化表现与异常追踪。
4. **归因与批判审阅（Diagnosis & Critical Peer-Review）**：将实测数据、反例现象与归因分析提交 Codex 进行批判性审查，识别是否存在机制副作用、解释漏洞或过度宣称。
5. **深度再优化（Actionable Refinement）**：直接依据 Codex 审阅意见与实测反例，优化算法设计（如引入守恒约束、特异性惩罚、平滑机制等），并闭环进入下一轮递进。

### 2. 执行命令规范

在终端通过非交互式 `codex exec` 触发审查（若遇上下文锁冲突去除 `--last` 独立运行）：

```bash
codex exec resume --last -m gpt-6-luna "请检查当前阶段的优化修改：[修改摘要]。请重点审查：算法设计的逻辑自洽性（是否存在副作用/非预期排名漂移）、边界异常处理、潜在设计缺陷，并给出具体的进一步优化建议。"
```

> **说明**：
> - `--last`：继续上一个 session，保留上下文。若因终端已有正在运行的交互式 codex 导致 `thread-store conflict` 锁冲突，则去除 `--last` 直接以独立会话 `codex exec -m gpt-6-luna "..."` 运行。
> - `-m gpt-6-luna`：使用指定的 Luna 模型。
> - 非交互式终端执行使用 `codex exec`（避免 TUI 阻塞）。

### 3. 检查重点清单

每次 Codex 伴随审查重点关注以下维度：
1. **算法与机制合理性**：重排序或图扩散是否破坏原有高置信度排序（如 Kingmaker/篡位风险、主题漂移），数学推导是否自洽。
2. **架构与代码结构**：模块职责划分是否清晰，插拔式接口是否正交、解耦，是否存在过度设计。
3. **边界与异常处理**：如非法输入、空集合、除零风险、通用属性泛滥等。
4. **指标与评估口径**：基准评估计算逻辑（如 Hit@K、Recall@K、MRR）是否严密、无数据泄漏或偏差。
5. **文件与数据安全边界**：严禁未提交工作丢失，工作树用完即 deflate，严格拒绝符号链接逃逸。

### 4. 反馈闭环与持续递进

- 每次审查完成后，必须将 Codex 的具体意见提炼为下一阶段明确的代码修改动作。
- 实施修改后，再次发起检验，直至核心问题收敛解决。

