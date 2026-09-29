# AGENTS.md

Guidance for AI agents and contributors working on this repository.

## Overview

`oli-web` is a self-contained browser UI for the `oli` agent harness. It is a
frontend-only React SPA whose default look is the terminal aesthetic
(black/green, sharp edges, JetBrains Mono), switchable at runtime to five
other themes. It talks to the `oli-server` backend (a sibling repo) over a
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
| `npm run lint`    | ESLint (flat config, strict TS-aware rules)       |
| `npm run build`   | `tsc -b && vite build` → static output in `dist/` |
| `npm test`        | Vitest unit tests (jsdom)                         |
| `npm run preview` | Serve the production build (default port 4173)    |

**Lint and test:** The CI workflow (`npm run lint` → `npm run build` → `npm test`)
is the verification gate for every PR. Run all three locally after any change.
Unit tests live alongside sources (`src/**/*.test.ts`) and mock `fetch`/`WebSocket`
directly; `react-hooks/exhaustive-deps` and Fast-refresh rules are warnings.

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
- **Lint/Test:** ESLint ^10 (flat config) + eslint-plugin-react-hooks/react-refresh;
  Vitest ^4 (jsdom) with @testing-library/react for hook tests
- **Other deps:** `react-markdown` (rendering), `lucide-react` (icons)
- **Package manager:** npm (lockfile v3). Node >= 18 required.
- **No** state management library, router, test framework, or env vars — the app
  reads no environment variables anywhere.

## Structure

```
src/
  main.tsx               ReactDOM entry (StrictMode)
  App.tsx                Shell: TopBar / Sidebar / MainView / StatusBar
  index.css              Tailwind base, theme palettes, scrollbar/selection rules
  types.ts               OliEvent union, domain types, COMMANDS, INITIAL_CONFIG
  themes.ts              Theme ids, labels, descriptions (menu metadata only)
  components/            TopBar, ThemeMenu, StatusBar, Sidebar, ChatPanel, ChatInput,
                         MessageBubble, ThinkingBlock, ToolCallDisplay,
                         SessionList, ConfigPage, MCPPage, SubAgentView, TodoPanel
  context/AppContext.tsx Global state + WebSocket event reducer
  context/ThemeContext.tsx Active theme; applies data-theme, writes localStorage
  hooks/useOliSocket.ts  Auto-reconnecting WebSocket with send/clear helpers
  lib/sessions.ts        REST session client (list/create/get/rename/delete)
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
**Persistence:** Sessions persist server-side on `oli-server`. The browser
  creates a fresh session on load and per new-session, via REST
  `GET /v1/sessions` / `POST /v1/sessions` (see `src/lib/sessions.ts`); each turn
  is sent with `session_id` and the backend persists it. The transcript is never
  stored in the browser. The one client-side key is `oli-theme` (see Themes
  below). If the backend is unreachable, the UI falls back to an ephemeral
  in-memory session.
- **Config:** The Config view edits an in-memory React state object seeded from
  `INITIAL_CONFIG` in `src/types.ts`; it round-trips to the server over
  `GET/PUT /v1/config`. MCP server config is a separate list (`src/types.ts`
  `MCPServerConfig`) managed over `GET/POST /v1/mcp`, `PUT/DELETE /v1/mcp/{name}`
  and driven from `AppContext` (`mcpServers` + CRUD helpers), rendered by
  `MCPPage.tsx`.
- **Profiles:** The status bar's `:: <profile>` chip (`ProfileMenu.tsx`) lists
  the agent profiles from `GET /v1/profiles` and switches with
  `PUT /v1/profiles/{name}` (`src/lib/profiles.ts`). Selection is **process-global**
  on the server's single shared `Agent`, so it applies to every open tab and
  affects the next turn — no restart needed. A successful switch clears the
  conversation (via `clearChat()`) so two personas aren't mixed in one thread,
  matching the TUI's `/profile load`. `config.api_profile` is kept in sync as the
  read-side mirror. `/profile` in the input re-fetches the list.
- **Themes:** Purely front-end — no backend field, no `/v1` call. The swatch
  menu in the top bar (`ThemeMenu.tsx`) sets `data-theme` on `<html>` and
  persists the id in `localStorage` (`oli-theme`); an inline script in
  `index.html` re-applies it before first paint so there is no flash. Palettes
  live in `src/index.css` as `[data-theme="…"]` blocks that set the `--oli-*`
  custom properties, which `tailwind.config.js` wires into the `oli-*` colour
  tokens — so the same component classes retint with no per-theme code. Labels
  and copy live in `src/themes.ts`. `/theme` lists the available ids.
  `src/themes.test.ts` parses the CSS and enforces palette completeness plus
  WCAG contrast floors, so a new theme that is unreadable fails CI rather than
  review. To add a theme: one CSS block, one `themes.ts` entry, one test case.
- **Slash commands:** Handled client-side where they map to UI actions:
  `/clear`, `/config`, `/profile`, `/theme`, `/sessions`, `/todos`, `/subagents`, `/mcp`,
  `/help`. All other commands (`/model`, `/servers`, …) go to the agent as plain
  messages.

## Conventions

- **Comments:** Do not add code comments unless asked.
- **Strictness:** TypeScript is strict — keep types tight, avoid `any`.
- **Terminal aesthetic:** The default look — green on black, zero border radius,
  and blink/pulse animations — is the `terminal` theme, not a hardcoded style.
  Colours go through the semantic `oli-*` Tailwind tokens (`oli-bg`, `oli-fg`,
  `oli-accent`, `oli-line`, …) which resolve to CSS custom properties. **Never
  introduce a raw hex, `bg-black`, `text-green-400` or any default-palette
  colour in a component** — that is what breaks the other five themes. Add new
  surface colours as an `oli-*` token instead.
- **Formatting:** 2-space indent, single quotes, semicolons.

## Container notes

- The production `Dockerfile` builds the SPA and serves it from nginx on port 80.
- Nginx proxies `/v1` (WebSocket) and `/health` to the backend at
  `$BACKEND_HOST:$BACKEND_PORT`, resolved at container start via `envsubst`
  (defaults to `host.docker.internal:9734`). See `nginx.conf` and
  `docker-compose.yml`.
- Run: `docker compose up --build`, then open `http://localhost:9735`.
