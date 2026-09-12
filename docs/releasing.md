# 发布指南

[返回 README](../README.md)

本仓库通过 GitHub Actions 的 npm Trusted Publishing / OIDC 发布。以下是维护者操作说明，普通使用者只需[安装 Skill](installation.md)。

## 准备版本

从仓库根目录运行，按实际发布版本替换示例中的 `0.0.2`：

```sh
node scripts/version.mjs 0.0.2
npm run check
npm run check:example
npm test
npm pack --dry-run
```

版本脚本同步 `package.json`、`package-lock.json` 和两个插件清单。将 `CHANGELOG.md` 的 Unreleased 条目归入新版本，检查 npm 包文件列表只包含 CLI、技能与基本包文档；示例截图和研究资料留在 Git 仓库。

审查并提交该版本的全部改动后，再创建、推送版本标签：

```sh
git tag v0.0.2
git push origin main
git push origin v0.0.2
```

技能内容发生变化必须使用新版本号；相同版本的缓存按内容哈希校验，不能用于覆盖旧发布内容。

## 工作流

| 工作流 | 触发条件 | 检查与行为 |
| --- | --- | --- |
| [ci.yml](../.github/workflows/ci.yml) | `main` 推送、Pull Request | Linux、macOS、Windows × Node.js 22、24；校验、示例资源检查、测试和打包检查 |
| [publish.yml](../.github/workflows/publish.yml) | `v*` 标签、标签 ref 上的手动执行 | 检查仓库和版本标签，测试后打包，通过 OIDC 发布 |

稳定版本发布到 `latest`，带预发布后缀的版本发布到 `next`。手动执行仅适用于版本标签，可重试尚未成功的发布；已成功发布的版本不应重复发布。

## npm 可信发布配置

仓库当前发布工作流使用以下配置；首次设置或迁移时，需在 npm 包设置中核对授权：

| 项目 | 值 |
| --- | --- |
| Provider | GitHub Actions |
| Organization/user | `yqstar` |
| Repository | `apple-design-skill` |
| Workflow filename | `publish.yml` |
| Environment | 留空，工作流没有使用命名环境 |

工作流声明 `contents: read` 和 `id-token: write`，使用 OIDC 获取发布凭据，不依赖长期 `NPM_TOKEN`。npm 侧授权必须与工作流身份匹配，详见 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。

`1.0.0-rc.1` 是引导发布流程的历史候选版本，正式版本从 `0.0.1` 开始。历史版本的行为见 [CHANGELOG.md](../CHANGELOG.md)，不要依据版本号的大小推断候选版比正式版更新。
