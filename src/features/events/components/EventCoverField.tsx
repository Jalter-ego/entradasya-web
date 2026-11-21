import { useEffect, useRef, useState } from 'react';

export const isManagedCover = (url: string) => /^\/api\/events\/covers\/[0-9a-f-]+\.(jpg|png|webp)$/.test(url);

export function coverFileError(file: File | null): string | null {
  if (!file) return null;
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > 3 * 1024 * 1024) return 'La imagen no debe superar 3 MB.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Elige una imagen JPEG, PNG o WebP.';
  return null;
}

interface Props {
  imageUrl: string;
  file: File | null;
  error?: string;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
}

export function EventCoverField({ imageUrl, file, error, onUrlChange, onFileChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileError = coverFileError(file);
  useEffect(() => {
    if (!file || coverFileError(file)) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (!file && input.current) input.current.value = ''; }, [file]);
  const src = preview || imageUrl;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <div className="event-cover">
      <label className="field">
        <span className="field__label">Portada del evento</span>
        <input ref={input} className="input event-cover__input" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} aria-describedby="cover-help cover-error" />
        <span id="cover-help" className="field__hint">Opcional · JPEG, PNG o WebP · Hasta 3 MB. Recomendamos formato horizontal (16:9).</span>
      </label>
      {(fileError || error) && <p id="cover-error" className="field__error" role="alert">{fileError || error}</p>}
      {src && src !== failedSrc && <img className="event-cover__preview" src={src} alt="Vista previa de la portada"
        onError={() => setFailedSrc(src)} />}
      {src && src === failedSrc && <p className="field__hint">No se pudo mostrar la imagen. Selecciona otra portada.</p>}
      {file && !fileError && <p className="field__hint">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB · Se subirá al guardar.</p>}
      <div className="event-cover__actions">
        {file && <button type="button" className="btn btn--secondary" onClick={() => onFileChange(null)}>Descartar archivo</button>}
        {imageUrl && <button type="button" className="btn btn--danger-ghost" onClick={() => { onFileChange(null); onUrlChange(''); }}>Quitar portada</button>}
      </div>
      <details className="event-cover__link">
        <summary>Usar un enlace de imagen</summary>
        <label className="field">
          <span className="field__label">Enlace de la portada</span>
          <input className="input" type="url" inputMode="url" value={isManagedCover(imageUrl) ? '' : imageUrl}
            disabled={Boolean(file)} placeholder="https://" maxLength={2000} onChange={(e) => onUrlChange(e.target.value)} />
          {isManagedCover(imageUrl) && <span className="field__hint">Ya hay una imagen subida. Escribe un enlace para reemplazarla.</span>}
        </label>
      </details>
    </div>
  );
}
