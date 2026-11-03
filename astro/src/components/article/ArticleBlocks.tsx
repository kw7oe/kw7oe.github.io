type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string };

type ArticleCalloutProps = {
  labelId: string;
  label: string;
  body: string;
};

type ArticleFigureProps = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

type ArticleTableProps = {
  ariaLabel: string;
  caption: string;
  columns: string[];
  rows: { heading: InlinePart; cells: InlinePart[] }[];
};

type ArticleCodeBlockProps = {
  ariaLabel: string;
  language: "bash" | "rust" | "elixir" | "python";
  highlightedHtml: string;
};

const inlineCodeClassName =
  "rounded-[var(--inline-code-radius)] px-[var(--inline-code-padding-x)] py-[var(--inline-code-padding-y)] [background-color:var(--inline-code-background)] [box-decoration-break:clone] [color:var(--inline-code-color)] [font-family:var(--inline-code-font)] [font-size:var(--inline-code-scale)] [font-synthesis:none] [-webkit-box-decoration-break:clone]";

function renderInlinePart(part: InlinePart, key: number) {
  switch (part.kind) {
    case "text":
      return <span key={key}>{part.text}</span>;
    case "code":
      return (
        <code key={key} className={inlineCodeClassName}>
          {part.text}
        </code>
      );
    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}

export function ArticleCallout({ labelId, label, body }: ArticleCalloutProps) {
  return (
    <aside
      aria-labelledby={labelId}
      data-article-callout
      className="[margin-block:var(--component-gap)] border-s-[3px] border-s-solid border-[#8d776f] [background-color:rgb(255_255_255_/_42%)] [font-family:var(--callout-font)] [font-size:var(--callout-size)] [line-height:var(--callout-line-height)] [padding-block:var(--callout-padding-y)] [padding-inline:var(--callout-padding-x)] text-[#403c45]"
    >
      <p
        id={labelId}
        data-article-callout-label
        className="m-0 mb-[var(--callout-label-gap)] font-medium tracking-[0.1em] uppercase leading-[1.4] text-xs [font-family:var(--body-font)] text-[#625d67]"
      >
        {label}
      </p>
      <p className="m-0">{body}</p>
    </aside>
  );
}

export function ArticleQuote({ parts }: { parts: InlinePart[] }) {
  return (
    <blockquote data-article-quote className="[margin-block:var(--component-gap)] [padding-inline-start:var(--quote-inset)] border-s border-s-solid border-[rgb(41_39_53_/_28%)] text-[#292735] [font-family:var(--quote-font)] [font-size:var(--quote-size)] [line-height:1.28]">
      <p className="m-0 [text-wrap:pretty]">
        “{parts.map(renderInlinePart)}”
      </p>
    </blockquote>
  );
}

export function ArticleFigure({ src, width, height, alt, caption }: ArticleFigureProps) {
  return (
    <figure className="[margin-block:var(--component-gap)]">
      <img
        src={src}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        className="block h-auto w-full rounded-lg border border-solid border-[rgb(41_39_53_/_10%)] [background-color:#e1ddd8]"
      />
      <figcaption className="mt-[var(--caption-gap)] text-[#625d67] [font-family:var(--caption-font)] [font-size:var(--caption-size)] [line-height:1.45] [text-wrap:pretty]">
        {caption}
      </figcaption>
    </figure>
  );
}

export function ArticleTable({ ariaLabel, caption, columns, rows }: ArticleTableProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className="[margin-block-start:var(--component-gap)] overflow-x-auto rounded-lg border border-solid border-[rgb(41_39_53_/_12%)] [background-color:rgb(255_255_255_/_35%)] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#292735]"
    >
      <table className="w-full border-collapse text-start [font-family:var(--table-font)] [font-size:var(--table-size)] [line-height:1.45] [font-variant-numeric:tabular-nums]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap border-b border-solid border-[rgb(41_39_53_/_10%)] p-[var(--table-cell-padding)] text-[#625d67] [font-size:0.82em] font-medium tracking-[0.06em] uppercase"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const lastRow = index === rows.length - 1;
            const borderClass = lastRow ? "border-b-0" : "";

            return (
              <tr key={row.heading.text}>
                <th
                  scope="row"
                  className={`whitespace-nowrap border-b border-solid border-[rgb(41_39_53_/_10%)] p-[var(--table-cell-padding)] text-start font-medium ${borderClass}`}
                >
                  {renderInlinePart(row.heading, 0)}
                </th>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={`${row.heading.text}-${cellIndex}`}
                    className={`whitespace-nowrap border-b border-solid border-[rgb(41_39_53_/_10%)] p-[var(--table-cell-padding)] ${borderClass}`}
                  >
                    {renderInlinePart(cell, cellIndex)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ArticleCodeBlock({ ariaLabel, language, highlightedHtml }: ArticleCodeBlockProps) {
  return (
    <pre
      tabIndex={0}
      aria-label={ariaLabel}
      className="code-block [margin-block:var(--component-gap)] overflow-x-auto rounded-lg border border-solid [border-color:var(--code-border)] [background-color:var(--code-background)] [color:var(--code-foreground)] [font-family:var(--code-font)] [font-size:var(--code-size)] [line-height:var(--code-line-height)] [padding:var(--code-padding)] [tab-size:2] [-webkit-overflow-scrolling:touch] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#292735]"
    >
      <code
        className={`language-${language} [font:inherit]`}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </pre>
  );
}
