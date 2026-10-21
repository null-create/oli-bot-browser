import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";
import { MessageBubble } from "./MessageBubble";
import { ChatMessage } from "../types";

afterEach(cleanup);

describe("Markdown", () => {
  it("renders a GFM table", () => {
    const { container } = render(
      <Markdown>{"| Col A | Col B |\n| --- | --- |\n| 1 | 2 |"}</Markdown>,
    );

    const table = container.querySelector("table");
    expect(table).toBeTruthy();

    const headers = Array.from(container.querySelectorAll("th")).map(
      (el) => el.textContent,
    );
    expect(headers).toEqual(["Col A", "Col B"]);

    const cells = Array.from(container.querySelectorAll("td")).map(
      (el) => el.textContent,
    );
    expect(cells).toEqual(["1", "2"]);
  });

  it("keeps table column alignment", () => {
    const { container } = render(
      <Markdown>{"| L | R |\n| :-- | --: |\n| 1 | 2 |"}</Markdown>,
    );

    const cells = Array.from(
      container.querySelectorAll("td"),
    ) as HTMLTableCellElement[];
    expect(cells[0].style.textAlign).toBe("left");
    expect(cells[1].style.textAlign).toBe("right");
  });

  it("renders GFM strikethrough", () => {
    const { container } = render(<Markdown>{"~~gone~~"}</Markdown>);
    expect(container.querySelector("del")?.textContent).toBe("gone");
  });

  it("renders GFM task lists as disabled checkboxes", () => {
    const { container } = render(
      <Markdown>{"- [ ] pending\n- [x] done"}</Markdown>,
    );

    const boxes = container.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(boxes).toHaveLength(2);
    expect(boxes[0].checked).toBe(false);
    expect(boxes[1].checked).toBe(true);
    expect(boxes[0].disabled).toBe(true);
    expect(container.querySelectorAll("li.task-list-item")).toHaveLength(2);
  });

  it("turns single newlines into line breaks", () => {
    const { container } = render(<Markdown>{"line one\nline two"}</Markdown>);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("renders fenced code blocks", () => {
    const { container } = render(
      <Markdown>{"```\nconst x = 1;\n```"}</Markdown>,
    );
    expect(container.querySelector("pre code")?.textContent?.trim()).toBe(
      "const x = 1;",
    );
  });

  it("marks external links as safe to open", () => {
    render(<Markdown>{"[docs](https://example.com)"}</Markdown>);
    const link = screen.getByText("docs") as HTMLAnchorElement;
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
  });
});

describe("MessageBubble markdown", () => {
  const message: ChatMessage = {
    id: "m1",
    role: "assistant",
    content: "| A | B |\n| --- | --- |\n| 1 | 2 |",
    timestamp: Date.now(),
  };

  it("renders a markdown table inside the bubble", () => {
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("th")?.textContent).toBe("A");
    expect(container.querySelector("td")?.textContent).toBe("1");
  });
});
