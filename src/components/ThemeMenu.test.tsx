import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeMenu } from "./ThemeMenu";
import { ThemeProvider } from "../context/ThemeContext";
import { THEME_STORAGE_KEY } from "../themes";

const trigger = () => screen.getByTitle("Change the colour theme");
const option = (name: string) => screen.getByRole("option", { name: new RegExp(name) });

function renderMenu() {
  render(
    <ThemeProvider>
      <ThemeMenu />
    </ThemeProvider>,
  );
}

describe("ThemeMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute("data-theme", "terminal");
    document.head.innerHTML = '<meta name="theme-color" content="#020403" />';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("starts closed and lists nothing until opened", () => {
    renderMenu();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("shows every theme with its label and description", () => {
    renderMenu();
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(6);
    expect(screen.getByText("synthwave")).toBeTruthy();
    expect(screen.getByText("vintage CRT, P1 phosphor")).toBeTruthy();
  });

  it("marks the active theme as selected", () => {
    renderMenu();
    fireEvent.click(trigger());
    expect(option("terminal").getAttribute("aria-selected")).toBe("true");
    expect(option("paper").getAttribute("aria-selected")).toBe("false");
  });

  it("applies, persists and re-tints on selection", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.mouseDown(option("paper"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("paper");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("paper");
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    ).toBe("#f6f1e7");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("ignores a click on the theme that is already active", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "terminal");
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.mouseDown(option("terminal"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("terminal");
  });

  it("browses with the arrow keys and commits with Enter", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("kid");
  });

  it("wraps around at the top of the list", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("paper");
  });

  it("closes on Escape without changing the theme", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("terminal");
  });

  it("restores a previously stored theme on mount", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "synthwave");
    renderMenu();
    expect(document.documentElement.getAttribute("data-theme")).toBe("synthwave");
  });

  it("falls back to the default when the stored value is unknown", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    renderMenu();
    expect(document.documentElement.getAttribute("data-theme")).toBe("terminal");
  });
});
