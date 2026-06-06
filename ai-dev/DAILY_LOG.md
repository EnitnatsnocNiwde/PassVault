# 2026-06-06

## PassVault 密码管理器

### 项目启动
- 用户（U3D 开发 + 游戏后端背景）需要开发一个密码管理器
- 完成需求对齐，确认技术方案为 Electron + 原生 JS（零额外工具）
- 完成完整设计文档 `docs/DESIGN.md`

### 需求对齐 (总计 25 项决策)
- **加密**：主密码(≥4位) + 恢复密钥(≥8位) 双入口，PBKDF2 → AES-256-GCM
- **数据模型**：条目标签化，支持多 Vault 归属。ID 前缀区分 Vault
- **UI**：锁屏→主界面(分组表格)→设置，9列宽可拖拽自定义
- **安全**：错误5次冷却30秒/剪贴板1分钟清除/原子写入+自动备份
- **回收站**：删除条目进回收站可恢复，托盘可清空
- **功能**：密码生成器(高级折叠)、快捷键、列头排序、全局搜索
- **同步**：WebDAV(凭证主密码加密) + 本地文件夹同步
- **平台**：Windows only，默认 900×620 窗口

### 项目初始化
- `passvault/` 目录已创建
- Git 仓库初始化 (main 分支)
- `.gitignore` 配置（排除 node_modules/dist/.pvault 文件）
- `docs/DESIGN.md` v2.0 最终版完成
- `docs/CHANGELOG.md` 完整变更记录

### Phase 1 完成 — Electron 骨架 (20个文件, 2536行)
- Electron 31.7.7 已安装（使用国内镜像）
- package.json + main.js + preload.js 入口三件套
- crypto.js: PBKDF2 + AES-256-GCM + SHA-256 加密引擎
- vault.js: 多Vault+回收站+CRUD+原子写入
- settings.js: 本地 JSON 设置管理
- ipc-handlers.js: 25条 IPC 通道
- autoLock.js: 空闲检测自动锁屏
- index.html: SPA 单页（lock/setup/main/settings 四个页面）
- 4个CSS + 6个JS 渲染层文件
- i18n 中英文支持
- 代码已推送到 GitHub

### Bug 修复 (17:00)
- **存储路径显示哈希码**: `ipc-handlers.js` 中 `vault:setup` 参数顺序错误 — `customKey` 和 `storagePath` 在 handler 里顺序和 preload.js 传参顺序相反，导致恢复密钥(64位hex)被写入 storagePath，真实路径被当 customKey 使用。已交换参数顺序修复。
- **清理损坏数据**: 删除 `%APPDATA%/PassVault/settings.json` 和 hash 命名的 vault 文件(`f363f95c...`及其.bak)
- **设置页"更改路径"按钮无效**: `settings.js` 中 `showChangePath` 等 10 个函数只有调用没有定义（Phase 2 遗漏）。已补全全部实现：
  - `showChangePath` - 选择文件夹修改存储路径
  - `showChangePassword` - 修改主密码弹窗
  - `showRegenerateKey` - 重新生成恢复密钥
  - `renderTrash` / `clearTrash` - 回收站渲染/清空
  - `renderVaultList` / `showAddVault` - 密码库管理
  - `exportPlain` / `exportEncrypted` / `importFile` - 数据导入导出
  - `escHtml` - HTML 转义工具
- **CSS 补充**: `settings.css` 添加 `.trash-name/.trash-account/.trash-date/.vault-id/.vault-count/.btn-tiny/.btn-warning` 样式

### 托盘功能 + 主界面重设计 + 锁屏按钮 (17:25)
- **系统托盘**: `main.js` 创建 Tray 图标(logo.png)，右键菜单(显示/退出)，双击恢复窗口
- **IPC 通道**: 新增 `app:hide-window`、`app:force-quit`、`app:lock-required` 三个通道
- **关闭对话框修复**: 托盘模式不再 reload 页面，改为调用 `hideWindow()`
- **主界面双栏布局**: 左侧 180px 侧边栏(密码库列表 + 底部设置齿轮)，右侧内容区
- **锁屏按钮**: 主界面 header 新增"🔒 锁定"按钮，调用 vault:lock 后跳转锁屏页
- **设置页**: 新增"日志"页签 + 面板，可独立开关日志
- **preload.js**: 新增 `hideWindow`、`forceQuit`、`onLockRequired` 暴露

