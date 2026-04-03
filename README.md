# YesFlow

> v0.3.0 · A visual AI workflow workspace for planning, structuring, and pushing complex goals forward on one canvas.

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
  <img src="https://img.shields.io/badge/Version-0.3.0-black?style=flat-square" alt="Version 0.3.0">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript 5">
</p>

## Overview

YesFlow turns a natural-language goal into an editable execution map. You can generate a plan with AI, refine it on a node-based canvas, and keep each node's supporting materials inside the same workspace with documents, links, schedules, and tables.

This release makes YesFlow feel less like a simple flow editor and more like a practical project cockpit for AI-assisted work.

## What's New in 0.3.0

- Node tool workspace with `Document`, `Table`, `Link`, and `Schedule` panels
- Right-side utility area with calendar view and quick context switching
- Multi-provider AI setup for MiniMax, DeepSeek, Qwen, Doubao, Zhipu, and OpenAI-compatible endpoints
- Project records with local persistence, quick loading, and drag-to-reorder
- Better workflow editing with grouping, edge labels/colors, import/export, and richer appearance controls

## Core Capabilities

- AI plan generation
  Generate structured workflows from prompts in `daily` or `professional` mode.
- Visual editing
  Drag nodes, connect branches, rename tasks, update status, and reorganize flows on an infinite canvas.
- Node-centered knowledge
  Store SOPs, notes, links, schedules, and structured tables directly on each task node.
- Multi-model orchestration
  Switch providers and models from settings without changing the overall workflow UI.
- Local-first project management
  Save project records locally, reopen them quickly, and export/import JSON project files.
- Personal workflow customization
  Tune hotkeys, canvas interaction, edge colors, handle colors, completion style, and visual presets.

## Typical Workflow

1. Describe a goal in the start dialog.
2. Let YesFlow generate an initial execution graph.
3. Refine nodes, labels, grouping, and branches on the canvas.
4. Attach documents, references, tables, and schedule entries to key nodes.
5. Save the project to local records or export it as JSON.

## Best For

- AI-assisted planning and execution breakdown
- Content, product, operations, or research workflows
- Multi-step tasks that need context, references, and timing in one place
- Users who prefer a visual workspace over prompt-only iteration

## Quick Start

### Prerequisites

- Node.js 18+

### Install

```bash
git clone https://github.com/heeq666/YesFlow.git
cd YesFlow
npm install
```

### Run

```bash
npm run dev
```

Open the app, then configure your API provider in `Settings -> API Configuration`.

### Build

```bash
npm run build
```

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion · @xyflow/react

## Project Notes

- Data is stored locally in the browser by default.
- Exported project files are plain JSON.
- The app is frontend-first and can be deployed as a static site.

## Changelog

Release notes live in [CHANGELOG.md](./CHANGELOG.md).

## License

MIT License - [myheeq@foxmail.com](mailto:myheeq@foxmail.com)
