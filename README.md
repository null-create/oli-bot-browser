# oli-web

A self-contained browser UI for the `oli` agent harness. Terminal look
(black/green, sharp edges, JetBrains Mono), React + TypeScript + Tailwind +
Vite. Talks to the `oli-server` WebSocket at `/v1/chat` for real-time
streaming (text, thinking, tool calls, sub-agents, token usage, todos).

## Views

| View          | Purpose                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| **chat**      | Streaming transcript (markdown), collapsible thinking blocks, live tool-call chips, slash-command autocomplete. |
| **sessions**  | localStorage-backed session list — search, switch, rename, delete.                                              |
| **todos**     | Live `todowrite` list with status/priority breakdown.                                                           |
| **subagents** | Per-run timeline of delegated sub-agents (activity, tool calls, messages).                                      |
| **config**    | Editable runtime config (backend, models, API keys, agent flags).                                               |

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

## Run (Docker)

```bash
docker compose up --build # http://localhost:8080
```

The container serves the production build from nginx on port 80 and proxies
`/v1` (WebSocket) and `/health` to the backend. Point it at your backend with
`BACKEND_HOST` / `BACKEND_PORT` environment variables — by default it reaches
`host.docker.internal:9734` (i.e. the `oli-server` running on your host). See
`docker-compose.yml` and `nginx.conf.template`.

## WebSocket protocol

Client → server: `{"content": "..."}` sends a turn; `{"action": "clear"}`
resets the server-side history.

Server → client frames (`type` + `data`): `connected`, `text_chunk`,
`thinking`, `tool_call_executing`, `tool_call_result`, `assistant_response`,
`usage`, `error`, `done`, `cleared`, `sub_agent_started`,
`sub_agent_progress`, `sub_agent_completed`, and `todo`. Sub-agent activity is
the same frame shape with `task_id`/`agent_name` attached so the client demuxes
by run.

## Layout

```
src/
  components/   TopBar, StatusBar, Sidebar, ChatPanel, ChatInput, MessageBubble,
                ThinkingBlock, ToolCallDisplay, SessionList, ConfigPage,
                SubAgentView, TodoPanel
  context/      AppContext — global state + WebSocket event reducer
  hooks/        useOliSocket — auto-reconnecting WebSocket with send/clear
  lib/          sessions — localStorage session CRUD
  types.ts      OliEvent union, domain types, COMMANDS, INITIAL_CONFIG
```

## Notes

- Sessions persist to `localStorage` only; there is no server-side session
  storage used by this UI.
- Slash commands are handled client-side where they map to UI actions:
  `/clear`, `/config`, `/sessions`, `/todos`, `/subagents`, and `/help`. All
  other commands (`/model`, `/servers`, …) are sent to the agent as plain
  messages.
- The app reads no environment variables; config edits in the Config view are
  in-memory only and reset on reload.