### 多密码库 + UI 改进 (17:35)
- **默认密码库中文化**: "Default" → "默认"
- **多库条目创建**: addEntry 改为遍历所有选中 vaultId，每个库独立建条目、独立ID前缀
- **归属密码库下拉复选框**: 替换原来的内联 checkbox，改为下拉菜单多选（支持全选/部分选/单选，无选择时红色警告）
- **主界面密码库过滤**: 左侧边栏点击"全部"或具体库 → renderTable 按 vaultId 过滤
- **日志面板**: 新增日志目录路径显示 + "打开日志目录" 按钮（调用 shell.openPath）
- **$activeVaultFilter**: 全局跟踪当前选中的密码库过滤器，所有 renderTable 调用同步使用

### 粘贴按钮 + ID 显示优化 (17:43)
- **粘贴按钮**: 网站/别称/账号/密码/描述 右侧各加 📋 粘贴（绿色），账号/密码额外有 📝 复制（蓝色）
- **新增 IPC**: clipboard:read 通过主进程读取剪贴板
- **默认选中**: 新建设条目时归属密码库默认仅勾选"默认"
- **ID 缩写**: 表格 ID 列只显示后缀（10001→1, 20005→5），移除下拉菜单中的 idPrefix 提示
- **CSS**: .paste-btn 绿色, .copy-btn 蓝色，hover 反转填充

### 重置流程 + 表格 + 搜索标签 (17:00)
- **重置修复**: resetData 现在删除磁盘上的 .pvault/.bak/.tmp 文件; lock.js 重置后直接跳转设置向导不再 reload
- **表格列标题**: 新增 sticky 表头行（ID/网站/别称/账号/密码(点击显示)/归属/描述/≡），加粗+灰色背景
- **列竖向分隔线**: 每个 col-* 加 `border-right: 1px solid var(--border)`
- **密码提示**: 列标题显示"(点击显示)"，单元格 title="点击显示密码"，修复溢出 `text-overflow: ellipsis`
- **搜索标签**: "全局"→"全局搜索", "网站"→"网站优先", 密码用 🔒

### 表格 + 密码库修复 (17:05)
- **新建密码库**: prompt() 在 Electron 中不生效，改为 modal 弹窗输入
- **删除归属列**: 表格移除"归属"列（左侧边栏已显示密码库归属，冗余）
- **列宽重平衡**: 网站 flex:1.1、别称/账号/密码/描述各 flex:1，五列等宽
- **密码样式**: 去掉 monospace+letter-spacing，改普通字体，颜色跟随主文本色，溢出省略

### 状态同步 + 验证修复 (17:10)
- **新建密码库后刷新**: 设置→返回主界面时同步调用 `initMainPage()`，侧边栏即时更新
- **新建条目验证**: 增加账号为必填项（网站+账号+密码 三选必填）
- **回收站状态同步**: 删除/编辑后同步更新全局 `state` 变量，设置页回收站正确显示
- **删除后侧栏刷新**: confirmDeleteEntry 补充 `renderMainSidebar()` 调用

### 密码生成器 (17:15) ✅
- 编辑弹窗密码栏新增 `🎲 生成` 按钮
- 弹窗：长度滑块 8-32 + 大写/小写/数字/符号 复选框
- `crypto.getRandomValues` 安全随机 → 立即填充密码框

### 拖拽排序 (17:17) ✅
- 表格行 `draggable="true"` + HTML5 DnD API
- dragstart/dragover/drop 三步处理，拖拽时半透明+蓝线提示
- 拖拽放到位后交换 order 值并 `vault:reorder` 保存

### 列头排序 (17:20) ✅
- 表头 ID/网站/别称/账号/密码/描述 均可点击排序
- 首次点击升序 ▲，再次点击降序 ▼
- sortField + sortAsc 全局状态，搜索/过滤后保持排序

### 导入冲突处理 (17:22) ✅
- IPC 增加冲突检测（按网站+别名+账号匹配）
- 逐条冲突对话框: 跳过/覆盖/全部跳过/全部覆盖
- `vault:import-finalize` 执行最终导入

### WebDAV 同步 (17:30) ✅
- `src/main/sync.js`: webdav 包封装，pushVault/pullVault/testConnection
- 设置→同步面板完整功能：测试连接/立即上传/立即下载/自动间隔
- autoSync 定时器按配置间隔自动推送，pull 前备份本地 .syncbak
- README 更新：badge + 项目结构

### 同步模块 Provider 重构 (17:26)
- `sync.js` → `sync/index.js` (SyncManager) + `providers/webdav.js` + `providers/folder.js`
- 每个 Provider 实现统一接口: `test()` / `push()` / `pull()` / `getInfo()`
- SyncManager 暴露 `registerProvider(name, factory)` 供第三方扩展
- 新增第三方同步只需写一个类文件、注册进 SyncManager
- FolderProvider 完整实现本地文件夹 push/pull 同步

