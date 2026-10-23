# GitHub 发布说明

建议仓库名：`yanami-desktop-theme`。

建议简介：`八奈见 · 白 / 墨：ChatGPT / Codex Windows 开屏动画与主题（实验性）`。

首个标签：`v0.1.0-alpha.1`，请标记为 Pre-release，不应发布为稳定版。

## 发布前检查

```text
node scripts/check.cjs
node scripts/package.cjs
```

上传仓库源码及 `dist/yanami-desktop-theme-source.zip`，不要上传 `state/`、`bin/`、开发日志、真实聊天截图、个人路径配置、用户数据目录或官方安装包。

人物插图与第三方库的许可不等于代码的 MIT 许可。发布者应检查 [素材说明](../assets/NOTICE.md) 和 [第三方说明](../THIRD_PARTY_NOTICES.md)，不要宣称拥有原作人物或插画版权。

## 建议 Release 文案

首个实验性源码整理版，包含白 / 墨开屏、七张本地人物素材、原生聊天区右侧布局、用量气泡、本地演示及 Windows 安装/卸载脚本。

首次打开时窗口短暂消失、需要再次激活的问题尚未彻底解决；完整冷启动仍可能经历一次后台重启。请先阅读兼容性说明并备份当前工作。本版本不修改官方安装包。
