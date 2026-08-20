# DeepSeek Desktop

以 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）为内核的 **Windows 桌面应用**。

外壳用 Electron，内核直接复用现有的 `dsh web`，**不改 DSH 核心代码**。程序自包含 `node` 与完整 dsh 依赖树，目标机器**无需预装 Node.js 或 dsh**，双击即用。

## ✨ 功能特性

- **原生桌面窗口**：加载 dsh 的浏览器界面，脱离浏览器运行
- **无边框 + 自定义标题栏**：DeepSeek 鲸鱼 logo，圆角可爱化样式
- **自包含内核**：内置 `node.exe` + 完整 dsh 依赖树，开箱即用
- **单实例**：重复启动自动聚焦已有窗口
- **系统托盘**：关闭窗口最小化到托盘，双击/菜单唤出
- **全局快捷键**：`Ctrl + Alt + Space` 显示 / 隐藏窗口
- **优雅退出**：退出时清理 dsh 子进程树
- **外部链接拦截**：非回环地址交给系统浏览器打开
- **会话共享**：复用 `~/.dsh`，与 CLI / Web 版共享会话、凭据与设置
- **余额查询**：每次对话后在回复下方显示 DeepSeek 账户余额
- **系统通知**：任务完成 / 待确认时后台弹通知（窗口失焦时）

## 📦 下载与使用

最新安装包与绿色版请到本仓库的 [Releases](../../releases) 页面下载：

| 产物 | 说明 |
|---|---|
| `DeepSeek-Harness-Desktop-Setup-<版本>.exe` | NSIS 安装包，可选安装目录，装完从开始菜单 / 桌面启动（推荐） |
| `DeepSeek-Harness-Desktop-Portable-<版本>.zip` | 绿色版，解压一次后直接运行 `DeepSeek Harness Desktop.exe`，之后每次秒开 |

> 系统要求：Windows 10 / 11 x64。首次启动会拉起本地服务，稍等几秒窗口即出现。

## 🛠 开发

前置：Node.js ≥ 22、npm（首次会联网下载 Electron 二进制，国内可用 npmmirror 镜像，已写入 `.npmrc`）。

```powershell
npm install              # 安装依赖
node scripts/gen-icon.mjs
npm start                # 启动桌面应用
```

开发态默认调用本机已有的 dsh（`D:\nodejs\node_modules\@deepseek-ai\dsh`），可用环境变量覆盖：

- `DSH_NODE_EXE` —— node 可执行文件路径（默认 `node`，走 PATH）
- `DSH_BIN_JS` —— `dsh/lib/bin.js` 路径

### 开发者日常速查

| 目的 | 怎么做 | 生效方式 |
|---|---|---|
| 开发调试 | `npm start` | 用本机 node+dsh，改源码后**重启进程**即生效，无需打包 |
| 打包 | `npm run dist` | 产出安装包 + zip 到 `release/` |
| 验证成品 | 双击 `dist\win-unpacked\DeepSeek Harness Desktop.exe` | 打包后的解包形态，免安装直跑 |

> 注意：正在运行的 `dist` 成品（`win-unpacked\DeepSeek Harness Desktop.exe`）是打包那一刻的**快照**，改 `src/` 源码对它无影响；要看到改动，要么用 `npm start` 重启，要么重新 `npm run dist` 后再运行新产物。

### 用独立 Web 版开发（agent 不会自杀）

当「agent 跑在桌面版里、又要开发桌面版」时，直接重启会杀掉 agent 自己的宿主进程。改用**独立的 Web 版**承载 agent，桌面版只当"被测试对象"——两者是不同进程、互不影响：

1. **宿主**（跑 agent、改代码）：`dsh web`（独立的网页版进程）
2. **靶子**（看改动效果）：`npm start`（桌面版开发态）

在宿主（Web 版）里清理 / 重启桌面版进程时，只影响桌面版，不伤 Web 版自己。

> 桌面版 spawn 的内核进程会携带 `DSH_DESKTOP=1` 与 `DSH_DESKTOP_PARENT_PID=<electron 主进程 PID>` 标记，便于与 Web 版内核精确区分、避免误杀。

## 📦 构建与打包

