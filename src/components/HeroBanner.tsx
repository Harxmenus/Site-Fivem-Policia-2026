import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import type { HistoryConfig } from '../types';

interface HeroBannerProps {
  history: HistoryConfig;
  onNavigate?: (path: string) => void;
  preview?: boolean;
}

type BannerFit = 'cover' | 'contain';
type LoadState = 'loading' | 'loaded' | 'error';

function computeFit(
  configFit: string | undefined,
  w: number,
  h: number
): BannerFit {
  if (!configFit || configFit === 'auto') {
    const aspect = w / h;
    if (aspect > 1.6) return 'contain';
    if (aspect < 0.8) return 'contain';
    return 'cover';
  }
  return configFit as BannerFit;
}

function computePosition(h: string | undefined, v: string | undefined): string {
  const x = h || 'center';
  const y = v || 'center';
  return `${x} ${y}`;
}

const RESPONSIVE_HEIGHTS = 'min-h-[420px] sm:min-h-[500px] md:min-h-[560px] lg:min-h-[650px] xl:min-h-[700px]';

export default function HeroBanner({ history, onNavigate }: HeroBannerProps) {
  const [loadState, setLoadState] = useState<LoadState>('loaded');
  const [imgNatural, setImgNatural] = useState({ w: 1920, h: 800 });
  const [fitMode, setFitMode] = useState<BannerFit>('cover');
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevUrlRef = useRef(history.bannerUrl);

  const aspectRatio = useMemo(() => {
    if (imgNatural.h === 0) return 2.4;
    return imgNatural.w / imgNatural.h;
  }, [imgNatural]);

  // Load image in background — never flash the skeleton on mount,
  // only show it briefly when the URL actually changes.
  useEffect(() => {
    const isNewUrl = history.bannerUrl !== prevUrlRef.current;
    prevUrlRef.current = history.bannerUrl;

    if (isNewUrl) {
      setLoadState('loading');
      setImgLoaded(false);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImgNatural({ w, h });
      setFitMode(computeFit(history.bannerFit, w, h));
      setLoadState('loaded');
      setImgLoaded(true);
    };

    img.onerror = () => {
      setLoadState('error');
      setFitMode(history.bannerFit === 'contain' ? 'contain' : 'cover');
      setImgLoaded(true);
    };

    img.src = history.bannerUrl;
  }, [history.bannerUrl]);

  // Recompute fit when config changes (without re-loading the image)
  useEffect(() => {
    if (loadState === 'loaded') {
      setFitMode(computeFit(history.bannerFit, imgNatural.w, imgNatural.h));
    }
  }, [history.bannerFit, loadState]);

  const pos = useMemo(
    () => computePosition(history.bannerPositionH, history.bannerPositionV),
    [history.bannerPositionH, history.bannerPositionV]
  );

  const adminHeight = history.bannerHeight;
  const useAdminHeight = adminHeight && adminHeight >= 30 && adminHeight <= 120;
  const isContain = fitMode === 'contain';

  // Overlay darkness
  const overlayOpacity = history.bannerOverlay ?? 60;
  const overlayAlpha = Math.max(0, Math.min(100, overlayOpacity)) / 100;

  // Blur intensity
  const blurPx = history.bannerBlur ?? 32;
  const blurAmount = isContain ? Math.max(0, blurPx) : 0;

  return (
    <section
      className={`relative rounded-[2rem] overflow-hidden border border-slate-900 shadow-2xl w-full ${useAdminHeight ? '' : RESPONSIVE_HEIGHTS}`}
      style={useAdminHeight ? { minHeight: `${adminHeight}vh` } : undefined}
    >
      {/* Skeleton loader */}
      {loadState === 'loading' && (
        <div className={`w-full image-skeleton ${RESPONSIVE_HEIGHTS}`} />
      )}

      {loadState !== 'loading' && (
        <>
          {/* Blurred background for contain mode */}
          <div
            className="absolute inset-0 z-0 bg-slate-950"
            style={{
              backgroundImage: `url(${history.bannerUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: pos,
              filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
              opacity: isContain ? 0.5 : 0,
              transform: isContain ? 'scale(1.15)' : 'none',
              transition: 'opacity 0.5s ease, filter 0.5s ease',
            }}
          />

          {/* Gradient overlay — uses the admin darkness setting */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background: `linear-gradient(to top, rgba(2,6,23,${overlayAlpha}) 0%, rgba(2,6,23,${overlayAlpha * 0.5}) 40%, transparent 100%)`,
            }}
          />
          <div
            className="absolute left-0 top-0 h-full w-full z-[1] pointer-events-none"
            style={{
              background: `linear-gradient(to right, rgba(2,6,23,${Math.min(1, overlayAlpha + 0.3)}) 0%, rgba(2,6,23,${overlayAlpha * 0.2}) 50%, transparent 100%)`,
            }}
          />

          {/* Main image */}
          <div className="absolute inset-0 z-[1] flex items-center justify-center">
            <img
              src={history.bannerUrl}
              alt="GTO banner"
              className={`w-full h-full transition-all duration-700 ease-out ${
                imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{
                objectFit: fitMode,
                objectPosition: pos,
                maxHeight: '100%',
              }}
            />
          </div>
        </>
      )}

      {/* Content — only shown in non-preview mode */}
      <div className={`relative z-10 ${RESPONSIVE_HEIGHTS} flex flex-col`}>
        <div className="flex-1 px-6 md:px-12 pt-14 pb-4 flex flex-col justify-start">
          <div className="max-w-3xl space-y-4">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase font-bold font-mono tracking-[0.35em] bg-red-600/90 text-white rounded-full shadow-lg shadow-red-950/20 w-fit"
            >
              UNIDADE TÁTICA DE PRONTO EMPREGO
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[0.95]"
            >
              {history.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-red-500 font-mono text-xs md:text-sm font-bold tracking-widest uppercase"
            >
              {history.subtitle}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="px-6 md:px-12 pb-8 flex justify-center"
        >
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate?.('/processo-seletivo')}
              className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-3xl transition-all shadow-lg shadow-red-950/35 flex items-center gap-2 cursor-pointer"
            >
              Processo Seletivo <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onNavigate?.('/historia')}
              className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-3xl transition-all shadow-sm border border-slate-800 flex items-center gap-2 cursor-pointer"
            >
              Nossa História
            </button>
          </div>
        </motion.div>
      </div>

      {/* Loading shimmer */}
      {!imgLoaded && loadState !== 'loading' && (
        <div className="absolute inset-0 z-20 image-skeleton" />
      )}
    </section>
  );
}
