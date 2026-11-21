import { useEffect, useRef, useState } from 'react';

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

export function isCameraScannerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    'BarcodeDetector' in window
  );
}

export function CameraScanner({
  active,
  onDetected,
  onClose,
}: {
  active: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!active) return;

    if (!isCameraScannerSupported()) {
      setCameraError(
        'Este navegador no soporta lectura QR nativa por cámara. Usa un lector USB o escribe el código manualmente.',
      );
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    async function start() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const codes = await detector.detect(videoRef.current);
              const value = codes[0]?.rawValue?.trim();
              if (value) {
                const now = Date.now();
                const isSameQuickRepeat =
                  lastScanRef.current.code === value && now - lastScanRef.current.at < 2500;
                if (!isSameQuickRepeat) {
                  lastScanRef.current = { code: value, at: now };
                  onDetectedRef.current(value);
                }
              }
            } catch {
              /* frame sin código legible; continúa el escaneo */
            }
          }
          if (!cancelled) timer = window.setTimeout(tick, 250);
        };

        timer = window.setTimeout(tick, 300);
      } catch {
        if (!cancelled) {
          setCameraError('No se pudo acceder a la cámara. Verifica los permisos o usa el lector manual.');
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="checkin-camera">
      <div className="checkin-camera__head">
        <span>Escáner con cámara</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          Cerrar cámara
        </button>
      </div>
      {cameraError ? (
        <p className="form-error" role="alert">
          {cameraError}
        </p>
      ) : (
        <video ref={videoRef} className="checkin-camera__video" muted playsInline />
      )}
    </div>
  );
}
