# oli-web

A self-contained browser UI for the `oli` agent harness. Terminal look
(black/green, sharp edges, JetBrains Mono) by default, with switchable
themes, React + TypeScript + Tailwind + Vite. Talks to the `oli-server`
WebSocket at `/v1/chat` for real-time streaming (text, thinking, tool calls,
sub-agents, token usage, todos).

![screen_shot_example](/docs/assets/example.PNG)

## Views

| View           | Purpose                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| **chat**       | Streaming transcript (markdown), collapsible thinking blocks, live tool-call chips.          |
| **sessions**   | server-backed session list — search, switch, rename, delete.                                |
| **workspaces** | Browse the server's filesystem and pick the directory the agent works in.                   |
| **todos**      | Live `todowrite` list with status/priority breakdown.                                       |
| **sub-agents** | Per-run timeline of delegated sub-agents (activity, tool calls, messages) + the agent pool. |
| **mcp**        | Add, edit and remove MCP servers (stdio or http transport).                                  |
| **config**     | Editable runtime config (backend, models, API keys, agent flags).                            |

## Run (local dev)

Requirements: Node >= 18, npm, and the `oli-server` backend
(uvicorn on `0.0.0.0:9734`) running from the `oli-bot` repo.

```bash
npm install
npm run dev                # http://localhost:5173
```

Vite proxies `/v1` (WebSocket included) and `/health` to
`http://localhost:9734`, so the browser talks to the same-origin dev server.
Without the backend the UI loads but shows no live data.

Production build:

```bash
npm run build              # tsc -b && vite build -> dist/
npm run preview
```

Lint and unit tests — the CI gate for every PR:

```bash
npm run lint
npm test
```

## Run (Docker)

```bash
docker compose up --build # http://localhost:9735
```

The container serves the production build from nginx on port 80, published on
the host as `0.0.0.0:9735` — so anyone on your LAN can open
`http://<host-ip>:9735` (the client derives its WebSocket URL from
`window.location.host`, so no extra configuration is needed). It proxies
`/v1` (WebSocket) and `/health` to the backend. Point it at your backend with
`BACKEND_HOST` / `BACKEND_PORT` environment variables — by default it reaches
`host.docker.internal:9734` (i.e. the `oli-server` running on your host). See
`docker-compose.yml` and `nginx.conf.template`. The `Makefile` wraps the
common cases (`make run`, `make build`, `make stop`, `make restart`, `make test`).

## WebSocket protocol

Client → server: `{"content": "...", "session_id": "...", "attachments": [...]}`
sends a turn; `{"action": "clear", "session_id": "..."}` resets the server-side
history of that session. `attachments` holds base64 payloads
(`{name, media_type, data}`) for the files picked in the chat input's `+` menu.

Server → client frames (`type` + `data`): `connected`, `text_chunk`,
`thinking`, `tool_call_executing`, `tool_call_result`, `assistant_response`,
`usage`, `error`, `done`, `cleared`, `session_created`, `sub_agent_started`,
`sub_agent_progress`, `sub_agent_completed`, and `todo`. Sub-agent activity is
the same frame shape with `task_id`/`agent_name` attached so the client demuxes
by run. The `done` frame carries the turn's recorded `activity` (thinking,
tool calls, sub-agents), so a reopened session renders exactly like the live
turn did.

## REST API

Everything that is not the live stream is plain REST on the same origin:

| Endpoint                                          | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `GET/POST /v1/sessions`                            | list / create sessions                       |
| `GET/PUT/DELETE /v1/sessions/{id}`                 | fetch, rename and delete a session           |
| `GET/PUT /v1/config`                               | read and persist the runtime config          |
| `GET/POST /v1/mcp`, `PUT/DELETE /v1/mcp/{name}`   | manage the MCP server list                   |
| `GET /v1/profiles`, `PUT /v1/profiles/{name}`      | list and switch the active agent profile     |
| `GET/PUT/DELETE /v1/workspace`                     | read, set and clear the agent workspace      |
| `GET /v1/fs/list?path=…`                           | browse the server's filesystem               |
| `GET /v1/agents`                                   | agent-pool configuration (`agents.yaml`)     |

## Layout

```
src/
  App.tsx               Shell: TopBar / Sidebar / MainView / StatusBar
  types.ts              OliEvent union, domain types, INITIAL_CONFIG
  themes.ts             theme ids, labels and copy for the theme menu
  components/   TopBar, ThemeMenu, StatusBar, ProfileMenu, Sidebar,
                SidebarResizer, ChatPanel, ChatInput, MessageBubble,
                ThinkingBlock, ToolCallDisplay, TurnActivityBlock, SessionList,
                ConfigPage, AgentPoolConfigView, MCPPage, WorkspacePage,
                SubAgentView, TodoPanel, Markdown, configFields
  context/      AppContext — global state + WebSocket event reducer
                ThemeContext — active theme (client-side only)
  hooks/        useOliSocket — auto-reconnecting WebSocket with send/clear
                useSidebarLayout — sidebar width + collapsed state (localStorage)
  lib/          sessions — REST session client (list/create/get/rename/delete)
                profiles, workspace, agents, attachments — REST clients
                liveTurn, transcript — live-segment and transcript builders
                format — tool parameter formatting
```

## Notes

- Sessions persist server-side on `oli-server` (shared with the TUI's `ConversationStore`); the browser creates a fresh session on load and per new-session, and each turn is sent with `session_id`. If the backend is unreachable the UI falls back to an ephemeral in-memory session. The chat transcript is never stored in the browser.
- **Themes** are picked from the swatch menu in the top bar and remembered in
  `localStorage` under `oli-theme`. There are six: `terminal` (default),
  `gemini`, `kid`, `amber`, `synthwave` and `paper`. Switching is entirely
  client-side; no theme is sent to the backend. Palettes live in
  `src/index.css` as `[data-theme="…"]` blocks driving the `oli-*` Tailwind
  tokens, so a new theme is one CSS block plus one entry in `src/themes.ts`.
- **The left sidebar is resizable and collapsible on desktop** (drag the divider,
  double-click to reset, or use `←`/`→`/`Home`/`End`/`Enter` when it's focused;
  the top-bar toggle collapses it). Width and collapsed state persist in
  `localStorage` under `oli-sidebar-width` and `oli-sidebar-collapsed`. On
  mobile the sidebar remains a full-width overlay drawer, opened from the
  top-bar hamburger.
- **Config** is fetched from `GET /v1/config` and saved back with
  `PUT /v1/config`, so edits survive a reload; most of them need a backend
  restart to take effect. The browser itself reads no environment variables.
- **Profiles** are switched from the `:: <profile>` chip in the status bar
  (`GET /v1/profiles`, `PUT /v1/profiles/{name}`). The selection is
  process-global on the server's shared agent, so it applies to every open tab
  and affects the next turn; switching clears the conversation so two personas
  never share a thread.
- **Attachments**: the `+` menu next to the prompt attaches images or files —
  up to 10 attachments of 10 MB each — which are sent inline as base64.
- **Workspaces**: the workspaces view browses the server's filesystem
  (`GET /v1/fs/list`) and sets the directory the agent runs in
  (`PUT /v1/workspace`). Sensitive paths ask for confirmation first.
- **MCP servers** are managed from the mcp view and persisted server-side in
  `~/.config/oli/mcp_servers.json`.
- **Turn activity**: each finished turn keeps a collapsed block with the
  model's thinking, the tool calls it made and how long the turn took. It is
  rebuilt from the server's recorded activity when a session is reopened.
