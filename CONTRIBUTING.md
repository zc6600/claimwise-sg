# ClaimWise-SG 协作开发指南（小团队轻量协作规范）

本文档适用于 2~5 人的敏捷研发小组，旨在建立低沟通成本、高代码质量且不易踩坑的协作机制。

---

## 一、 核心协作模型：Feature Branch 工作流

在少人团队中，**切忌所有人直接向 `main` 分支 push 代码**。采用“**主干保护 + 特性分支 + PR 评审**”的轻量化流程：

```text
main (生产/可部署分支，受保护)
  ▲
  │ (PR + Code Review 合并)
feat/xxx 或 fix/xxx (个人工作分支)
```

1. **`main` 分支保持随时可部署**：主分支上的代码必须始终通过构建与测试。
2. **所有修改基于独立分支**：任何功能、Bug 修复或文档修改，均从最新的 `main` 切出新分支。
3. **通过 Pull Request (PR) 合并**：每个 PR 至少由另一位成员做轻量 Review 后再合并。

---

## 二、 首次加入项目与本地环境初始化

新成员进入项目后的标准动作：

```bash
# 1. 克隆私有仓库
git clone https://github.com/zc6600/claimwise-sg.git
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

## 三、 日常开发与修改仓库的标准步骤

### Step 1: 保持主分支最新，切出新分支
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

### Step 2: 本地编码与测试
在自己的分支上编码，并在提交前确保：
```bash
# 运行单元测试 / 规则评估
npm run test  # 或对应的测试脚本
npm run build # 确保 build 不报错
```

### Step 3: 规范提交（Git Commit）
尽量保持提交颗粒度小而清晰，采用语义化提交规范（Conventional Commits）：
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

### Step 4: 同步远端最新进度（防冲突）
在提交 PR 之前，建议先拉取一次远端 `main` 分支的最新更新进行变基（Rebase）：
```bash
git fetch origin main
git rebase origin/main
# 如果遇到冲突，手动解决后执行：
# git add <解决冲突的文件>
# git rebase --continue
```

### Step 5: 推送分支并创建 PR
```bash
# 推送分支至远端
git push -u origin feat/xxx

# 使用 GitHub CLI 快速发起 PR（也可以在 GitHub 网页上点 Compare & pull request）
gh pr create --title "feat: 新增牙科理赔规则解析" --body "关联 Issue/需求描述：增加了对牙科门诊上限的校验规则。"
```

---

## 四、 代码审查与合并（Code Review）

在小团队中，PR 审查原则是**“快速、聚焦、建设性”**：

1. **PR 规模控制**：单次 PR 修改建议控制在 200 行以内，避免巨型 PR 导致他人无法 Review。
2. **Reviewer 检查清单**：
   - 是否包含敏感凭证（API Key、私钥、密码绝对不能进入代码库）？
   - 是否破坏了现有功能？
   - 是否有控制台遗留的临时 `console.log`？
3. **合并策略**：
   - 推荐使用 **Squash and merge**（将分支的多条提交压缩为一条干净的主分支提交），保持 `main` 分支的历史提交记录清爽。
   - 合并完成后，及时勾选 **Delete branch** 清理远端临时分支。

---

## 五、 团队协作避坑与常见问题

### 1. 绝对严禁提交敏感文件
- `.env.local`、GCP Service Account JSON、Firebase 私钥绝对不可提交。
- 如果不慎 `git add` 了敏感文件，但在 commit 之前：立即 `git reset HEAD <file>`。
- 若已 push 到远端：必须第一时间撤回并轮换（Rotate）泄露的 API Key。

### 2. 依赖管理
- 新增依赖时统一使用 `npm install <package> --save`，并确保 `package-lock.json` 一并提交，保证团队所有人的依赖版本一致。

### 3. 多人修改同一文件产生冲突时的处理
```bash
# 在 feature 分支上解决冲突：
git checkout feat/xxx
git pull origin main
# 此时 VSCode / 编辑器会高亮冲突区域，与相关成员沟通后保留正确代码
git add .
git commit -m "merge: resolve conflicts with main"
git push origin feat/xxx
```
