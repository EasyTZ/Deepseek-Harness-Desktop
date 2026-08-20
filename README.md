# DeepSeek Desktop

以 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）为内核的 **Windows 桌面应用**。

外壳用 Electron，内核直接复用现有的 `dsh web`，**不改 DSH 核心代码**。程序自包含 `node` 与完整 dsh 依赖树，目标机器**无需预装 Node.js 或 dsh**，双击即用。

## ✨ 功能特性

- **原生桌面窗口**：加载 dsh 的浏览器界面，脱离浏览器运行
- **自包含内核**：内置 `node.exe` + 完整 dsh 依赖树，开箱即用
- **单实例**：重复启动自动聚焦已有窗口
- **系统托盘**：关闭窗口最小化到托盘，双击/菜单唤出
- **全局快捷键**：`Ctrl + Alt + Space` 显示 / 隐藏窗口
- **优雅退出**：退出时清理 dsh 子进程树
- **外部链接拦截**：非回环地址交给系统浏览器打开
- **会话共享**：复用 `~/.dsh`，与 CLI / Web 版共享会话、凭据与设置

## 📦 下载与使用

最新安装包与绿色版请到本仓库的 [Releases](../../releases) 页面下载：

| 产物 | 说明 |
|---|---|
| `DeepSeek-Setup-<版本>.exe` | NSIS 安装包，可选安装目录，装完从开始菜单 / 桌面启动（推荐） |
| `DeepSeek-Portable-<版本>.zip` | 绿色版，解压一次后直接运行 `DeepSeek.exe`，之后每次秒开 |

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

## 📦 构建与打包

```powershell
npm run dist             # prepare-kernel → electron-builder → collect-release
```

最终产物输出到 `release/`：

- `DeepSeek-Setup-<版本>.exe` —— 安装包
- `DeepSeek-Portable-<版本>.zip` —— 绿色版

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
│   │   └── tray.js           # 系统托盘
│   └── preload/index.js      # contextBridge（预留无边框窗口控制通道）
├── scripts/
│   ├── gen-icon.mjs          # 生成 build/icon.png 与 icon.ico
│   ├── prepare-kernel.mjs    # 暂存自包含内核到 kernel/
│   └── collect-release.mjs   # 整理最终产物到 release/
├── build/                    # 图标等构建资源
├── kernel/                   # 暂存内核（gitignored，prepare-kernel 生成）
├── dist/                     # 打包中间产物（gitignored）
└── release/                  # 最终交付产物（gitignored）
```

## 🔭 后续可做

- 无边框 + 自定义标题栏（preload 已预留 `window.*` 通道）
- 任务完成 / 待确认的系统通知（需从 dsh 会话事件桥接）
- Codex 风格主题（需引入 pnpm + DSH 源码开发 client 插件）
- 正式图标与代码签名

## License

[MIT](LICENSE)