```powershell
npm run dist             # prepare-kernel → electron-builder → collect-release
```

最终产物输出到 `release/`：

- `DeepSeek-Harness-Desktop-Setup-<版本>.exe` —— 安装包
- `DeepSeek-Harness-Desktop-Portable-<版本>.zip` —— 绿色版

`prepare-kernel` 从本机 dsh 安装目录拷贝 `node.exe` 与依赖树，可用 `DSH_NODE_EXE` / `DSH_INSTALL_DIR` 覆盖来源。

> 注意：内核的 `node_modules` 必须放在 `kernel/runtime/` 子目录里——electron-builder 会硬排除 `from` 根部的 `node_modules` 目录，但子目录里的不受影响。

## 🏗 架构

```
┌─────────────────────────────────────────────┐
│  Electron 外壳（主进程）                      │
│  ├─ 拉起 dsh web 子进程（内置 node + dsh）    │
│  ├─ 就绪检测后 loadURL 到本地回环地址          │
│  └─ 单实例 / 托盘 / 全局快捷键 / 优雅退出       │
└──────────────┬──────────────────────────────┘
               │ http://127.0.0.1:<随机端口>
               ▼
          dsh web（自包含内核，原样复用）
```

外壳启动时挑一个空闲端口，`spawn` 内置的 `node.exe .../dsh/lib/bin.js web --port <port>`，轮询 HTTP 就绪后加载窗口。退出时 `taskkill /T /F` 整棵进程树。

内核是**自包含**的：打包时把 `node.exe` 和完整 `@deepseek-ai/dsh` 依赖树一起塞进安装包（`resources/kernel/`），用户机器无需预装 Node 或 dsh。

## 📁 目录结构

```
dsDesktop/
├── package.json              # 脚本与依赖（electron / electron-builder）
├── electron-builder.yml      # 打包配置（NSIS + zip，自包含内核）
├── src/
│   ├── main/
│   │   ├── index.js          # 应用入口：单实例、生命周期、IPC
│   │   ├── dsh-service.js    # dsh 子进程托管：启动/就绪/退出
│   │   ├── window.js         # BrowserWindow 创建与外部链接拦截
│   │   ├── tray.js           # 系统托盘
│   │   └── notifications.js  # 系统通知（任务完成/待确认）
│   └── preload/index.js      # 标题栏注入 + 窗口控制桥接
├── plugins/
│   └── dsh-ui-balance/       # 余额查询插件（host 半 + client 半）
├── scripts/
│   ├── gen-icon.mjs          # 生成 build/icon.png 与 icon.ico
│   ├── install-plugin.mjs    # 把插件装进开发态 dsh
│   ├── prepare-kernel.mjs    # 暂存自包含内核到 kernel/
│   └── collect-release.mjs   # 整理最终产物到 release/
├── build/                    # 图标等构建资源
├── kernel/                   # 暂存内核（gitignored，prepare-kernel 生成）
├── dist/                     # 打包中间产物（gitignored）
└── release/                  # 最终交付产物（gitignored）
```

## 🔭 后续可做

- Codex 风格主题（需引入 pnpm + DSH 源码开发 client 插件）
- 截图 / 图片输入（需等 DeepSeek 模型支持图片）
- 内置浏览器（让 agent 可视化浏览网页）
- 正式代码签名

## 📝 版本更新记录

### v1.0.0

- 无边框窗口 + 自定义标题栏（DeepSeek 鲸鱼 logo，圆角可爱化样式）
- 窗口控制按钮：最小化 / 最大化（含还原状态图标切换）/ 关闭，柔和配色
- DeepSeek 官方鲸鱼图标（应用图标 + 系统托盘图标）
- 应用更名：DeepSeek Harness Desktop
- 系统托盘、单实例、全局快捷键（`Ctrl + Alt + Space`）
- 自包含内核：内置 node + 完整 dsh 依赖树，无需预装 Node/dsh
- 余额查询插件：每次对话后在回复下方显示 DeepSeek 账户余额
- 系统通知：任务完成 / 待确认时后台弹系统通知（窗口失焦时）
- 打包：NSIS 安装包 + zip 绿色版

## License

[MIT](LICENSE)
