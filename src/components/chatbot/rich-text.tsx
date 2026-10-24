import * as React from "react";
import Link from "next/link";

/**
 * Minimal, safe renderer for assistant replies: **bold**, [label](/internal)
 * links and "- " bullet lists. No HTML is ever injected; external links are
 * rendered as plain text.
 */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyPrefix}-b${i++}`}>{m[1]}</strong>);
    else if (m[3]?.startsWith("/") && !m[3].startsWith("//")) out.push(<Link key={`${keyPrefix}-l${i++}`} href={m[3]}>{m[2]}</Link>);
    else out.push(m[2]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-chat space-y-3 text-[0.92rem] leading-relaxed text-parchment">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ivory" aria-hidden />
                  <span>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${bi}-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
