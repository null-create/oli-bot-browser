import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const components: Components = {
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      className="text-oli-info underline decoration-dotted underline-offset-2"
      target="_blank"
      rel="noreferrer noopener"
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={components}
      className={className}
    >
      {children}
    </ReactMarkdown>
  );
}