### 日志修复 + 同步提示全局人性化 (20:31)
- **logger.js**: sync() 调用 write() 参数顺序错误 → 对象被当 message 拼成 `[object Object]`。改为 `write('SYNC','SYNC',method,detail)`
- **sync/index.js**: 全部 14 条 reason 文案重写，去掉技术黑话：
  - "双方都修改过" → "本地和云端都有新的修改，需要你来决定保留哪一份"
  - "vaultId不一致" → "本地和云端属于不同的密码库，无法自动合并"
  - "大量删除风险" → "本地删除了较多密码条目，为防止误删请确认"
  - 每条都加了上下文解释，用户能看懂发生了什么

### i18n 四阶段改造 (20:31-21:00) ✅
**Phase 1**: 建 `src/i18n/index.js` + `zh-CN.json`，删除旧 `js/i18n.js`。209 个扁平 key，t() 支持变量替换，applyI18n() 扫描 data-i18n/placeholder/title
**Phase 2**: lock.js + app.js + table.js 完全替换；main.js toast/下拉标签替换。settings.js 和 index.html 的大模板字符串留待后续
**Phase 3**: sync/index.js 全部 reason → reasonKey，渲染层 t(cmp.reasonKey) 翻译
**Phase 4**: en.json 完整英文翻译，设置页语言切换 → reload

### 主界面视觉重构方案 (22:49)
- 基于用户截图诊断 7 大问题：侧边栏无计数、搜索按钮风格不一、分组头简陋、底栏隐形、色调缺乏层次
- 输出完整规范文档 `docs/UI_REDESIGN_SPEC.md`：
  - 色彩三层体系（bg-page → bg-surface → bg-raised）
  - 蓝紫主色 #5B5FC7 + 灰调文字体系
  - 侧边栏 240px + 图标 + 计数徽章
  - 搜索栏 segment control 统一替代散落按钮
  - 表格分组头左侧色条 + 折叠箭头
  - 列宽精确 px+flex 定义
  - 行内复制/显示按钮 hover 显示
  - 底部同步状态可视化（圆点+文字+按钮）
  - 暗色模式后备色板
  - 6 阶段实施顺序

### Phase 1 完成 — 色板落地 (22:59) ✅
- `base.css` 完全重写 CSS 变量：
  - 浅色模式设为默认（旧暗色默认→body.theme-dark 覆盖）
  - 三层背景：--bg-page #F0F0F3 / --bg-secondary #FFFFFF / --bg-raised #FAFAFC
  - 主色 #5B5FC7 (±旧 --accent)，文字三级 #1B1B1F/#5E5E6E/#9B9BAB
  - 边框三级 --border-light/medium/input，聚焦环 3px #5B5FC7 25%alpha
  - 按钮加透明边框，输入框用 --bg-raised + --border-input
  - 新增别名变量（--color-primary 等）供后续 Phase 迁移
- `settings.js` 主题默认值 dark→light，选项浅色排前
- 兼容：旧变量名全保留，其他 CSS 文件零 breakage
- Electron 启动验证：无崩溃，白色面板+浅灰底生效

### Phase 2 完成 — 侧边栏/搜索筛选/分组头重构 ✅
**修改文件**: main.css, main.js, table.js
- **侧边栏** (纯 CSS + JS 模板微调):
  - 宽度 180px→220px，section-title uppercase+letter-spacing
  - vault-item: 36px 固定高度 + 8px 水平 margin + 6px 圆角，pill 风格
  - active: --accent-light 浅紫底 + --accent 主色文字（原来是 border-left 强调条）
  - 计数 badge: 11px + 紫底白字 active 态，非 active 灰底灰字
  - vault-name: flex:1 + 溢出省略
  - 设置按钮: 透明边框字重 500，hover 显示浅底
- **搜索框** (纯 CSS):
  - 高度 38px，border-radius --radius-lg(10px)
  - 边框 --border-input，背景 --bg-raised
  - focus: 3px 主色光圈
- **筛选按钮** (纯 CSS):
  - 统一 segment-control: gap=0, border-right 分隔, overflow:hidden
  - active 主色填充白字，非 active 透明底 hover 浅灰
  - 全局搜索右置 margin-left:12px
- **分组头** (CSS + table.js HTML 微调):
  - 左侧 3px --accent 竖条 + --bg-raised 浅底
  - 12px/600 名称 + 11px/400 灰色条目数
  - 从 `── name ──` 纯文本 → `<group-name> + <group-count>` 结构化
