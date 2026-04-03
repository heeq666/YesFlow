# YesFlow

> v0.3.1 · A visual AI workflow workspace for planning, structuring, and pushing complex goals forward on one canvas.

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
  <img src="https://img.shields.io/badge/Version-0.3.1-black?style=flat-square" alt="Version 0.3.1">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript 5">
</p>

## Overview

YesFlow turns a natural-language goal into an editable execution map. You can generate a plan with AI, refine it on a node-based canvas, and keep each node's supporting materials inside the same workspace with documents, images, links, schedules, and tables.

Version `0.3.1` sharpens the day-to-day experience with node image attachments, cleaner project persistence, and better feedback around long-running AI actions.

## What's New in 0.3.1

- Node image tool with local upload and remote URL support
- Project records now keep per-record AI task progress, success states, and failure feedback
- Save/export flows sanitize transient UI fields before writing JSON or local records
- Shared task layout constants keep canvas editing, group generation, and AI placement more consistent
- Runtime error boundary prevents full blank-screen failures and surfaces crash details in development

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
