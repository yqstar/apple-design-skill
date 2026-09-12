# README 与目录组织参考

[返回 README](../README.md)

调研日期：2026-09-12。以下是 GitHub 页面当时显示的约数，用于说明选取范围，不作为 Skill 质量评分或完整排名。

| 项目 | 约 Star 数 | 观察到的组织方式 | 本仓库采用的做法 |
| --- | ---: | --- | --- |
| [anthropics/skills](https://github.com/anthropics/skills) | 175.9k | 技能在独立目录内自包含，README 解释用途与使用入口 | `skills/apple-design-skill/` 作为唯一可安装源，开发资料放在外部 |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 31.1k | 按适用任务介绍技能，给出安装命令、自然语言示例与目录说明 | 用任务表和直接可复制的提示说明如何使用，并提供简短目录图 |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 127.0k | 提供设计成果展示、按工具安装说明，以及技能源和 CLI 的维护边界 | 先展示真实案例，明确宿主安装目标，将安装器与展示资料分开维护 |

以上均参考项目本身的 README 和目录。本次借鉴信息组织方式，没有复制这些项目的技能规则、演示图片或设计数据库。

## 具体调整

- README 先回答「解决什么问题、效果如何、怎样开始」，将完整安装选项和发布配置分别移入 `docs/installation.md`、`docs/releasing.md`。
- 添加贡献入口，说明技能源、安装器、文档与案例各自的修改位置。
- 使用现有 Agent Lab 对照作为实例，仅保留最终页面、三张效果截图和简短说明。
- 示例与截图随 Git 仓库提供，不进入 npm 包；Skill 安装仍只复制技能目录。
- 保留现有跨平台测试与发布流程，增加示例入口、资源和脚本检查。

当前只有一个技能，现有 `bin/`、`lib/` 与 `skills/` 已能清晰分工，无需为模仿大项目而改成多包仓库。
