import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, ChevronRight, Activity, Target, BarChart3 } from 'lucide-react';
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
      <div className={`relative z-10 grid grid-cols-1 lg:grid-cols-[1.9fr_1.1fr] ${RESPONSIVE_HEIGHTS}`}>
        <div className="px-6 md:px-12 py-10 flex flex-col justify-center gap-5">
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
            className="text-4xl md:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[0.95] max-w-3xl"
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

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="border-l-4 border-red-600 pl-4 py-3 bg-slate-950/45 backdrop-blur-sm rounded-r-2xl pr-4 max-w-xl"
          >
            <p className="font-mono text-base md:text-lg font-black text-red-500 tracking-wider animate-pulse italic uppercase">
              "Hope, senhores. Hope, pra cima."
            </p>
            <p className="text-[10px] text-slate-300 font-mono uppercase tracking-widest mt-1">
              União • Honra • Disciplina
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl"
          >
            Força especializada e ostensiva de choque destinada ao reestabelecimento da ordem
            pública, controle tático de distúrbios, combate urbano (CQB) e missões especiais de
            altíssimo risco.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap gap-3 pt-2"
          >
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
          </motion.div>
        </div>

        {/* Right side — mission cards */}
        <div className="px-6 md:px-10 py-10 flex flex-col justify-between gap-6 bg-slate-950/70 backdrop-blur-xl lg:border-l lg:border-slate-900/60">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-red-700/20 text-red-300 text-[11px] font-semibold uppercase tracking-wider">
              <Shield size={14} /> Missão Tática
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
              Resiliência operacional. Presença imediata.
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              A unidade mantém vigilância permanente no território, pronta para missões de choque,
              controle de distúrbios e suporte estratégico em todo o cenário urbano.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-4 shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                    Operações ativas
                  </p>
                  <p className="mt-2 text-white font-black">Choque e controle</p>
                </div>
                <Activity className="text-red-400" size={24} />
              </div>
              <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                Incursões de rápida resposta com presença tática e controle especializado de distúrbios.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-4 shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                    Combate Urbano
                  </p>
                  <p className="mt-2 text-white font-black">CQB e patrulhamento</p>
                </div>
                <Target className="text-red-400" size={24} />
              </div>
              <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                Mobilidade e precisão em ambientes fechados e operações de alto risco.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-4 shadow-lg shadow-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                    Inteligência tática
                  </p>
                  <p className="mt-2 text-white font-black">Análise e decisão</p>
                </div>
                <BarChart3 className="text-red-400" size={24} />
              </div>
              <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                Decisões rápidas com base em inteligência de campo, rota de ação e contenção.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading shimmer */}
      {!imgLoaded && loadState !== 'loading' && (
        <div className="absolute inset-0 z-20 image-skeleton" />
      )}
    </section>
  );
}
