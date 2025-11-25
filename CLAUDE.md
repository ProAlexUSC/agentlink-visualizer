# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install    # Install dependencies
pnpm run dev    # Start dev server at http://localhost:3000
pnpm run build  # Production build (outputs to dist/)
pnpm run preview # Preview production build
```

## Architecture

This is a React 19 + TypeScript + Vite application that visualizes cross-references between AGENTS.md and CLAUDE.md files in a repository using a force-directed graph.

### Core Data Flow

1. User selects a folder via File System Access API (`showDirectoryPicker`)
2. `App.tsx` recursively scans for AGENTS.md/CLAUDE.md files only (memory efficient)
3. `services/fileParser.ts` extracts `@path` references and builds graph data
4. `components/GraphView.tsx` renders D3 force-directed graph

### Key Files

- `App.tsx` - Main component: folder scanning, file selection, layout
- `types.ts` - TypeScript interfaces: `AgentFile`, `GraphNode`, `GraphLink`, `FileTreeNode`
- `services/fileParser.ts` - Link extraction (`extractLinks`), path resolution (`resolvePath`), graph building (`buildGraphData`), tree building (`buildFileTree`)
- `components/GraphView.tsx` - D3.js force simulation with zoom/drag
- `components/FileTree.tsx` - Recursive file explorer sidebar
- `components/MarkdownViewer.tsx` - Content display with link highlighting

### Reference Parsing

The app parses two link formats:
- `@path/to/file` - CLAUDE.md style references
- `[[wiki-style]]` - Legacy AGENTS.md style

Path resolution supports absolute (`@/path`), explicit relative (`@./path`, `@../path`), and implicit root relative (`@path`).

## Tech Stack

- **React 19** with hooks (useState, useMemo, useEffect, useRef)
- **TypeScript 5.8**
- **Vite 6** with React plugin
- **Tailwind CSS 4** via PostCSS (`@tailwindcss/postcss`)
- **D3.js 7** for force-directed graph visualization
- **Lucide React** for icons
- **File System Access API** (Chrome/Edge only)

## Deployment

GitHub Pages deployment is configured via `.github/workflows/`. The `base` path in `vite.config.ts` is set to `/agentlink-visualizer/` for production builds.
