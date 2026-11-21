import { useState } from 'react';

/**
 * Imagen del evento. Si no hay URL o no carga, muestra un afiche tipográfico
 * con el título, para que la cartelera nunca tenga huecos.
 */
export function Poster({ src, title, className = '' }: { src: string | null; title: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || src === failedSrc) {
    return (
      <div className={`poster poster--fallback ${className}`} aria-hidden="true">
        <span>{title}</span>
      </div>
    );
  }
  return (
    <img
      className={`poster ${className}`}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}
