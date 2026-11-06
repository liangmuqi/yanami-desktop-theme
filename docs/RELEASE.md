# GitHub 发布说明

建议仓库名：`yanami-desktop-theme`。

建议简介：`八奈见 · 白 / 墨：ChatGPT / Codex Windows 开屏动画与主题（实验性）`。

当前标签：`v0.1.0-alpha.4`，请标记为 Pre-release，不应发布为通用稳定版。

## 发布前检查

```text
node scripts/check.cjs
node scripts/package.cjs
```

上传仓库源码及 `dist/yanami-desktop-theme-source.zip`，不要上传 `state/`、`bin/`、开发日志、真实聊天截图、个人路径配置、用户数据目录或官方安装包。

人物插图与第三方库的许可不等于代码的 MIT 许可。发布者应检查 [素材说明](../assets/NOTICE.md) 和 [第三方说明](../THIRD_PARTY_NOTICES.md)，不要宣称拥有原作人物或插画版权。

## 建议 Release 文案

包含白 / 墨开屏、七张本地人物素材、原生聊天区右侧布局、用量气泡、本地演示及 Windows 安装/卸载脚本。

本版补充官方包更新后的单次启动参数接续：只对已验证的版本变化记录执行一次重开，普通断线不触发。已在 26.1103.3517.0 上通过模拟更新事件、真实原版启动、自动开屏和再次唤回验证。另修复文件预览被欢迎语与人物占位遮挡的问题，白 / 墨预览及返回聊天检查通过。本版本不修改官方安装包；未来界面和桥接协议变化仍可能需要适配。
