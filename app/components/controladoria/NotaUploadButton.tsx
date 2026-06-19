"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import NotaUploadModal from "./NotaUploadModal";

/**
 * Botão "Subir NF-e" que controla a abertura do modal multi-modo.
 * Isolado para manter o page server-side e o modal client-side.
 */
export default function NotaUploadButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ag-button-primary inline-flex items-center gap-2"
      >
        <Upload size={15} />
        Subir NF-e
      </button>
      <NotaUploadModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
