# Agent Lab：未使用 vs 使用 Apple Design Skill

[返回项目 README](../../README.md)

同一份中文 LLM Agent 学习页需求的两种设计。两版共用六节课程、Python 示例、自测、阶段筛选和浏览器本地进度。

## 运行

在仓库根目录执行：

```sh
python3 -m http.server 4177 --bind 127.0.0.1 --directory examples/agent-learning-compare/dist
```

打开 <http://127.0.0.1:4177/index.html>，支持并排、单版、桌面和手机预览。无构建步骤、无后端、无真实模型调用。

## 文件

| 路径 | 内容 |
| --- | --- |
| [dist/index.html](dist/index.html) | 可操作的对照页与差异表 |
| [dist/baseline.html](dist/baseline.html) | 未使用 Skill 的基础版 |
| [dist/apple.html](dist/apple.html) | 使用 Skill 的 Apple 版 |
| `dist/` 中的 CSS、JavaScript 与图标 | 两版页面所需的资源 |
| [桌面对照](screenshots/comparison-desktop.jpg) · [手机对照](screenshots/comparison-mobile.jpg) · [展开菜单](screenshots/apple-menu-desktop.jpg) | 最终效果截图 |

基础版使用深色侧栏、紧凑卡片与原生选择器；Apple 版使用浅色顶栏、统一视觉变量与自定义下拉菜单。

这是同一实现者顺序完成的设计对照，仅展示本次实现差异。截图中的进度来自当时的浏览器；实际运行时读取当前浏览器的本地进度。

`npm run check:example` 检查页面入口、本地资源、截图格式和 JavaScript 语法。
