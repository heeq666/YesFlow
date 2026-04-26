# YesFlow

> v0.3.4 · 一个把 AI 规划、任务拆解、资料沉淀与执行推进整合到同一张画布里的可视化工作流工作台。

[English](./README.md) · [中文](./README_ZH.md)

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
  <img src="https://img.shields.io/badge/Version-0.3.4-black?style=flat-square" alt="Version 0.3.4">
</p>

## 项目简介

YesFlow 会把一句自然语言目标转成可以继续编辑的执行流程图。你可以先让 AI 生成计划，再在节点画布上继续整理结构，并把每个任务节点需要的文档、图片、链接、时间安排和表格都沉淀在同一个工作空间里。

`0.3.4` 聚焦于项目导出格式扩展，并修复节点拖动触发本地记录自动保存时可能出现的白屏问题。

## 0.3.4 更新重点

- 导出弹窗新增 YesFlow JSON、POS、POSF、Visio VDX 与 Mermaid 文本格式
- POS/POSF 项目包支持通过文件选择器或拖拽重新导入
- 修复拖动节点后本地记录自动保存引发的画布白屏崩溃
- 节点拖动吸附时不再直接修改 React Flow 的变更对象，兼容性更稳
- 简化节点工具快照数据，让侧栏与快捷入口状态展示更清晰

## 核心能力

- AI 生成工作流
  通过 `日常模式` 或 `专业模式`，把目标自动拆成结构化任务流程。
- 可视化流程编辑
  在无限画布上拖拽节点、调整分支、修改标签、更新状态和重组结构。
- 节点级资料沉淀
  每个节点都可以挂载说明文档、参考链接、结构化表格和时间安排。
- 多模型接入
  在设置中切换不同提供商和模型，而不需要改动工作流本身。
- 本地优先项目管理
  项目记录自动保存在浏览器本地，也可以导出和导入 JSON 文件。
- 高度可自定义
  支持快捷键、画布交互、连线颜色、手柄颜色、完成态样式和外观预设。

## 推荐使用方式

1. 在开始面板里描述你的目标。
2. 让 YesFlow 先生成一版执行流程。
3. 在画布上继续细化节点、分支、标签和编组。
4. 给关键节点补充文档、链接、表格和时间信息。
5. 保存到项目记录，或导出为 JSON 文件归档。

## 适用场景

- AI 辅助规划与任务拆解
- 内容、产品、运营、研究类复杂流程
- 需要同时管理步骤、资料与时间安排的项目
- 更偏好可视化工作台而不是纯对话式交互的用户

## 快速开始

### 环境要求

- Node.js 18+

### 安装

```bash
git clone https://github.com/heeq666/YesFlow.git
cd YesFlow
npm install
```

### 启动

```bash
npm run dev
```

打开应用后，在 `设置 -> API 配置` 中填写并切换你的模型提供商。

### 构建

```bash
npm run build
```

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion · @xyflow/react

## 说明

- 默认数据存储在浏览器本地。
- 导出的项目文件为 JSON。
- 项目以前端为主，可直接部署为静态站点。

## 更新日志

完整发布记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

MIT License - [myheeq@foxmail.com](mailto:myheeq@foxmail.com)
