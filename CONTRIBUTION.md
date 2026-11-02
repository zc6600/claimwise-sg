# ClaimWise-SG Collaboration & Contribution Guide / 协作开发指南

> [English](#english) | [中文说明](#中文说明)

---

<a id="english"></a>
## English

This guide is designed for small, agile engineering teams (2–5 contributors) working on **ClaimWise-SG**. It establishes a low-friction, high-quality development workflow with branch protection and AI-powered automated PR validation.

### 1. Collaboration Workflow Overview

We enforce a **Protected Main Branch + Feature Branch + Automated PR Agent** workflow:

```text
main (Protected, production-ready, deployable)
  ▲
  │ (Pull Request -> Tests Pass -> PR Agent Review -> Squash & Merge)
feat/xxx or fix/xxx (Personal working branch)
```

- **`main` is sacred**: Never push directly to `main`. Every commit on `main` must pass tests and build.
- **Short-lived feature branches**: Create a focused branch for every bugfix, feature, or document update.
- **Automated PR Agent**: All PRs trigger `PR Agent` (`deepseek/deepseek-v4.1-flash`), which checks for conflicts, validates tests, and enables auto-merge.

---

### 2. Getting Started & Local Setup

For any newly onboarded collaborator:

```bash
# 1. Clone the private repository
git clone git@github.com:zc6600/claimwise-sg.git
cd claimwise-sg

# 2. Install dependencies
npm install

# 3. Configure local environment (DO NOT commit .env.local)
cp .env.example .env.local
# Request real credentials (Google Client ID, Firebase config) from team leads

# 4. Verify local application
npm run dev
# Open http://localhost:3000 in your browser
```

---

### 3. Step-by-Step Contribution Cycle

#### Step 1: Sync `main` & Create a Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```
**Branch naming conventions**:
- Features: `feat/decision-engine`, `feat/user-auth`
- Bug fixes: `fix/excess-calculation`, `fix/route-handler-error`
- Refactoring: `refactor/api-routes`
- Documentation: `docs/update-contribution`

#### Step 2: Local Development & Quality Gates
Make changes on your branch. Before committing, run verification locally:
```bash
# Run unit & benchmark regression tests
npm test

# Verify production build compilation
npm run build
```

#### Step 3: Semantic Commit Messages
Keep commits atomic and follow [Conventional Commits](https://www.conventionalcommits.org/):
```bash
git add <files>
git commit -m "<type>: <concise description>"
```
Examples:
- `feat: add young driver excess surcharge calculation`
- `fix: correct ncd discount step-down formula`
- `test: add benchmark assertions for Etiqa policies`

#### Step 4: Rebase onto Latest `main` (Avoid Drift)
```bash
git fetch origin main
git rebase origin/main
```

#### Step 5: Push and Open a Pull Request
```bash
# Push branch to remote
git push -u origin feat/xxx

# Create a PR via GitHub CLI
gh pr create --title "feat: descriptive PR title" --body "Summary of changes and motivation."
```

---

### 4. Automated Review & Merge (PR Agent)

Once a PR is opened or synchronized:
1. **Automated Pipeline**: `.github/workflows/pr-agent.yml` automatically executes.
2. **AI Arbiter**: DeepSeek Agent inspects git diffs, verifies merge tree, and ensures no accidental alterations to `.github` or sensitive files.
3. **Automated Validation**: Runs `npm test` across all 14 benchmark actuarial suites.
4. **Auto-Merge**: When tests pass and changes are clean, the PR Agent automatically triggers GitHub Squash & Merge.

---

### 5. Critical Team Guardrails

1. **Zero Secret Leakage**:
   - Never commit `.env*`, Service Account JSONs, or private API keys.
   - If an API key is accidentally staged, run `git reset HEAD <file>` immediately. If pushed, revoke and rotate the secret at once.
2. **Environment Variable Additions**:
   - When adding new environment variables, **only modify and commit `.env.example`** with placeholder values, and notify teammates to update their local `.env.local`.
3. **Resolving Merge Conflicts**:
   ```bash
   git checkout feat/xxx
   git fetch origin
   git merge origin/main
   # Resolve conflict markers in VSCode / IDE
   git add .
   git commit -m "merge: resolve conflicts with main"
   git push origin feat/xxx
   ```

---
---

<a id="中文说明"></a>
## 中文说明

本文档适用于 **ClaimWise-SG** 项目的 2~5 人敏捷研发团队，旨在建立低沟通成本、高代码质量且不易踩坑的协作机制。

### 一、 核心协作模型：Feature Branch 工作流

在少人团队中，**切忌直接向 `main` 分支 push 代码**。统一采用“**主干保护 + 特性分支 + PR 自动化流**”流程：

```text
main (生产/可部署分支，受保护)
  ▲
  │ (PR 触发 -> 测试通过 -> PR Agent 审阅 -> 自动 Squash & Merge)
feat/xxx 或 fix/xxx (个人工作分支)
```

1. **`main` 分支保持随时可部署**：主分支上的代码必须始终通过构建与测试。
2. **所有修改基于独立分支**：任何功能、Bug 修复或文档修改，均从最新的 `main` 切出新分支。
3. **PR Agent 自动化审查与合流**：每个 PR 均由集成的 `PR Agent` 自动拉取目标分支、校验冲突、执行全套测试并执行自动合并。

---

### 二、 首次加入项目与本地环境初始化

新成员进入项目后的标准动作：

```bash
# 1. 克隆私有仓库
git clone git@github.com:zc6600/claimwise-sg.git
cd claimwise-sg

# 2. 安装依赖
npm install

# 3. 配置本地环境变量 (切勿提交 .env.local 到 git)
cp .env.example .env.local
# 向团队负责同学获取真实的 key 并填入 .env.local

# 4. 验证本地运行
npm run dev
# 浏览器打开 http://localhost:3000
```

---

### 三、 日常开发与修改仓库的标准步骤

#### Step 1: 保持主分支最新，切出新分支
在开始任何新任务前：
```bash
git checkout main
git pull origin main
git checkout -b <分支类型>/<简短描述>
```
**分支命名规范**：
- 新功能：`feat/decision-engine`、`feat/user-auth`
- 缺陷修复：`fix/cors-issue`、`fix/rule-parser-error`
- 重构优化：`refactor/api-routes`
- 文档修改：`docs/update-readme`

#### Step 2: 本地编码与测试自测
在自己的分支上编码，并在提交前确保：
```bash
# 运行单元测试与精算用例（14 项全部通过）
npm test

# 确保 Next.js 构建打包不报错
npm run build
```

#### Step 3: 规范提交（Git Commit）
保持提交颗粒度小而清晰，采用语义化提交规范（Conventional Commits）：
```bash
git add <修改的文件>
git commit -m "<type>: <简明扼要的修改描述>"
```
- `feat:` 新增功能
- `fix:` 修复 bug
- `refactor:` 重构代码（不改变业务逻辑）
- `style:` 代码格式、排版调整
- `docs:` 文档变更
- `test:` 增加或修改测试用例

*示例：`git commit -m "feat: add rule validation for dental claims"`*

#### Step 4: 同步远端最新进度（防冲突）
在提交 PR 之前，建议先拉取一次远端 `main` 分支的最新更新进行变基（Rebase）：
```bash
git fetch origin main
git rebase origin/main
```

#### Step 5: 推送分支并创建 PR
```bash
# 推送分支至远端
git push -u origin feat/xxx

# 使用 GitHub CLI 快速发起 PR（也可以在 GitHub 网页上点 Compare & pull request）
gh pr create --title "feat: 新增牙科理赔规则解析" --body "关联 Issue/需求描述：增加了对牙科门诊上限的校验规则。"
```

---

### 四、 PR Agent 自动化审查与合并机制

当创建或更新 PR 后：
1. **GitHub Actions 触发**：`.github/workflows/pr-agent.yml` 自动运行。
2. **AI 智能仲裁**：DeepSeek Agent 会自动检查是否有文件冲突、分析改动合理性并确认未改动 `.github` 等受限文件。
3. **红线命令执行**：自动运行 `npm test` 验证 14 项新加坡车险决策基准测试。
4. **全自动合流**：测试通过后，Agent 自动调用 GitHub CLI 启用 Auto-Merge，以 **Squash & Merge** 方式优雅合入主干。

---

### 五、 团队协作避坑与常见问题

1. **绝对严禁提交敏感文件**：
   - `.env.local`、GCP Service Account JSON、Firebase 私钥绝对不可提交。
   - 若引入了**新的环境变量**：**只修改并在 PR 中提交 `.env.example`**，并在群内通知其他成员更新本地 `.env.local`。
2. **依赖管理**：
   - 新增依赖时统一使用 `npm install <package> --save`，并确保 `package-lock.json` 一并提交。
3. **多人修改同一文件产生冲突时的处理**：
   ```bash
   git checkout feat/xxx
   git fetch origin
   git merge origin/main
   # 在 VSCode 中解决冲突标记后保存
   git add .
   git commit -m "merge: resolve conflicts with main"
   git push origin feat/xxx
   ```
