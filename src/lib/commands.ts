export type CommandSpec = {
  name: string;
  summary: string;
  usage: string;
};

export const WORKSPACE_COMMAND: CommandSpec = {
  name: "/ws",
  summary: "switch workspace",
  usage: "/ws <path> | /ws off",
};

export const COMMANDS: readonly CommandSpec[] = [WORKSPACE_COMMAND];

export type ParsedCommand =
  | { kind: "workspace-set"; path: string }
  | { kind: "workspace-unset" }
  | { kind: "workspace-show" };

export type CommandMatch = {
  spec: CommandSpec;
  token: string;
  rest: string;
  start: number;
  end: number;
};

function unquote(value: string): string {
  const text = value.trim();
  if (text.length < 2) return text;
  const first = text[0];
  const last = text[text.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return text.slice(1, -1);
  }
  return text;
}

export function matchCommand(text: string): CommandMatch | null {
  const start = text.length - text.trimStart().length;
  const tail = text.slice(start);
  if (!tail.startsWith("/")) return null;

  const boundary = tail.search(/\s/);
  const end = start + (boundary === -1 ? tail.length : boundary);
  const token = text.slice(start, end);
  const spec = COMMANDS.find(
    (command) => command.name.toLowerCase() === token.toLowerCase(),
  );
  if (!spec) return null;

  return { spec, token, rest: text.slice(end), start, end };
}

export function parseSlashCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();
  const match = /^\/ws(?=$|\s)/i.exec(trimmed);
  if (!match) return null;

  const arg = unquote(trimmed.slice(match[0].length));
  if (!arg) return { kind: "workspace-show" };

  const sub = arg.toLowerCase();
  if (sub === "off" || sub === "unset") return { kind: "workspace-unset" };

  return { kind: "workspace-set", path: arg };
}
