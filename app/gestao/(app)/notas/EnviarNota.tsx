"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimario, btnSecundario } from "../ui";

type Resultado =
  | { arquivo: string; ok: true; mensagem: string; notaId: string | null }
  | { arquivo: string; ok: false; mensagem: string; duplicada: boolean };

// A Vercel recusa corpo acima de 4,5 MB antes de a rota rodar (413 sem JSON).
// Barrar antes, no aparelho, dá mensagem clara em vez de erro genérico.
const LIMITE_MB = 4;
const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;
// Foto: reduzida no próprio aparelho para no máximo 2000 px no lado maior, em
// JPEG. Basta para a leitura (a IA reduz acima disso) e fica leve no 4G da roça.
const LADO_MAX = 2000;
const QUALIDADE_JPEG = 0.85;

const ROTA_XML = "/api/controladoria/notas/upload-xml";
const ROTA_PDF = "/api/controladoria/notas/upload-pdf";
const ROTA_FOTO = "/api/controladoria/notas/upload-imagem";

const MSG_HEIC =
  "Esta foto está em HEIC (formato do iPhone) e o navegador não conseguiu convertê-la. "
  + "Use o botão \"Tirar foto da nota\" ou envie a foto em JPG.";

const ehHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
const ehImagem = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|hei[cf])$/i.test(f.name);

function rotaDoArquivo(f: File): string | null {
  const n = f.name.toLowerCase();
  if (n.endsWith(".xml") || f.type === "text/xml" || f.type === "application/xml") return ROTA_XML;
  if (n.endsWith(".pdf") || f.type === "application/pdf") return ROTA_PDF;
  if (ehImagem(f)) return ROTA_FOTO;
  return null;
}

/**
 * Reduz a foto e converte para JPEG no aparelho. O navegador desenha a imagem
 * já na orientação certa (EXIF) e, quando sabe ler HEIC (Safari), a conversão
 * resolve o formato do iPhone de graça.
 */
async function prepararFoto(f: File): Promise<{ arquivo: File } | { erro: string }> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("imagem sem dimensão");
    const escala = Math.min(1, LADO_MAX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.fillStyle = "#ffffff"; // PNG com transparência vira fundo branco, não preto
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALIDADE_JPEG));
    if (!blob) throw new Error("falha ao gerar JPEG");
    const base = f.name.replace(/\.[^.]+$/, "") || "foto-da-nota";
    return { arquivo: new File([blob], `${base}.jpg`, { type: "image/jpeg" }) };
  } catch {
    if (ehHeic(f)) return { erro: MSG_HEIC };
    // Não deu para redesenhar, mas o formato é aceito: segue como está, se couber.
    if (/^image\/(jpeg|png|webp|gif)$/i.test(f.type) && f.size <= LIMITE_BYTES) return { arquivo: f };
    return { erro: "Não foi possível preparar esta foto. Envie em JPG ou PNG." };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Envio de NF-e: XML, PDF do DANFE ou FOTO do DANFE (24/11/2026). Reaproveita
 * as rotas da controladoria; a foto vai para a rota irmã upload-imagem.
 */
export default function EnviarNota() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState<{ nome: string; foto: boolean } | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);

  async function enviar(arquivos: File[]) {
    if (arquivos.length === 0 || enviando) return;
    setResultados([]);
    const novos: Resultado[] = [];

    for (const original of arquivos) {
      const nome = original.name || "foto-da-nota.jpg";
      const rota = rotaDoArquivo(original);
      if (!rota) {
        novos.push({ arquivo: nome, ok: false, duplicada: false, mensagem: "Formato não aceito. Envie o XML, o PDF ou uma foto da nota." });
        setResultados([...novos]);
        continue;
      }
      const foto = rota === ROTA_FOTO;
      setEnviando({ nome, foto });

      let arquivo = original;
      if (foto) {
        const preparada = await prepararFoto(original);
        if ("erro" in preparada) {
          novos.push({ arquivo: nome, ok: false, duplicada: false, mensagem: preparada.erro });
          setResultados([...novos]);
          continue;
        }
        arquivo = preparada.arquivo;
      }
      if (arquivo.size > LIMITE_BYTES) {
        novos.push({
          arquivo: nome, ok: false, duplicada: false,
          mensagem: foto
            ? `Foto acima de ${LIMITE_MB} MB mesmo reduzida. Tire de novo, mais perto da nota.`
            : `Arquivo acima de ${LIMITE_MB} MB. Envie o XML da nota, que é bem menor.`,
        });
        setResultados([...novos]);
        continue;
      }

      try {
        const form = new FormData();
        form.append("file", arquivo);
        const res = await fetch(rota, { method: "POST", body: form });
        const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string; note_id?: string; duplicada?: boolean };
        if (res.ok) {
          novos.push({ arquivo: nome, ok: true, mensagem: json.message ?? "Nota recebida.", notaId: json.note_id ?? null });
        } else {
          const mensagem =
            res.status === 401 ? "Sessão expirada. Entre de novo para enviar."
            : res.status === 413 ? `Arquivo grande demais para envio (máximo ${LIMITE_MB} MB).`
            : res.status === 429 ? "Muitos envios seguidos. Aguarde um minuto."
            : json.error ?? "Não foi possível processar este arquivo.";
          novos.push({ arquivo: nome, ok: false, duplicada: res.status === 409 || json.duplicada === true, mensagem });
        }
      } catch {
        novos.push({ arquivo: nome, ok: false, duplicada: false, mensagem: "Falha de conexão. Tente de novo." });
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
          {enviando ? (enviando.foto ? "Lendo a foto da nota…" : "Lendo a nota…") : "Envie a nota: foto, XML ou PDF"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-[.82rem] text-[var(--text-muted)]">
          {enviando
            ? (
              <>
                <span className="block truncate" title={enviando.nome}>{enviando.nome}</span>
                {enviando.foto && <span className="block">A leitura da foto pode levar até 1 minuto.</span>}
              </>
            )
            : "O XML é lido na hora. Foto e PDF são lidos por IA: confira os valores depois."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {/* Câmera: só no celular. No computador, a foto entra por "Escolher arquivos". */}
          <button type="button" className={`${btnPrimario} sm:hidden`} disabled={!!enviando} onClick={() => fotoRef.current?.click()}>
            Tirar foto da nota
          </button>
          <button type="button" className={btnSecundario} disabled={!!enviando} onClick={() => inputRef.current?.click()}>
            Escolher arquivos
          </button>
        </div>
        <label htmlFor="gestao-enviar-nota" className="sr-only">Arquivos de nota fiscal (XML, PDF ou foto)</label>
        <input
          id="gestao-enviar-nota"
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,.pdf,application/pdf,text/xml,application/xml,image/*"
          className="sr-only"
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []);
            e.target.value = "";
            void enviar(lista);
          }}
        />
        <label htmlFor="gestao-foto-nota" className="sr-only">Foto da nota fiscal (câmera)</label>
        <input
          id="gestao-foto-nota"
          ref={fotoRef}
          type="file"
          accept="image/*"
          capture="environment"
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
            {r.ok && (
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {r.notaId && (
                  <Link href={`/gestao/notas/${r.notaId}`} className="font-semibold text-[var(--primary-hover)] underline underline-offset-2">
                    Abrir a nota
                  </Link>
                )}
                <Link href="/gestao/notas/produtos" className="font-semibold text-[var(--primary-hover)] underline underline-offset-2">
                  Ligar produtos da nota
                </Link>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
