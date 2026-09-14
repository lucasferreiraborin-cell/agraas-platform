/**
 * POST /api/fiscal/parse-xml — upload de NF-e (XML ou PDF) do produtor.
 *
 * A lógica inteira vive em lib/fiscal/ingest.ts e é a mesma das rotas da
 * controladoria. Esta rota só existe para manter a URL que o FiscalUpload
 * chama desde o início.
 */

import { handleNfeUpload } from "@/lib/fiscal/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleNfeUpload;
