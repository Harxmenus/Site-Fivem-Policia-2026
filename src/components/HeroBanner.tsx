import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, ChevronRight, Activity, Target, BarChart3 } from 'lucide-react';
import type { HistoryConfig } from '../types';

interface HeroBannerProps {
  history: HistoryConfig;
  onNavigate: (path: string) => void;
}

type LoadState = 'loading' | 'loaded' | 'error';

function resolveFit(
  configFit: string | undefined,
  imgWidth: number,
  imgHeight: number
): 'cover' | 'contain' {
  if (configFit && configFit !== 'auto') return configFit as 'cover' | 'contain';
  const aspect = imgWidth / imgHeight;
  if (aspect > 1.8) return 'contain';
  if (aspect < 0.8) return 'contain';
  return 'cover';
}

function resolvePosition(configPos: string | undefined): string {
  if (configPos) return configPos;
  return 'center center';
}

function resolveHeight(configHeight: number | undefined): string {
  if (configHeight && configHeight >= 30 && configHeight <= 120) {
    return `${configHeight}vh`;
  }
  return 'auto';
}

export default function HeroBanner({ history, onNavigate }: HeroBannerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setLoadState('loading');
    setImgLoaded(false);
    setImgNatural({ w: 0, h: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImgNatural({ w, h });
      setFitMode(resolveFit(history.bannerFit, w, h));
      setLoadState('loaded');
      setImgLoaded(true);
    };

    img.onerror = () => {
      setLoadState('error');
      setFitMode(history.bannerFit === 'contain' ? 'contain' : 'cover');
    };

    img.src = history.bannerUrl;
  }, [history.bannerUrl, history.bannerFit]);

  const pos = resolvePosition(history.bannerPosition);
  const height = resolveHeight(history.bannerHeight);
  const isContain = fitMode === 'contain';

  return (
    <section
      className="relative rounded-[2rem] overflow-hidden border border-slate-900 shadow-2xl w-full"
      style={{ minHeight: height !== 'auto' ? height : undefined }}
    >
      {loadState === 'loading' && (
        <div className="w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[550px] image-skeleton" />
      )}

      {loadState !== 'loading' && (
        <>
          {/* Blurred background layer — always cover to fill space */}
          <div
            className="absolute inset-0 z-0 bg-slate-950"
            style={{
              backgroundImage: loadState === 'loaded' ? `url(${history.bannerUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: pos,
              filter: isContain ? 'blur(32px)' : 'none',
              opacity: isContain ? 0.4 : 0,
              transform: isContain ? 'scale(1.2)' : 'none',
              transition: 'opacity 0.6s ease, filter 0.6s ease',
            }}
          />

          {/* Dark gradient overlays */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute left-0 top-0 h-full w-full z-[1] bg-gradient-to-r from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none" />

          {/* Main image */}
          <div
            className="absolute inset-0 z-[1] flex items-center justify-center"
            style={{ minHeight: 'inherit' }}
          >
            <img
              ref={imgRef}
              src={history.bannerUrl}
              alt="GTO banner"
              onLoad={() => {}}
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

      {/* Content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.9fr_1.1fr] min-h-[400px] sm:min-h-[500px] lg:min-h-[550px]">
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
              onClick={() => onNavigate('/processo-seletivo')}
              className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-3xl transition-all shadow-lg shadow-red-950/35 flex items-center gap-2 cursor-pointer"
            >
              Processo Seletivo <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('/historia')}
              className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-3xl transition-all shadow-sm border border-slate-800 flex items-center gap-2 cursor-pointer"
            >
              Nossa História
            </button>
          </motion.div>
        </div>

        {/* Right side: mission cards */}
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

      {/* Loading shimmer overlay */}
      {!imgLoaded && loadState !== 'loading' && (
        <div className="absolute inset-0 z-20 image-skeleton" />
      )}
    </section>
  );
}
