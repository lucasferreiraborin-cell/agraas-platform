"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnSecundario } from "../ui";

type Resultado =
  | { arquivo: string; ok: true; mensagem: string; notaId: string | null }
  | { arquivo: string; ok: false; mensagem: string; duplicada: boolean };

const LIMITE_MB = 15;

function rotaDoArquivo(nome: string): string | null {
  const n = nome.toLowerCase();
  if (n.endsWith(".xml")) return "/api/controladoria/notas/upload-xml";
  if (n.endsWith(".pdf")) return "/api/controladoria/notas/upload-pdf";
  return null;
}

/**
 * Envio de NF-e (XML ou PDF do DANFE) — reaproveita as rotas da controladoria.
 * Foto não é oferecida: a rota de PDF só aceita PDF.
 */
export default function EnviarNota() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);

  async function enviar(arquivos: File[]) {
    if (arquivos.length === 0 || enviando) return;
    setResultados([]);
    const novos: Resultado[] = [];

    for (const f of arquivos) {
      const rota = rotaDoArquivo(f.name);
      if (!rota) {
        novos.push({ arquivo: f.name, ok: false, duplicada: false, mensagem: "Formato não aceito. Envie o XML da nota ou o PDF do DANFE." });
        continue;
      }
      if (f.size > LIMITE_MB * 1024 * 1024) {
        novos.push({ arquivo: f.name, ok: false, duplicada: false, mensagem: `Arquivo acima de ${LIMITE_MB} MB.` });
        continue;
      }
      setEnviando(f.name);
      try {
        const form = new FormData();
        form.append("file", f);
        const res = await fetch(rota, { method: "POST", body: form });
        const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string; note_id?: string; duplicada?: boolean };
        if (res.ok) {
          novos.push({ arquivo: f.name, ok: true, mensagem: json.message ?? "Nota recebida.", notaId: json.note_id ?? null });
        } else {
          const mensagem =
            res.status === 401 ? "Sessão expirada. Entre de novo para enviar."
            : res.status === 429 ? "Muitos envios seguidos. Aguarde um minuto."
            : json.error ?? "Não foi possível processar este arquivo.";
          novos.push({ arquivo: f.name, ok: false, duplicada: res.status === 409 || json.duplicada === true, mensagem });
        }
      } catch {
        novos.push({ arquivo: f.name, ok: false, duplicada: false, mensagem: "Falha de conexão. Tente de novo." });
      }
      setResultados([...novos]);
    }

    setEnviando(null);
    setResultados(novos);
    if (novos.some((r) => r.ok)) router.refresh();
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); void enviar(Array.from(e.dataTransfer.files)); }}
        className={`rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
          arrastando ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border-strong)] bg-[var(--surface-soft)]"
        }`}
      >
        <p className="text-[.95rem] font-semibold text-[var(--text-primary)]">
          {enviando ? "Lendo a nota…" : "Solte aqui o XML ou o PDF da nota"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-[.82rem] text-[var(--text-muted)]">
          {enviando
            ? <span className="block truncate" title={enviando}>{enviando}</span>
            : "O XML é lido na hora. No PDF, a leitura é automática: confira os valores depois."}
        </p>
        <div className="mt-4 flex justify-center">
          <button type="button" className={btnSecundario} disabled={!!enviando} onClick={() => inputRef.current?.click()}>
            Escolher arquivos
          </button>
        </div>
        <label htmlFor="gestao-enviar-nota" className="sr-only">Arquivos de nota fiscal (XML ou PDF)</label>
        <input
          id="gestao-enviar-nota"
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,.pdf,application/pdf,text/xml,application/xml"
          className="sr-only"
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []);
            e.target.value = "";
            void enviar(lista);
          }}
        />
      </div>

      <div aria-live="polite" className="mt-3 space-y-2">
        {resultados.map((r, i) => (
          <div
            key={`${r.arquivo}-${i}`}
            className={`rounded-xl border px-3.5 py-2.5 text-[.83rem] ${
              r.ok
                ? "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--text-primary)]"
                : r.duplicada
                  ? "border-[var(--border-strong)] bg-[var(--surface-soft)] text-[var(--text-secondary)]"
                  : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="truncate font-semibold" title={r.arquivo}>{r.arquivo}</p>
            <p className="mt-0.5">{r.mensagem}</p>
            {r.ok && r.notaId && (
              <Link href={`/gestao/notas/${r.notaId}`} className="mt-1 inline-block font-semibold text-[var(--primary-hover)] underline underline-offset-2">
                Abrir a nota
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
