/**
 * POST /api/controladoria/notas/upload-xml — modo "XML da NF-e" do modal da
 * controladoria. Mesmo handler do /api/fiscal/parse-xml (lib/fiscal/ingest.ts).
 * Até 14/09/2026 esta rota não existia e o modal descartava o arquivo.
 */

import { handleNfeUpload } from "@/lib/fiscal/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleNfeUpload;
