# Apple Design Skill

[![CI](https://github.com/yqstar/apple-design-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/yqstar/apple-design-skill/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/apple-design-skill)](https://www.npmjs.com/package/apple-design-skill)

一个可用于 **Codex、Claude Code、Cursor 和 Agent Skills 兼容工具**的 Apple 风格界面设计技能。重点覆盖完整下拉菜单、视觉一致性、键盘与焦点行为，以及按需启用的多 Agent 协作。

这是基于 Apple 设计资料的 Web 实践指南，**不是 Apple 官方规范或官方产品**。技能提供工作指引，不包含模型服务、Agent 运行时或付费 API。

## 安装

需要 Node.js 22 或更新版本。npm 安装包时不会自动写入 Agent 配置；下面的 `install` 命令才会安装技能。

```sh
# 当前项目：同时安装给 Codex、Claude Code 和 Cursor
npx apple-design-skill@latest install --all

# 固定版本，适合团队复现
npx apple-design-skill@0.0.1 install --all --project .

# 只安装给指定工具，可使用逗号或重复 --agent
npx apple-design-skill@0.0.1 install --agent codex,claude

# 用户级安装
npx apple-design-skill@0.0.1 install --agent cursor --global

# 不指定工具：安装到通用 .agents/skills
npx apple-design-skill@0.0.1 install

# 提前查看目标路径，不写入文件
npx apple-design-skill@0.0.1 install --all --dry-run
```

| 目标 | 项目级目录 | 用户级目录 |
| --- | --- | --- |
| `codex` / `universal` | `.agents/skills/apple-design-skill` | `~/.agents/skills/apple-design-skill` |
| `claude` | `.claude/skills/apple-design-skill` | `~/.claude/skills/apple-design-skill` |
| `cursor` | `.cursor/skills/apple-design-skill` | `~/.cursor/skills/apple-design-skill` |

路径遵循 [Codex 本地技能发现](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)、[Claude Code Skills](https://code.claude.com/docs/en/skills) 和 [Cursor Skills](https://prod.cursor.com/docs/skills) 文档。Cursor 还可能发现 `.agents`、`.claude` 等兼容目录；同时使用多个工具时，`--all` 的复制安装可能在某些工具内显示同名入口。只使用 Codex 与 Cursor 时，单独安装 `--agent universal` 可避免重复副本。

已有 `~/.codex/skills/apple-design-skill` 等旧目录不会被静默迁移或删除。新目录与旧目录可能同时被发现，请在确认新版本可用后自行整理旧副本。

## 升级、回退和多版本并存

`npx 包名@版本` 决定安装器携带的技能版本。安装后，该版本的完整快照保存在当前作用域的 `.apple-design-skill/versions/<版本>`，位于 Agent 自动发现目录之外；实际使用的是复制到 Agent 目录的活动版本。

```sh
# 升级到最新稳定版本；干净的受管理副本可直接更新
npx apple-design-skill@latest install --all

# 安装候选版（不影响 latest 指向）
npx apple-design-skill@next install --name apple-design-preview

# 查看当前作用域缓存的版本与所选工具的活动版本
npx apple-design-skill@latest list --all

# 切换回已安装过的版本；use 不下载技能内容
npx apple-design-skill@latest use 0.0.1 --all

# 尚未缓存的旧版本，直接从 npm 按精确版本安装
npx apple-design-skill@1.0.0-rc.1 install --all

# 两个版本同时保留，使用不同的技能名称
npx apple-design-skill@1.0.0-rc.1 install --name apple-design-preview --agent codex
npx apple-design-skill@0.0.1 install --name apple-design-stable --agent codex
```

并存安装会同时修改 `SKILL.md` 中的 `name` 和 Codex 元数据里的调用名称。因此可以明确调用 `$apple-design-preview` 或 `$apple-design-stable`，不会让两个版本共享同一个技能名称。自动选择时仍有可能同时匹配相似描述，做版本对照时请显式指定要使用的名称。

`use` 本身可以离线使用；`npx @latest` 仍可能访问 npm 解析安装器。需要完全离线时，先将安装器固定在本地依赖中，或通过已安装的 CLI 执行：

```sh
npm install --save-dev --save-exact apple-design-skill@0.0.1
./node_modules/.bin/apple-design-skill use 0.0.1 --all
```

Windows 可运行 `node node_modules/apple-design-skill/bin/apple-design-skill.mjs use 0.0.1 --all`。

### 保护本地修改

- 已存在的非本包目录或有本地修改的安装，默认拒绝覆盖。
- 使用 `--force` 时，原文件先移动到 `.apple-design-skill/backups/`，CLI 会输出路径。
- 同一版本不允许出现不同技能内容；发布内容变化必须使用新版本号。
- 多目标安装先整体检查，再切换目录；切换失败时恢复之前的活动副本。
- 进程被强制终止可能留下锁或事务目录。检查是否仍有安装器运行，再处理 `.apple-design-skill/lock`；保留事务目录中的 `old-*` 恢复文件。
- 安装器拒绝目标路径和缓存中的符号链接，不通过 `--force` 绕过。

```sh
npx apple-design-skill@0.0.1 install --all --force
npx apple-design-skill@0.0.1 uninstall --all
```

卸载仅处理本安装器管理的活动副本，保留版本快照和备份。`--project` / `--global`、`--agent`、`--name` 都要与目标安装对应。若要把团队技能提交到 Git，可提交对应工具的技能目录，并忽略项目中的 `.apple-design-skill/` 历史缓存。

## 使用技能

Codex 可显式调用 `$apple-design-skill`；Claude Code 可调用 `/apple-design-skill`；其他工具使用各自的技能入口。未立即发现时，开启一个新的 Agent 会话。

```text
使用 apple-design-skill 实现这个页面。
保留现有产品需求和技术栈，特别检查下拉按钮与展开菜单的一致性，
并验证键盘选择、关闭方式和窄屏布局。
```

### 多 Agent 协作

```text
使用 apple-design-skill，通过多个 Agent 协作改进这个页面：
由负责人确定统一视觉变量并整合改动；
实现者负责分配到的独立组件；
交互检查者独立验证下拉菜单、焦点和键盘流程。
请明确各自修改的文件、验收条件和实际完成的检查。
```

协作指南在 [references/collaboration.md](skills/apple-design-skill/references/collaboration.md)。仅在用户请求或宿主已授权时分派 Agent；普通小修改直接完成。不假定每个工具都有子 Agent API，也不替用户安装 Agent 运行时。没有可用的并行能力时，按顺序执行并明确说明。

包同时包含 `.codex-plugin/plugin.json` 和 `.claude-plugin/plugin.json`，供支持相应插件格式的宿主或市场打包使用。npm CLI 的安装路径是直接技能安装，不会自动注册插件市场；插件市场版本生命周期由对应宿主管理。

## GitHub Actions → npm

- `ci.yml`：在 Linux、macOS、Windows 上，分别使用 Node.js 22 和 24 检查技能、脚本、安装器测试和 npm 包内容。
- `publish.yml`：推送 `v*` 标签时检查标签与包版本一致，测试后打包并通过 npm Trusted Publishing / OIDC 发布；稳定版本使用 `latest`，预发布版本使用 `next`。
- 发布工作流仅获得 `contents: read` 和 `id-token: write`，不使用长期 `NPM_TOKEN`。
- `workflow_dispatch` 只在版本标签 ref 上执行，可以重跑失败的发布。已成功发布的版本不应重复发布。

本包已配置可信发布。初始化时发布的 `1.0.0-rc.1` 保留在 `next`；正式版本从 `0.0.1` 开始，使用 `latest`。npm 侧配置如下：

| 项目 | 值 |
| --- | --- |
| Provider | GitHub Actions |
| Organization/user | `yqstar` |
| Repository | `apple-design-skill` |
| Workflow filename | `publish.yml` |
| Environment | 留空（工作流未使用命名环境） |
| Allowed action | 允许直接 `npm publish` |

参考 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)；只有工作流文件、仓库和 npm 侧授权同时匹配，OIDC 发布才会成功。

后续发版：

```sh
node scripts/version.mjs 0.0.2
# 更新 CHANGELOG.md，审查改动
npm run check
npm test
git add package.json package-lock.json .codex-plugin/plugin.json .claude-plugin/plugin.json CHANGELOG.md
git commit -m "Release 0.0.2"
git tag v0.0.2
git push origin main
git push origin v0.0.2
```

## 本地开发

```sh
npm ci --ignore-scripts
npm run check
npm test
npm pack --dry-run
```

零运行时依赖。测试使用临时目录，覆盖多 Agent 目标、升级与回退、并存名称、缓存完整性、本地修改保护、备份、可恢复卸载、路径与符号链接检查、事务失败恢复，以及真实 npm 压缩包的安装。

## 来源与许可证

MIT，Copyright 2026 yqstar。原有设计指导保留在 [SKILL.md](skills/apple-design-skill/SKILL.md)，其中链接到 Apple、W3C、MDN 等参考资料；这些第三方资料的权利仍属于原权利人。本包不包含 Apple 品牌图形或官方授权声明。