- **未触碰**: 业务逻辑、搜索算法、筛选规则、同步、加密、数据存储 全部不动
- 自查清单 15 项全部通过

### Phase 3 完成 — 表格数据行 + 列宽精确重构 ✅
**修改文件**: main.css, table.js
- **列宽精确化**: 6列 flex 比例 + 1 固定 action + 1 固定 drag
  - `col-id` 36px | `col-website` flex:2 | `col-alias` flex:1.5 | `col-account` flex:1.5 | `col-password` flex:1.2 | `col-description` flex:2 | `col-actions` 30px | `col-drag` 20px
  - 全部 `min-width:0` 防 flex 溢出 + `text-overflow:ellipsis`
  - 头行列与数据列严格对齐（含密码头+描述头）
- **分组容器**: 每组 `section-header + rows` 包裹在 `.table-group` div
  - zebra striping: `.table-group .table-row:nth-child(even)` 正确交替
- **行样式**: 34px 固定高度，1px --border-light 底部线，hover --bg-surface
- **行内按钮**: 密码复制按钮移入 `.col-actions` 列，统一 hover 显示
- **拖拽**: drag handle `⠿` 固定在行末 20px 列
- **未触碰**: filterEntries/createTableRow/sort/分组逻辑/同步/加密 全部不动

### 表格精修 (23:38) ✅
**修改文件**: main.css（仅此一个文件，纯CSS调整）
- **降灰**: 数据行默认背景透明，斑马纹 1.2% 黑（极轻），hover 改 `.table-group .table-row:hover`（去 !important）
- **收紧行高**: 表头 40px、数据行 44px、分组头 34px
- **分组头轻量化**: 背景透明，仅保留左侧 3px 紫条，移除底部分割线
- **筛选按钮轻量**: 高度 34→32px，未选中白底（--bg-secondary），选中去 shadow，hover 保持微反馈
- **列文字权重**: 网站列 weight 500 + --text-primary，别称/账号 --text-secondary，密码列 --text-muted + letter-spacing，描述 13px --text-muted
- **表头精修**: 13px/600，密码头双行 flex direction column
- **0 行 JS 改动**，业务逻辑完全不动

### 密码库分组头强化 + 表格精修 (23:51) ✅
**修改文件**: main.css, table.js (仅 section-header 一行 HTML 微调)
- **分组头 → 密码库标题**: 新增 `.vault-dot` (7px 紫色圆点) 在左侧 accent 条与名称之间，与侧边栏 vault-item 结构呼应
  - 侧边栏: `[●] [名称] [count-badge]`
  - 表格分组头: `[3px紫条] [●] [名称] [count]`
  - 同色 (--accent)、同尺寸 (7px)、同透明度 (0.75)
- **分组名**: 新增 `.group-name` flex:1 + 溢出省略，防长名称撑破
- **行高收紧**: 数据行 44→42px（信息密度微提升）
- **筛选按钮/表头**: 本轮不动，已达标
- **业务逻辑**: 0 行 JS 逻辑改动，仅 table.js section-header 的 innerHTML 加了一个 span

### Bug 修复 — 锁定后密码未清空 (23:55)
- `lock.js`: `initLockScreen()` 入口加 3 行清空主密码框/恢复密钥框/错误提示

### Phase 5+6 完成 — 顶栏+底栏+微交互 ✅
**修改文件**: main.css, base.css, index.html
- **顶栏**: 高度 48px，border-bottom 1px --border-light（原1.5px --border-hover），padding 0 20px
- **底栏**: 高度 36px，bg --bg-raised，border-top 1px --border-light
  - 同步状态点: 10px 字体彩色圆点（绿=已同步,红=未保存,灰=未配置）
  - 同步按钮: `.sync-btn` 替代 `.btn-tiny`，透明底+细边框，hover 主色高亮
  - HTML: 按钮文字 "🔄 同步"→"立即同步"，footer-count 包裹
- **页面过渡**: base.css `@keyframes pageIn` 0.12s ease 淡入
- **行hover**: transition 0.08s→0.1s ease
- **0 行 JS 业务逻辑改动**

### 高压精修轮 (00:07)
**修改**: main.css, index.html
- **分组头**: group-name 14px/600, group-count #7F7F7F, hover 极浅紫底 rgba(91,95,199,0.04), transition 0.1s
- **筛选按钮**: active hover → --accent-hover, border-radius 8px 固定, 间距 8px
- **设置按钮**: "⚙ 设置" 文字版, padding 7px 14px, align-self stretch 横跨侧边栏
- **0 JS 改动**, filter/sort/sync 全不动
