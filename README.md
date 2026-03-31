# 🎼 YesFlow

> Build, orchestrate, and visualize complex AI workflows with a beautiful drag-and-drop interface

[🇺🇸 English](./README.md) · [🇨🇳 中文](./README_ZH.md)

---

<p align="center">
  <img src="./public/logo.svg" width="120" alt="YesFlow Logo" />
</p>

<p align="center">
  <a href="https://github.com/heeq666/YesFlow">
    <img src="https://img.shields.io/badge/GitHub-heeq666/YesFlow-blue?style=flat-square&logo=github" alt="GitHub">
  </a>
  <a href="https://github.com/heeq666/YesFlow/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript">
</p>

---

## 📌 Overview

YesFlow is a **visual AI task orchestration tool** that lets you build complex AI workflows through an intuitive drag-and-drop editor. Connect multiple AI nodes into a pipeline, configure conditions, parallel branches, and execute — all without writing a single line of code.

---

## 🤔 Why YesFlow?

| Traditional Approach | With YesFlow |
|---|---|
| Write code to connect APIs | Drag nodes to connect APIs |
| Hard to visualize data flow | Real-time visual pipeline |
| Difficult to manage branching logic | Condition nodes with clear branches |
| Code changes for every workflow edit | Click-and-edit, instant preview |

> **You don't write code. You compose music.**

---

## ✨ Features

- **🎨 Visual Pipeline Builder** — Drag, drop, and connect AI nodes on an infinite canvas
- **🤖 Multi-Model Support** — Configure different AI models for different nodes
- **🔄 Condition & Branching** — Intelligent branching logic with Condition nodes
- **🔀 Parallel Execution** — Run multiple AI tasks simultaneously
- **🖱️ Smart Selection** — `Shift + Click` / `Shift + Drag` for multi-select
- **🎹 Customizable Hotkeys** — Fully configurable keyboard shortcuts
- **🌙 Dark Mode** — Beautiful dark UI by default
- **💾 Local-First Storage** — All data in browser localStorage, no account needed
- **📦 One-Click Deploy** — Pure frontend, deploy to Netlify/Vercel in seconds

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │              React Flow Canvas                    │   │
│  │   [Start] ──▶ [LLM] ──▶ [Condition]              │   │
│  │                 │           ├──▶ [End (Yes)]      │   │
│  │                 │           └──▶ [LLM] ──▶ [End]│   │
│  └──────────────────────────────────────────────────┘   │
│           │                          │                   │
│           ▼                          ▼                   │
│  ┌──────────────────┐    ┌──────────────────────┐      │
│  │  MiniMax API     │    │  Browser localStorage │      │
│  └──────────────────┘    └──────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Node Types

| Node | Role |
|------|------|
| `Start` | Entry point |
| `End` | Exit point |
| `LLM` | AI inference via MiniMax API |
| `Condition` | Conditional branching |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MiniMax API Key ([Get one](https://platform.minimaxi.com/))

### Install & Run

```bash
git clone https://github.com/heeq666/YesFlow.git
cd YesFlow
npm install
npm run dev
```

### Deploy

```bash
npm run build
# Upload dist/ to Netlify or any static host
```

---

## 🛠️ Tech Stack

React 18 · TypeScript · @xyflow/react · Tailwind CSS · Framer Motion · Vite

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Open a Pull Request

---

## 📄 License

MIT License — [myheeq@foxmail.com](mailto:myheeq@foxmail.com)
