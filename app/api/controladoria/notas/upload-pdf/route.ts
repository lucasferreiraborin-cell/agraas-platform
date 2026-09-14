/**
 * POST /api/controladoria/notas/upload-pdf — modo "PDF (DANFE)" do modal da
 * controladoria. Extração por IA (lib/fiscal/pdf-extract.ts) com fallback e
 * diagnóstico na resposta. Mesmo handler do /api/fiscal/parse-xml.
 */

import { handleNfeUpload } from "@/lib/fiscal/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleNfeUpload;
