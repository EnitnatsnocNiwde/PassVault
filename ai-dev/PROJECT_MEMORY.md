# PassVault 项目记忆

## 项目信息
- **名称**: PassVault
- **类型**: 桌面密码管理器
- **技术栈**: Electron + Vanilla HTML/CSS/JS
- **路径**: `passvault/`

## 用户背景
- Unity3D 开发 + 游戏后端
- 偏好：不希望安装额外工具链，全程 AI 开发
- 本地已有 Node.js (22.22.2) 和 Python (3.13.12)

## 关键决策
1. Electron 方案（零工具依赖）
2. 主密码 → PBKDF2 → AES-256-GCM 单密钥方案
3. 所有密码存在单一 `.pvault` 文件中，整文件加密
4. 密码默认隐藏，点击展示 3 秒
5. WebDAV + 本地文件夹 双通道云同步
6. 搜索支持按字段优先级过滤
7. 不引入任何前端框架
