import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, isThemeId, themeInfo } from "./themes";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const css = read("src/index.css");
const tailwindConfig = read("tailwind.config.js");

const COLOR_TOKENS = [
  "bg",
  "surface",
  "elevated",
  "selected",
  "line",
  "line-strong",
  "accent",
  "accent-dim",
  "accent-bright",
  "muted",
  "fg",
  "danger",
  "danger-bg",
  "warn",
  "info",
] as const;

type Palette = Record<(typeof COLOR_TOKENS)[number], [number, number, number]>;

function blockFor(selector: string): string {
  const pattern = selector
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[[\]]/g, "\\$&"))
    .join("\\s*");
  const match = css.match(new RegExp(`${pattern}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`no CSS block for ${selector}`);
  return match[1];
}

function channels(raw: string): [number, number, number] {
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`"${raw}" is not three 0-255 channels`);
  }
  return parts as [number, number, number];
}

function paletteFrom(block: string): Palette {
  const entries: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--oli-([a-z-]+):\s*([^;]+);/g)) {
    entries[name] = value;
  }
  const palette = {} as Palette;
  for (const token of COLOR_TOKENS) {
    const value = entries[token];
    if (!value) throw new Error(`missing --oli-${token}`);
    palette[token] = channels(value);
  }
  return palette;
}

const palettes: Record<string, Palette> = {};
for (const theme of THEMES) {
  palettes[theme.id] = paletteFrom(blockFor(`[data-theme="${theme.id}"]`));
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

describe("theme metadata", () => {
  it("keeps terminal as the default and includes it in the list", () => {
    expect(DEFAULT_THEME).toBe("terminal");
    expect(THEMES.map((t) => t.id)).toContain("terminal");
  });

  it("has unique ids and non-empty copy", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of THEMES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.chrome).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("validates theme ids defensively", () => {
    expect(isThemeId("paper")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    expect(isThemeId(7)).toBe(false);
  });

  it("falls back to the first theme for an unknown id", () => {
    expect(themeInfo("nope" as never)).toBe(THEMES[0]);
    expect(themeInfo("amber").id).toBe("amber");
  });
});

describe("theme palettes", () => {
  it("defines the root defaults in the terminal block", () => {
    const root = paletteFrom(blockFor(':root, [data-theme="terminal"]'));
    expect(root).toEqual(palettes.terminal);
  });

  for (const theme of THEMES) {
    it(`${theme.id} declares every token plus a radius and colour scheme`, () => {
      const block = blockFor(`[data-theme="${theme.id}"]`);
      for (const token of COLOR_TOKENS) {
        expect(block).toContain(`--oli-${token}:`);
      }
      expect(block).toMatch(/--oli-radius:\s*\d/);
      expect(block).toMatch(/color-scheme:\s*(light|dark)/);
    });

    it(`${theme.id} keeps its browser chrome colour in sync with the page background`, () => {
      expect(theme.chrome).toBe(toHex(palettes[theme.id].bg));
    });

    it(`${theme.id} body text clears WCAG AA on every surface it sits on`, () => {
      const p = palettes[theme.id];
      for (const surface of ["bg", "surface", "elevated", "selected"] as const) {
        expect(contrast(p.fg, p[surface]), `fg on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme.id} keeps every primary status colour readable on the page background`, () => {
      const p = palettes[theme.id];
      for (const token of ["accent", "accent-bright", "info", "warn", "danger"] as const) {
        expect(contrast(p[token], p.bg), `${token} on bg`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme.id} keeps the de-emphasised text legible`, () => {
      const p = palettes[theme.id];
      for (const token of ["muted", "accent-dim"] as const) {
        for (const surface of ["bg", "surface", "elevated"] as const) {
          expect(contrast(p[token], p[surface]), `${token} on ${surface}`).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it(`${theme.id} keeps the accent readable in the highlighted rows of the theme menu`, () => {
      expect(contrast(palettes[theme.id].accent, palettes[theme.id].selected)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme.id} keeps error text readable on the error banner`, () => {
      expect(contrast(palettes[theme.id].danger, palettes[theme.id]["danger-bg"])).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme.id} draws its chrome rules and selection highlight`, () => {
      const p = palettes[theme.id];
      expect(contrast(p["line-strong"], p.surface), "line-strong on surface").toBeGreaterThanOrEqual(1.2);
      expect(contrast(p.selected, p.elevated), "selected on elevated").toBeGreaterThanOrEqual(1.1);
    });
  }
});

describe("token coverage", () => {
  it("declares a CSS custom property for every token used by the Tailwind palette", () => {
    for (const token of COLOR_TOKENS) {
      expect(tailwindConfig).toContain(`var(--oli-${token})`);
    }
  });
});
