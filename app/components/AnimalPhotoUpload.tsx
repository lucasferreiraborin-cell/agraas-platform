"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Camera, X, Upload, Loader2 } from "lucide-react";

type Photo = {
  id: string;
  storage_path: string;
  file_name: string;
  url?: string;
};

interface Props {
  animalId: string;
  clientId: string;
  initialPhotos: Photo[];
}

const MAX_PHOTOS = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AnimalPhotoUpload({ animalId, clientId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");

    if (photos.length >= MAX_PHOTOS) {
      setError(`Máximo de ${MAX_PHOTOS} fotos por animal.`);
      return;
    }

    const file = files[0];
    if (!ALLOWED.includes(file.type)) {
      setError("Formato não suportado. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Arquivo muito grande. Máximo 5 MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${clientId}/${animalId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("animal-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      setError("Erro no upload. Tente novamente.");
      setUploading(false);
      return;
    }

    const { data: row, error: insertError } = await supabase
      .from("animal_photos")
      .insert({
        animal_id: animalId,
        client_id: clientId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
      })
      .select("id, storage_path, file_name")
      .single();

    if (insertError || !row) {
      setError("Erro ao salvar referência da foto.");
      setUploading(false);
      return;
    }

    const { data: signedData } = await supabase.storage
      .from("animal-photos")
      .createSignedUrl(storagePath, 3600);

    setPhotos((prev) => [...prev, { ...row, url: signedData?.signedUrl ?? "" }]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(photo: Photo) {
    await supabase.storage.from("animal-photos").remove([photo.storage_path]);
    await supabase.from("animal_photos").delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-[var(--primary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Fotos do Animal</h3>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{photos.length}/{MAX_PHOTOS}</span>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
                  onClick={() => setLightbox(photo.url ?? null)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                  {photo.file_name}
                </div>
              )}
              <button
                onClick={() => handleDelete(photo)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                title="Remover foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {photos.length < MAX_PHOTOS && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-8 transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          ) : (
            <Upload size={24} className="text-[var(--text-muted)]" />
          )}
          <p className="text-sm text-[var(--text-muted)]">
            {uploading ? "Enviando..." : "Arraste ou clique para adicionar foto"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">JPEG, PNG ou WebP · Máx. 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error && <div className="ag-form-error">{error}</div>}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Foto do animal"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
