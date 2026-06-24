import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import type { ReactNode } from "react";

// Re-le o STATUS.md a cada visita (sem cache estatico).
export const dynamic = "force-dynamic";

// ── Renderizador de markdown leve (cobre só o subset usado no STATUS.md) ──────

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) {
      out.push(
        <strong
          key={`${keyBase}-b${i}`}
          className="font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {t.slice(2, -2)}
        </strong>
      );
    } else if (t.startsWith("`")) {
      out.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded px-1.5 py-0.5 text-[0.85em]"
          style={{
            background: "var(--surface-soft)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
          }}
        >
          {t.slice(1, -1)}
        </code>
      );
    } else {
      out.push(t.slice(2, -2)); // [[link]] -> só texto
    }
    last = m.index + t.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push(
        <hr key={key++} className="my-8" style={{ borderColor: "var(--border)" }} />
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={key++}
          className="mt-8 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={key++}
          className="mt-10 mb-3 flex items-center gap-2 text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="inline-block h-5 w-1 rounded"
            style={{ background: "var(--primary)" }}
          />
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={key++}
          className="mb-2 text-3xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {renderInline(line.slice(2), `h1-${key}`)}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-4 rounded-r border-l-2 py-2 pl-4 text-sm"
          style={{
            borderColor: "var(--primary)",
            background: "var(--surface-soft)",
            color: "var(--text-secondary)",
          }}
        >
          {buf
            .filter((b) => b.trim() !== "")
            .map((b, j) => (
              <p key={j}>{renderInline(b, `bq-${key}-${j}`)}</p>
            ))}
        </blockquote>
      );
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|[-:\s|]+\|\s*$/.test(lines[i + 1])
    ) {
      const headerCells = splitRow(line);
      i += 2; // pula header + separador
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="ag-table w-full text-sm">
            <thead>
              <tr>
                {headerCells.map((c, j) => (
                  <th key={j} className="text-left">
                    {renderInline(c, `th-${key}-${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci}>{renderInline(c, `td-${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-3 space-y-1.5">
          {items.map((it, j) => (
            <li
              key={j}
              className="flex gap-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              <span style={{ color: "var(--primary)" }}>•</span>
              <span>{renderInline(it, `li-${key}-${j}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={key++}
        className="my-3 text-sm leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {renderInline(para.join(" "), `p-${key}`)}
      </p>
    );
  }

  return blocks;
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function StatusPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientData } = await supabase
    .from("clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  // Página interna — só admin (fundador).
  if (clientData?.role !== "admin") redirect("/painel");

  let md = "";
  try {
    md = await fs.readFile(path.join(process.cwd(), "STATUS.md"), "utf8");
  } catch {
    md =
      "# Status do Projeto\n\nNão consegui ler o `STATUS.md` agora. Tente recarregar.";
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="ag-badge ag-badge-green">Agraas · painel interno</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          atualizado automaticamente a partir do STATUS.md
        </span>
      </div>
      <article>{renderMarkdown(md)}</article>
    </main>
  );
}
