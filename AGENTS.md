# AGENTS.md

Guidance for AI agents and contributors working on this repository.

## Overview

`oli-web` is a self-contained browser UI for the `oli` agent harness. It is a
frontend-only React SPA with a terminal aesthetic (black/green, sharp edges,
JetBrains Mono). It talks to the `oli-server` backend (a sibling repo) over a
WebSocket at `/v1/chat` for real-time streaming of text, thinking, tool calls,
sub-agents, token usage, and todos.

This repo is intentionally standalone — nothing here depends on the Python
harness's source code. The only coupling is the WebSocket protocol.
No backend code lives here.

## Commands

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `npm install`     | Install dependencies                              |
| `npm run dev`     | Vite dev server on `http://localhost:5173`        |
| `npm run build`   | `tsc -b && vite build` → static output in `dist/` |
| `npm run preview` | Serve the production build (default port 4173)    |

There is **no lint or test framework** in this project. `npm run build` is the
verification gate — it runs TypeScript in strict mode plus the Vite production
build. Run it after any change.

### Prerequisites for local dev

The `oli-server` backend must be running first (`oli-server` → uvicorn on
`0.0.0.0:9734`). Vite proxies `/v1` (including WebSocket) and `/health` to
`http://localhost:9734` (see `vite.config.ts`). Without the backend the UI loads
but shows no live data.

## Tech stack

- **Language:** TypeScript ^5.6.3 (strict mode), JSX/TSX
- **UI:** React ^18.3.1
- **Build/dev:** Vite ^6.0.1 + `@vitejs/plugin-react` ^4.3.4
- **Styling:** Tailwind CSS ^3.4.16 (PostCSS + Autoprefixer)
- **Other deps:** `react-markdown` (rendering), `lucide-react` (icons)
- **Package manager:** npm (lockfile v3). Node >= 18 required.
- **No** state management library, router, test framework, or env vars — the app
  reads no environment variables anywhere.

## Structure

```
src/
  main.tsx               ReactDOM entry (StrictMode)
  App.tsx                Shell: TopBar / Sidebar / MainView / StatusBar
  index.css              Tailwind base + terminal scrollbar/selection overrides
  types.ts               OliEvent union, domain types, COMMANDS, INITIAL_CONFIG
  components/            TopBar, StatusBar, Sidebar, ChatPanel, ChatInput,
                         MessageBubble, ThinkingBlock, ToolCallDisplay,
                         SessionList, ConfigPage, MCPPage, SubAgentView, TodoPanel
  context/AppContext.tsx Global state + WebSocket event reducer
  hooks/useOliSocket.ts  Auto-reconnecting WebSocket with send/clear helpers
  lib/sessions.ts        localStorage session CRUD
```

## Core architecture rules

- **Events:** All wire frames are the `OliEvent` union in `src/types.ts`
  (`connected`, `text_chunk`, `thinking`, `tool_call_executing`,
  `tool_call_result`, `assistant_response`, `usage`, `error`, `done`, `cleared`,
  `sub_agent_started`/`progress`/`completed`, `todo`). Add or change event shapes
  here first. Sub-agent activity reuses the same frame shape with
  `task_id`/`agent_name` attached so the client demuxes by run.
- **State flow:** All app state lives in `AppContext.tsx` and is driven by a
  reducer that processes WebSocket events. UI components are mostly
  presentational and read from context. Route new events through the reducer;
  don't add ad-hoc setState for server data.
- **Connection:** `useOliSocket.ts` owns the client → `window.location.host`,
  with fallback to `localhost:9734`. It auto-reconnects with exponential backoff
  (1s → 15s cap). Client sends `{"content": "..."}` for a turn or
  `{"action": "clear"}` to reset server-side history.
- **Persistence:** Sessions persist to browser `localStorage` only (key
  `oli_sessions`, see `src/lib/sessions.ts`). There is no server-side session
  storage used by this UI.
- **Config:** The Config view edits an in-memory React state object seeded from
  `INITIAL_CONFIG` in `src/types.ts`; it round-trips to the server over
  `GET/PUT /v1/config`. MCP server config is a separate list (`src/types.ts`
  `MCPServerConfig`) managed over `GET/POST /v1/mcp`, `PUT/DELETE /v1/mcp/{name}`
  and driven from `AppContext` (`mcpServers` + CRUD helpers), rendered by
  `MCPPage.tsx`.
- **Slash commands:** Handled client-side where they map to UI actions:
  `/clear`, `/config`, `/sessions`, `/todos`, `/subagents`, `/mcp`, `/help`. All
  other commands (`/model`, `/servers`, …) go to the agent as plain messages.

## Conventions

- **Comments:** Do not add code comments unless asked.
- **Strictness:** TypeScript is strict — keep types tight, avoid `any`.
- **Terminal aesthetic:** The green-on-black palette, zero border radius, and
  blink/pulse animations live in `tailwind.config.js` and `index.css`. Preserve
  the look when adding UI.
- **Formatting:** 2-space indent, single quotes, semicolons.

## Container notes

- The production `Dockerfile` builds the SPA and serves it from nginx on port 80.
- Nginx proxies `/v1` (WebSocket) and `/health` to the backend at
  `$BACKEND_HOST:$BACKEND_PORT`, resolved at container start via `envsubst`
  (defaults to `host.docker.internal:9734`). See `nginx.conf` and
  `docker-compose.yml`.
- Run: `docker compose up --build`, then open `http://localhost:9735`.
