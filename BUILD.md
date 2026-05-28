# WedMix Live 打包指南

## 环境要求

- Node.js 18+
- npm 9+

## 安装依赖

首次克隆项目后执行：

```bash
npm install
```

---

## 本地运行（开发调试）

```bash
npm start
```

直接启动 Electron 窗口，用于开发测试，不会生成安装包。

---

## 打包发布

### 打包 macOS（生成 .dmg）

```bash
npm run build:mac
```

- 输出路径：`dist/`
- 同时生成 Intel (x64) 和 Apple Silicon (arm64) 两个版本
- 文件名示例：`WedMix Live-1.0.0.dmg`

### 打包 Windows（生成 .exe 安装包）

```bash
npm run build:win
```

- 输出路径：`dist/`
- 生成带安装向导的 NSIS 安装包（x64）
- 文件名示例：`WedMix Live Setup 1.0.0.exe`
- 安装时支持自定义安装目录，并自动创建桌面和开始菜单快捷方式

### 同时打包两个平台

```bash
npm run build:all
```

> ⚠️ **跨平台打包限制**
>
> - 在 **macOS** 上可以直接打包 Mac 版，打包 Windows 版需要安装 Wine
> - 在 **Windows** 上可以直接打包 Windows 版，无法打包 Mac 版
> - 推荐做法：在各自平台上分别执行对应的打包命令

---

## 项目结构说明

```
wedmix-live/
├── main.js              # Electron 主进程入口
├── index.html           # 应用界面
├── app.js               # 核心业务逻辑
├── config-manager.js    # IndexedDB 配置管理
├── synth-effects.js     # Web Audio 合成音效
├── wav-encoder.js       # WAV 编码器
├── mp3-encoder.js       # MP3 编码器
├── style.css            # 界面样式
├── assets/
│   ├── fonts/           # 本地字体文件（离线）
│   └── libs/            # 本地 JS 库（jszip、lamejs）
├── package.json         # 项目配置与打包脚本
└── node_modules/        # 依赖（不提交到 git）
```

---

## 离线说明

本应用所有资源均已本地化，**完全离线可用**，无需网络连接：

| 资源 | 来源 | 本地路径 |
|------|------|----------|
| Google Fonts（Outfit、Plus Jakarta Sans、Share Tech Mono）| 已下载 | `assets/fonts/` |
| JSZip 3.10.1 | 已下载 | `assets/libs/jszip.min.js` |
| lamejs 1.2.1 | 已下载 | `assets/libs/lame.all.min.js` |
