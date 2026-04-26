import type { ReactNode } from "react";

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
}

function safeHref(href: string) {
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : "#";
  } catch {
    return "#";
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={nodes.length}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={nodes.length}>{renderInline(token.slice(2, -2))}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={nodes.length}>{renderInline(token.slice(1, -1))}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        nodes.push(
          <a key={nodes.length} href={safeHref(link[2])} target={link[2].startsWith("/") || link[2].startsWith("#") ? undefined : "_blank"} rel="noreferrer">
            {link[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function isTable(lines: string[]) {
  return lines.length >= 2 && lines[0].includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[1]);
}

function renderTable(lines: string[], key: number) {
  const rows = lines
    .filter((_, index) => index !== 1)
    .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  const [head, ...body] = rows;

  return (
    <div key={key} className="markdown-table-wrap">
      <table>
        <thead>
          <tr>{head.map((cell, index) => <th key={index}>{renderInline(cell)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownRenderer({ content, compact = false }: MarkdownRendererProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={blocks.length} data-lang={lang || undefined}>
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (trimmed.startsWith("![") && trimmed.includes("](")) {
      const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) {
        blocks.push(
          <figure key={blocks.length}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image[2]} alt={image[1]} />
            {image[1] ? <figcaption>{image[1]}</figcaption> : null}
          </figure>
        );
        i += 1;
        continue;
      }
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      if (isTable(tableLines)) {
        blocks.push(renderTable(tableLines, blocks.length));
        continue;
      }
      blocks.push(<p key={blocks.length}>{renderInline(tableLines.join(" "))}</p>);
      continue;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length || 2;
      const text = trimmed.replace(/^#{1,3}\s/, "");
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      blocks.push(<Tag key={blocks.length}>{renderInline(text)}</Tag>);
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const titleMatch = quote[0]?.match(/^\[!(NOTE|TIP|WARNING|INFO)\]\s*(.*)$/i);
      blocks.push(
        <blockquote key={blocks.length} className={titleMatch ? "callout" : undefined}>
          {titleMatch ? <strong>{titleMatch[1].toUpperCase()}</strong> : null}
          <p>{renderInline(titleMatch ? [titleMatch[2], ...quote.slice(1)].filter(Boolean).join(" ") : quote.join(" "))}</p>
        </blockquote>
      );
      continue;
    }

    if (/^(-|\*)\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^(-|\*)\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(-|\*)\s+/, ""));
        i += 1;
      }
      blocks.push(<ul key={blocks.length}>{items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(<ol key={blocks.length}>{items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>|\||(-|\*)\s+|\d+\.\s+|!\[)/.test(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(<p key={blocks.length}>{renderInline(paragraph.join(" "))}</p>);
  }

  return <div className={`markdown-renderer ${compact ? "compact" : ""}`}>{blocks}</div>;
}
