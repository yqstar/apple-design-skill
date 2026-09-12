# 安装与版本管理

[返回 README](../README.md)

需要 Node.js 22 或更新版本。所有命令默认作用于当前项目；添加 `--global` 切换到用户级安装。`npx 包名@版本` 决定本次安装器携带的技能内容，`install` 才会写入目标目录。

## 选择安装目标

```sh
# 当前项目：Codex、Claude Code、Cursor
npx apple-design-skill@latest install --all

# 指定工具，可用逗号或重复 --agent
npx apple-design-skill@latest install --agent codex,claude

# 用户级安装
npx apple-design-skill@latest install --agent cursor --global

# 不指定工具：使用通用 .agents/skills 目录
npx apple-design-skill@latest install

# 指定项目并预览，不写入文件
npx apple-design-skill@latest install --all --project . --dry-run

# 固定已发布版本，适合复现
npx apple-design-skill@0.0.1 install --agent codex
```

| 目标 | 项目级目录 | 用户级目录 |
| --- | --- | --- |
| `codex` / `universal` | `.agents/skills/apple-design-skill` | `~/.agents/skills/apple-design-skill` |
| `claude` | `.claude/skills/apple-design-skill` | `~/.claude/skills/apple-design-skill` |
| `cursor` | `.cursor/skills/apple-design-skill` | `~/.cursor/skills/apple-design-skill` |

安装器的路径映射见 [resolveTargets](../lib/installer.mjs)。宿主发现规则参考 [Codex 本地技能发现](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)、[Claude Code Skills](https://code.claude.com/docs/en/skills) 和 [Cursor Skills](https://cursor.com/docs/skills)。

Cursor 也可能发现 `.agents`、`.claude` 等兼容目录；使用 `--all` 后可能出现同名入口。只使用 Codex 与 Cursor 时，可安装到共享的 `--agent universal` 目标。安装器会合并指向同一目录的目标，但不会删除其他工具目录中的副本。

未立即发现技能时，开启新会话。已有 `~/.codex/skills/apple-design-skill` 等旧目录不会被静默迁移或删除；确认新版本可用后再整理旧副本。

## 升级与回退

安装后，完整快照保存在当前作用域的 `.apple-design-skill/versions/<版本>`，位于宿主的自动发现目录之外；实际使用的是复制到目标技能目录的活动版本。

```sh
# 升级；干净的受管理副本可直接更新
npx apple-design-skill@latest install --all

# 查看缓存版本和活动安装
npx apple-design-skill@latest list --all

# 激活已经缓存的版本
npx apple-design-skill@latest use 0.0.1 --all

# 若旧版本未缓存，先安装该精确版本
npx apple-design-skill@0.0.1 install --all
```

`use` 只使用本地缓存，可以离线工作；`npx @latest` 自身仍可能联网解析安装器。需要完全离线时，预先固定本地安装器：

```sh
npm install --save-dev --save-exact apple-design-skill@0.0.1
./node_modules/.bin/apple-design-skill use 0.0.1 --all
```

Windows 可使用 `node node_modules/apple-design-skill/bin/apple-design-skill.mjs use 0.0.1 --all`。

## 并存不同版本

```sh
npx apple-design-skill@1.0.0-rc.1 install --name apple-design-preview --agent codex
npx apple-design-skill@0.0.1 install --name apple-design-stable --agent codex
```

`--name` 会同时修改安装副本的 Skill 名称和 Codex 元数据里的调用名称，可分别调用 `$apple-design-preview` 与 `$apple-design-stable`。自动选择时仍可能匹配相似描述，版本对照请显式指定名称。

`@next`、`@latest` 是可移动的 npm 标签。要复现某次结果，应使用精确版本，并记录实际读取的 Skill 内容或哈希。

## 本地修改与卸载

- 已存在的非本包目录，或有本地修改的安装，默认拒绝覆盖。
- 使用 `--force` 时，原文件先移入 `.apple-design-skill/backups/`，CLI 会输出备份路径。
- 同一版本号不能对应不同技能内容；发布内容变化需要新版本号。
- 多目标安装先整体检查，切换失败时恢复原活动副本。
- 安装器拒绝目标路径与缓存中的符号链接，`--force` 不会绕过此检查。

```sh
# 备份并替换本地修改
npx apple-design-skill@latest install --all --force

# 卸载受管理的活动副本，保留版本快照与备份
npx apple-design-skill@latest uninstall --all
```

卸载时，`--project` / `--global`、`--agent` 和 `--name` 要与目标安装对应。团队可将活动技能目录提交到 Git，并忽略 `.apple-design-skill/` 历史缓存。

进程被强制终止后可能留下锁或事务目录。先检查是否还有安装器运行，再处理 `.apple-design-skill/lock`；保留事务目录中的 `old-*` 文件以便恢复。

## 使用仓库里的未发布修改

`npx apple-design-skill@latest` 下载 npm 发布内容，不会读取你修改的本地仓库。开发时，从仓库根目录把当前源码装入一个新的临时项目：

```sh
node bin/apple-design-skill.mjs install --agent codex --project /path/to/scratch-project --dry-run
node bin/apple-design-skill.mjs install --agent codex --project /path/to/scratch-project
```

每次验证使用新的临时项目，避免同版本不同内容与旧缓存冲突。维护与发布流程见[贡献指南](../CONTRIBUTING.md)和[发布指南](releasing.md)。
