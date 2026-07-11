import { useState, useEffect, useCallback, type CSSProperties } from 'react';

const FALLBACK_URL = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">' +
  '<rect fill="#0f172a" width="800" height="450"/>' +
  '<text fill="#334155" font-family="monospace" font-size="16" text-anchor="middle" x="400" y="225">Imagem indisponível</text>' +
  '</svg>'
);

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  aspectRatio?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  hero?: boolean;
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  aspectRatio = 'auto',
  loading = 'lazy',
  objectFit,
  objectPosition,
  hero,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Sync when the src prop changes (e.g. user types new URL in admin panel)
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setLoaded(false);
  }, [src]);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(FALLBACK_URL);
      setLoaded(true);
    }
  }, [hasError]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const fitStyle = objectFit ? { objectFit } as CSSProperties : undefined;

  if (hero) {
    return (
      <div className={`${wrapperClassName}`} style={{ aspectRatio }}>
        {!loaded && <div className="absolute inset-0 image-skeleton" />}
        <img
          src={imgSrc}
          alt={alt}
          loading={loading}
          onError={handleError}
          onLoad={handleLoad}
          className={`${className} ${loaded ? 'img-enter' : 'opacity-0'}`}
          style={fitStyle}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName} ${!loaded ? 'image-skeleton' : ''}`} style={{ aspectRatio }}>
      <img
        src={imgSrc}
        alt={alt}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
        className={`${className} ${loaded ? 'img-enter' : 'opacity-0'}`}
        style={fitStyle}
      />
    </div>
  );
}
