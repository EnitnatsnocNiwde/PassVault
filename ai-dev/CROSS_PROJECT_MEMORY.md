# Cross-Project Memory

## Electron 安装加速（国内网络）
- `npm install electron` 卡住 → postinstall 从 GitHub 下载 ~106MB 二进制，国内极慢
- 解决：直接 curl 从 npmmirror 下载 zip → 解压到 `node_modules/electron/dist/` → 写 `path.txt`（内容 `electron.exe`，无换行符）→ 写 `dist/version`（内容 `v31.7.7`）
- 下载 URL 格式：`https://npmmirror.com/mirrors/electron/v{VERSION}/electron-v{VERSION}-win32-x64.zip`
- 也可用环境变量：`ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"` 但 @electron/get 代理层仍可能卡
