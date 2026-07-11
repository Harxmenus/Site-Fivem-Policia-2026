import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  History,
  BarChart3,
  Image as ImageIcon,
  Users,
  ChevronRight,
  ChevronLeft,
  Lock,
  Key,
  Eye,
  EyeOff,
  LogOut,
  Award,
  Heart,
  Target,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Menu,
  X,
  Activity,
  Folder,
  Star,
} from 'lucide-react';

import { PortalData } from './types';
import IconRenderer from './components/IconRenderer';
import ImageWithFallback from './components/ImageWithFallback';
import SelectionProcess from './components/SelectionProcess';
import AdminPanel from './components/AdminPanel';
import HeroBanner from './components/HeroBanner';
import Toast from './components/Toast';

export default function App() {
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Session State
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Lightbox State for Gallery
  const [lightboxImg, setLightboxImg] = useState<{
    url: string;
    caption: string;
    description?: string;
  } | null>(null);

  // Gallery Selected Category
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('Todas');
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [galleryLimit, setGalleryLimit] = useState<number>(12);

  const filteredGallery = useMemo(() => {
    if (!portalData) return [];
    if (selectedGalleryCategory === 'Todas') return portalData.gallery;
    return portalData.gallery.filter(
      (item) => (item.category || 'Patrulhamento') === selectedGalleryCategory
    );
  }, [portalData, selectedGalleryCategory]);

  const lightboxGalleryIndex = useMemo(() => {
    if (!lightboxImg) return -1;
    return (portalData?.gallery || []).findIndex((item) => item.url === lightboxImg.url);
  }, [lightboxImg, portalData]);

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!portalData) return;
    const gallery = portalData.gallery;
    const currentIdx = lightboxGalleryIndex;
    if (currentIdx === -1) return;
    const nextIdx = direction === 'next'
      ? (currentIdx + 1) % gallery.length
      : (currentIdx - 1 + gallery.length) % gallery.length;
    const nextItem = gallery[nextIdx];
    if (nextItem) {
      setLightboxImg({
        url: nextItem.url,
        caption: nextItem.caption,
        description: nextItem.description,
      });
    }
  };

  // Fetch Portal content
  const fetchPortalData = async () => {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch /api/content:', response.status, errorText);
        throw new Error('Não foi possível carregar as informações do portal.');
      }
      const data = await response.json();
      setPortalData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Direct update from POST response (avoids Blob read-after-write staleness)
  const updatePortalData = (data: PortalData) => {
    setPortalData(data);
  };

  useEffect(() => {
    fetchPortalData();

    // Restore admin session — but validate the stored token first.
    // If the server was restarted (new token) the old token becomes invalid;
    // detecting this here prevents "sessão expirada" errors mid-use (e.g. banner URL save).
    const storedToken = localStorage.getItem('gto_admin_token');
    if (storedToken) {
      // Quick validation: POST /api/content with only the token — a 401 means it's stale.
      fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        // Send empty body — the endpoint will merge it with current data, no harm done.
        body: JSON.stringify({}),
      }).then((res) => {
        if (res.ok || res.status !== 401) {
          // Token is still valid — restore the session.
          setAdminToken(storedToken);
        } else {
          // Token was rejected (server restarted / old fake token) — clear it.
          localStorage.removeItem('gto_admin_token');
        }
      }).catch(() => {
        // Network error during validation — restore optimistically (the request will fail
        // visibly if the token is actually invalid).
        setAdminToken(storedToken);
      });
    }

    // Set page path based on initial load
    setCurrentPath(window.location.pathname);
  }, []);

  // Lightbox keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxImg) return;
      if (e.key === 'Escape') { e.preventDefault(); setLightboxImg(null); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateLightbox('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateLightbox('next'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImg]);

  // Monitor routing changes
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    setMobileMenuOpen(false);
    setActiveAlbum(null); // Reset active album
    setGalleryLimit(8); // Reset gallery limit
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setActiveAlbum(null); // Reset active album
      setGalleryLimit(8); // Reset gallery limit
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Acesso negado.');
      }

      const data = await response.json();
      setAdminToken(data.token);
      localStorage.setItem('gto_admin_token', data.token);
      setUsername('');
      setPassword('');
      navigateTo('/admin');
    } catch (err: any) {
      setLoginError(err.message || 'Erro de autenticação.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('gto_admin_token');
    navigateTo('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="text-red-500 animate-spin w-12 h-12" />
        <p className="text-sm font-mono tracking-widest text-slate-400">
          CARREGANDO PORTAL TÁTICO...
        </p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <AlertCircle className="text-red-500 w-14 h-14" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Falha Operacional</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">
          {error ||
            'Não conseguimos carregar a base de dados do Portal GTO no momento. Certifique-se de que o servidor está rodando taticamente.'}
        </p>
        <button
          onClick={() => {
            setLoading(true);
            fetchPortalData();
          }}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          REENTRAR EM FREQUÊNCIA
        </button>
      </div>
    );
  }

  // Active path logic helper (e.g. "/" or "/inicio")
  const isPathActive = (paths: string[]) => {
    return paths.includes(currentPath);
  };

  const currentDiscordUrl = portalData.discordUrl?.trim() || 'https://discord.gg/EwR6fKMYk';
  const currentTiktokUrl =
    portalData.tiktokUrl?.trim() || 'https://www.tiktok.com/@zepancadaoficial';

  // Static list of notable GTO operations to render on the Home tab
  const staticOperations = [
    {
      id: 'op-1',
      name: 'Operação Saturação Vermelha',
      date: '15 Junho 2026',
      location: 'Área Rural de Paleto Bay',
      status: 'Concluída',
      description:
        'Intervenção tática preventiva em zona de mata fechada com apreensão de carregamento pesado e desarticulação de abrigo hostil clandestino.',
      tag: 'Choque',
    },
    {
      id: 'op-2',
      name: 'Operação Choque Tático',
      date: '22 Junho 2026',
      location: 'Setor Central de Los Santos',
      status: 'Concluída',
      description:
        'Controle tático de aglomerações e reestabelecimento total da ordem pública urbana em área de altíssima densidade demográfica.',
      tag: 'Ordem Pública',
    },
    {
      id: 'op-3',
      name: 'Operação Sentinela',
      date: '28 Junho 2026',
      location: ' Sandy Shores Divisas',
      status: 'Ativa',
      description:
        'Cerco estratégico em rotas de fuga intermunicipais e patrulhamento rural ostensivo contínuo para coibir infiltração de ilícitos na cidade.',
      tag: 'Patrulhamento',
    },
  ];

  const galleryCategories = [
    'Operações',
    'Patrulhamento',
    'Abordagens',
    'Certificados',
    'Apreensões',
  ];

  const albumDetails: {
    [key: string]: { icon: any; title: string; desc: string; detailDesc: string };
  } = {
    Patrulhamento: {
      icon: Shield,
      title: 'Patrulhamento Tático',
      desc: 'Rondas ostensivas urbanas, rurais e policiamento tático de divisas.',
      detailDesc:
        'Coletânea de registros operacionais de patrulhas ostensivas urbanas e rurais, abordagens preventivas e policiamento ostensivo em rotas de divisas realizados pelas fardas pretas do GTO.',
    },
    Certificados: {
      icon: Award,
      title: 'Certificados & Especializações',
      desc: 'Registros oficiais de cursos, promoções e honrarias de excelência.',
      detailDesc:
        'Documentação oficial de progressões de patentes, certificados de cursos de especialização tática (CQB, Sniper, Negociação de Crises) e diplomas de honra e destaque operacional.',
    },
    Operações: {
      icon: Activity,
      title: 'Grandes Operações',
      desc: 'Intervenções táticas de alto risco e reestabelecimento da ordem pública.',
      detailDesc:
        'Registro fotográfico das maiores incursões operacionais, cercos estratégicos, operações de choque, controle de distúrbios civis e missões táticas especiais de combate urbano de alta periculosidade.',
    },
    Abordagens: {
      icon: Users,
      title: 'Abordagens Operacionais',
      desc: 'Procedimentos didáticos, vistorias e revistas táticas de alta precisão.',
      detailDesc:
        'Registros didáticos e operacionais de incursões em vias públicas, abordagens veiculares e revistas táticas de alta precisão, visando a aplicação técnica e rigorosa dos protocolos táticos.',
    },
    Apreensões: {
      icon: Folder,
      title: 'Apreensões & Resultados',
      desc: 'Materiais apreendidos e desarticulação financeira do crime organizado.',
      detailDesc:
        'Documentação material do resultado das incursões de combate a ilícitos, repressão ao contrabando e apreensão de armamentos e substâncias proibidas em prol da ordem urbana.',
    },
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col relative`}
    >
      {/* Dynamic Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />

      {/* HEADER */}
      <Header
        currentPath={currentPath}
        navigateTo={navigateTo}
        adminToken={adminToken}
        handleLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        discordUrl={portalData.discordUrl || ''}
        tiktokUrl={portalData.tiktokUrl || ''}
        portalName={portalData.portalName || 'GTO Tático'}
        portalLogo={portalData.portalLogo || ''}
      />

      {/* CORE WRAPPER */}
      <main className="flex-grow z-10 relative px-4 sm:px-6 lg:px-8 py-8">
        {/* VIEW A: ADMIN PANEL (Requires token) */}
        {isPathActive(['/admin']) && adminToken ? (
          <AdminPanel
            token={adminToken}
            onLogout={handleLogout}
            onRefreshData={fetchPortalData}
            portalData={portalData}
            onPortalDataUpdated={updatePortalData}
          />
        ) : isPathActive(['/admin']) ? (
          /* Dedicated Admin Login Card Page (Instead of modal) */
          <div className="max-w-md mx-auto py-16 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative p-8"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-amber-600" />

              <div className="text-center space-y-2 mb-8">
                <div className="mx-auto w-12 h-12 bg-red-950/40 border border-red-900/40 text-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Lock size={22} className="text-red-500" />
                </div>
                <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">
                  Acesso Operacional
                </h3>
                <p className="text-xs text-slate-400">
                  Insira as credenciais administrativas para gerenciar o Portal GTO.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {loginError && (
                  <div className="bg-red-950/40 border border-red-900 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Usuário de Acesso
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Ex: admin"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-red-500 rounded-xl px-4.5 py-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Senha Tática
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-red-500 rounded-xl pl-4.5 pr-12 py-3 text-xs text-white focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3.5 mt-2 shadow-lg shadow-red-950/25 border border-red-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Verificando...
                    </>
                  ) : (
                    <>
                      <Key size={13} /> Autenticar Assinatura
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        ) : (
          /* VIEW B: PUBLIC SECTIONS ROUTING */
          <div className="max-w-7xl mx-auto">
            {/* 1. HOME PAGE ROUTE */}
            {isPathActive(['/', '/inicio']) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Hero Banner Section */}
                <HeroBanner history={portalData.history} onNavigate={navigateTo} />

                {/* Missão Tática Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 shadow-lg shadow-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                          Operações ativas
                        </p>
                        <p className="mt-2 text-white font-black">Choque e controle</p>
                      </div>
                      <Activity className="text-red-400 shrink-0" size={24} />
                    </div>
                    <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                      Incursões de rápida resposta com presença tática e controle especializado de distúrbios.
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 shadow-lg shadow-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                          Combate Urbano
                        </p>
                        <p className="mt-2 text-white font-black">CQB e patrulhamento</p>
                      </div>
                      <Target className="text-red-400 shrink-0" size={24} />
                    </div>
                    <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                      Mobilidade e precisão em ambientes fechados e operações de alto risco.
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 shadow-lg shadow-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">
                          Inteligência tática
                        </p>
                        <p className="mt-2 text-white font-black">Análise e decisão</p>
                      </div>
                      <BarChart3 className="text-red-400 shrink-0" size={24} />
                    </div>
                    <p className="mt-3 text-slate-400 text-xs leading-relaxed">
                      Decisões rápidas com base em inteligência de campo, rota de ação e contenção.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. HISTORIA PAGE ROUTE */}
            {isPathActive(['/historia']) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-12"
              >
                {/* Header Section */}
                <div className="border-b border-slate-900 pb-6 space-y-2 relative">
                  <span className="text-[10px] font-bold font-mono text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                    <History size={14} className="animate-spin-slow" /> DOUTRINA E HISTÓRIA
                    REGISTRADA
                  </span>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-white uppercase font-sans">
                        Histórico Institucional
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Uma trajetória baseada em lealdade, disciplina tática e busca incessante
                        pela ordem.
                      </p>
                    </div>
                    {/* Tactical Stamp */}
                    <div className="self-start md:self-auto border border-dashed border-red-500/40 bg-red-950/10 text-red-500 rounded px-3 py-1 text-[10px] font-mono font-bold tracking-widest uppercase">
                      Documento Oficial GTO • Classificado
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Side: The Main History Dossier */}
                  <motion.div
                    whileHover={{ y: -4, border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    transition={{ duration: 0.2 }}
                    className="lg:col-span-8 bg-slate-900/10 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden group shadow-2xl"
                  >
                    {/* Technical subtle corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-600/50" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-600/50" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-600/50" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-600/50" />

                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2 text-red-500 font-mono text-xs font-bold uppercase tracking-widest">
                        <Star size={14} className="fill-red-500 text-red-500" />
                        <span>MEMÓRIA OPERACIONAL</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">
                        REF: HIST_GTO_2026
                      </span>
                    </div>

                    <p className="text-slate-300 text-sm md:text-base leading-relaxed text-justify whitespace-pre-line leading-loose">
                      {portalData.history.content}
                    </p>

                    <div className="pt-4 border-t border-slate-900 flex flex-wrap gap-4 text-[10px] font-mono text-slate-500 uppercase">
                      <div>
                        <span className="text-slate-400 font-bold">Autoridade:</span> Comando Geral
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">Estado:</span> Homologado
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">Acesso:</span> Público
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Side: Quick info & Image */}
                  <div className="lg:col-span-4 space-y-6">
                    {portalData.history.about && (
                      <motion.div
                        whileHover={{ y: -4, border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900/30 border border-slate-850 p-6 rounded-3xl space-y-4 shadow-lg relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-950/40 rounded-xl border border-red-900/30 flex items-center justify-center text-red-500 shadow-md">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-red-400 block tracking-widest font-bold uppercase">
                              DIRETRIZ
                            </span>
                            <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">
                              Sobre o Grupo
                            </h4>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line text-justify leading-relaxed">
                          {portalData.history.about}
                        </p>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="relative group rounded-3xl overflow-hidden border border-slate-900 shadow-xl aspect-video md:aspect-auto md:h-[220px]"
                    >
                      <ImageWithFallback
                        src={portalData.history.bannerUrl}
                        alt="GTO Operator"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5">
                        <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-widest block">
                          LEALDADE • HONRA • DISCIPLINA
                        </span>
                        <p className="text-white font-extrabold text-xs mt-0.5">
                          Prontidão permanente para qualquer chamado tático operacional.
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Fotos Históricas Section */}
                <section className="space-y-6">
                  <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-red-500" />
                      <h4 className="text-sm font-extrabold uppercase text-white tracking-wider">
                        Registros Históricos Marcantes
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      3 Primeiras do Acervo
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {portalData.gallery.slice(0, 3).map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.04, y: -5, transition: { duration: 0.2 } }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setLightboxImg({ url: item.url, caption: item.caption })}
                        className="group bg-slate-900/40 border border-slate-900 hover:border-red-500/30 rounded-2xl overflow-hidden cursor-pointer transition-all relative shadow-lg"
                      >
                        {/* Custom Badge Icon Overlay */}
                        <div className="absolute top-2.5 right-2.5 z-10 bg-slate-950/80 backdrop-blur-md border border-red-500/30 text-red-500 p-1.5 rounded-xl shadow-lg flex items-center justify-center">
                          <IconRenderer name={item.badgeIcon || 'Shield'} size={12} />
                        </div>

                        <div className="aspect-[4/3] overflow-hidden bg-slate-950 relative">
                          <ImageWithFallback
                            src={item.url}
                            alt={item.caption}
                            wrapperClassName="w-full h-full"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <span className="text-[10px] font-mono text-red-400 font-bold bg-slate-950/90 border border-red-900/40 px-2.5 py-1 rounded">
                              Ampliar Registro +
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-950/10">
                          <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-1">
                            {item.caption}
                          </p>
                          <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                            {item.date}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Homenagem aos integrantes */}
                {portalData.history.homenagemText && (
                  <section className="bg-gradient-to-b from-slate-900/40 to-red-950/10 border border-slate-900 p-6 md:p-10 rounded-3xl space-y-8 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-slate-900/40 rounded-full blur-3xl pointer-events-none" />

                    <div className="text-center max-w-2xl mx-auto space-y-2 relative z-10">
                      <span className="text-[10px] font-bold font-mono text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <Heart size={14} className="fill-red-500 animate-pulse text-red-500" />{' '}
                        HOMENAGEM ESPECIAL
                      </span>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
                        Nossa Irmandade GTO
                      </h3>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                      <p className="text-slate-300 text-sm md:text-base leading-relaxed text-center text-justify md:text-center italic leading-relaxed">
                        "{portalData.history.homenagemText}"
                      </p>

                      {/* Highlighted Names Grid */}
                      {portalData.history.homenagemNames &&
                        portalData.history.homenagemNames.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-2.5 py-2">
                            {portalData.history.homenagemNames.map((name, index) => (
                              <div
                                key={index}
                                className="px-4 py-2 bg-slate-950/80 hover:bg-red-950/25 hover:border-red-600/50 border border-slate-850 hover:scale-[1.03] rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-2 shadow"
                              >
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="font-mono">{name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="pt-4 border-t border-slate-900 text-center">
                        <p className="font-mono text-base md:text-lg font-extrabold text-red-500 tracking-wider animate-pulse italic uppercase">
                          "Hope, senhores. Hope, pra cima."
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {/* 3. GALLERY PAGE ROUTE */}
            {isPathActive(['/galeria']) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-10"
              >
                {/* Header */}
                <div className="border-b border-slate-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold font-mono text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon size={14} /> MULTIMÍDIA INSTITUCIONAL
                    </span>
                    <h3 className="text-3xl font-black tracking-tight text-white uppercase font-sans">
                      Galeria de Operações GTO
                    </h3>
                    <p className="text-slate-400 text-xs">
                      Acervo fotográfico oficial e registros táticos auditados do fardamento preto.
                    </p>
                  </div>
                  <div className="border border-dashed border-red-500/30 bg-red-950/10 text-red-500 rounded-xl px-4 py-2 text-[10px] font-mono font-bold tracking-widest uppercase">
                    Arquivo Público Controlado
                  </div>
                </div>

                {/* Categories Filter Buttons */}
                <div className="flex flex-wrap gap-2.5 md:gap-3 justify-center md:justify-start">
                  {[
                    'Todas',
                    'Operações',
                    'Patrulhamento',
                    'Abordagens',
                    'Certificados',
                    'Apreensões',
                  ].map((cat) => {
                    const isActive = selectedGalleryCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedGalleryCategory(cat);
                          setGalleryLimit(12); // reset page limit to standard grid
                        }}
                        className={`px-4.5 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-2 ${
                          isActive
                            ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20 scale-[1.03]'
                            : 'bg-slate-900/40 text-slate-400 hover:text-white border-slate-900 hover:bg-slate-900/80'
                        }`}
                      >
                        {cat === 'Todas'
                          ? '🖼️'
                          : cat === 'Operações'
                            ? '🚨'
                            : cat === 'Patrulhamento'
                              ? '🛡️'
                              : cat === 'Abordagens'
                                ? '👥'
                                : cat === 'Certificados'
                                  ? '⭐'
                                  : '📦'}
                        <span>{cat}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? 'bg-red-700 text-white' : 'bg-slate-950/80 text-slate-500'}`}
                        >
                          {cat === 'Todas'
                            ? portalData.gallery.length
                            : portalData.gallery.filter((item) =>
                                (item.category || 'Patrulhamento').toLowerCase() === cat.toLowerCase()
                              ).length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Images Grid */}
                <div className="space-y-8">
                  {filteredGallery.length === 0 ? (
                    <div className="border border-dashed border-slate-900 rounded-3xl p-16 text-center max-w-lg mx-auto space-y-4 bg-slate-900/10">
                      <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
                        <Folder size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white uppercase">
                          Nenhum Registro
                        </h4>
                        <p className="text-slate-400 text-xs">
                          Nenhum registro fotográfico nesta categoria no momento.
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        Novas mídias podem ser enviadas e marcadas com esta categoria através do
                        painel de controle administrativo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      >
                        <AnimatePresence mode="popLayout">
                          {filteredGallery.slice(0, galleryLimit).map((item) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.92, y: 15 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: 15 }}
                              transition={{ duration: 0.3 }}
                              whileHover={{
                                scale: 1.04,
                                y: -6,
                                transition: { duration: 0.2, ease: 'easeInOut' },
                              }}
                              onClick={() =>
                                setLightboxImg({
                                  url: item.url,
                                  caption: item.caption,
                                  description: item.description,
                                })
                              }
                              className="group bg-slate-900/20 border border-slate-900 hover:border-red-500/30 rounded-3xl overflow-hidden shadow-lg cursor-pointer transition-all relative flex flex-col justify-between"
                            >
                              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                                <span className="px-2.5 py-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-300 rounded-xl text-[9px] font-mono font-bold uppercase tracking-wider">
                                  {item.category || 'Patrulhamento'}
                                </span>
                              </div>

                              <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md border border-red-500/30 text-red-500 p-1.5 rounded-xl shadow-lg flex items-center justify-center transition-all group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500">
                                <IconRenderer name={item.badgeIcon || 'Shield'} size={12} />
                              </div>

                              <div className="aspect-[4/3] overflow-hidden bg-slate-950 relative">
                                <ImageWithFallback
                                  src={item.url}
                                  alt={item.caption}
                                  wrapperClassName="w-full h-full"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                  <span className="text-[10px] font-mono text-red-400 font-bold bg-slate-950/95 border border-red-900/40 px-2.5 py-1 rounded">
                                    Ampliar Registro +
                                  </span>
                                </div>
                              </div>

                              <div className="p-5 space-y-1.5 bg-slate-950/10 border-t border-slate-900/30 flex-1 flex flex-col justify-between">
                                <div className="space-y-1.5">
                                  <h4 className="text-xs font-bold text-white uppercase tracking-wide group-hover:text-red-400 transition-colors">
                                    {item.caption}
                                  </h4>
                                  {item.description && (
                                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[9px] font-mono text-slate-500 mt-2 block border-t border-slate-900/20 pt-1.5">
                                  📅 {item.date}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>

                      {/* Show More Expansion Button */}
                      {filteredGallery.length > galleryLimit && (
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={() => setGalleryLimit((prev) => prev + 12)}
                            className="px-6 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all border border-slate-850 flex items-center gap-2 cursor-pointer shadow-lg hover:border-red-500/30"
                          >
                            Carregar Mais Registros (+{filteredGallery.length - galleryLimit})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* 6. PROCESSO SELETIVO ROUTE */}
            {isPathActive(['/processo-seletivo']) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="border-b border-slate-900 pb-6 space-y-2 text-center max-w-2xl mx-auto">
                  <span className="text-[10px] font-bold font-mono text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Award size={14} /> ADMISSÃO OPERACIONAL
                  </span>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white">
                    Processo Seletivo Unificado
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Siga o fluxo simplificado para testar suas aptidões e solicitar ingresso
                    oficial.
                  </p>
                </div>

                {/* Recruitment flow indicator: Cadastro -> Prova -> Resultado */}
                <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 relative mb-12">
                  <div className="text-center space-y-2 p-4 bg-slate-900/40 border border-slate-900 rounded-2xl relative">
                    <div className="mx-auto w-8 h-8 rounded-full bg-red-600/20 border border-red-500 text-red-400 flex items-center justify-center font-mono text-xs font-bold">
                      01
                    </div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white">
                      Cadastro
                    </span>
                    <p className="text-[10px] text-slate-500 hidden sm:block">
                      Preencha seus identificadores únicos da cidade.
                    </p>
                  </div>

                  <div className="text-center space-y-2 p-4 bg-slate-900/40 border border-slate-900 rounded-2xl relative">
                    <div className="mx-auto w-8 h-8 rounded-full bg-red-600/20 border border-red-500 text-red-400 flex items-center justify-center font-mono text-xs font-bold">
                      02
                    </div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white">
                      Prova
                    </span>
                    <p className="text-[10px] text-slate-500 hidden sm:block">
                      Responda ao questionário tático oficial.
                    </p>
                  </div>

                  <div className="text-center space-y-2 p-4 bg-slate-900/40 border border-slate-900 rounded-2xl relative">
                    <div className="mx-auto w-8 h-8 rounded-full bg-red-600/20 border border-red-500 text-red-400 flex items-center justify-center font-mono text-xs font-bold">
                      03
                    </div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white">
                      Resultado
                    </span>
                    <p className="text-[10px] text-slate-500 hidden sm:block">
                      Envie suas pontuações diretamente ao Comando.
                    </p>
                  </div>
                </div>

                {/* Render the core SelectionProcess component in isolation as requested */}
                <div className="max-w-3xl mx-auto">
                  <SelectionProcess questions={portalData.questions} />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 mt-16 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
              <Shield className="text-red-500 w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">GTO - Grupo Tático de Operações</p>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                LEI, SEGURANÇA E DISCIPLINA
              </p>
            </div>
          </div>

          {/* Social Links in Footer */}
          <div className="flex items-center gap-3">
            <a
              href={currentDiscordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-indigo-950/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-900/30 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <MessageSquare size={12} />
              <span>Discord</span>
            </a>
            <a
              href={currentTiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 border border-rose-900/30 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <span className="text-xs">🎵</span>
              <span>TikTok</span>
            </a>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-500 font-mono">
            <span>© 2026 Portal GTO • Todos os direitos reservados. </span>
            <span className="block md:inline md:ml-2 text-slate-600">
              Este portal é de acesso público controlado pelo Comando.
            </span>
          </div>
        </div>
      </footer>

      {/* PHOTO LIGHTBOX PREVIEW */}
      <AnimatePresence>
        {lightboxImg && (
          <div
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setLightboxImg(null)}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                {lightboxGalleryIndex + 1} / {portalData?.gallery.length || 0}
              </span>
              <button
                onClick={() => setLightboxImg(null)}
                className="text-white text-sm cursor-pointer bg-slate-900 border border-slate-800 hover:border-red-500 hover:text-red-400 p-2.5 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center relative rounded-xl overflow-hidden border border-slate-900 shadow-2xl bg-slate-950"
              onClick={(e) => e.stopPropagation()}
            >
              <ImageWithFallback
                src={lightboxImg.url}
                alt="Lightbox view"
                className="max-w-full max-h-[70vh] object-contain"
                wrapperClassName="flex items-center justify-center p-2 sm:p-4"
              />

              {/* Navigation arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-slate-950/80 hover:bg-red-600 border border-slate-800 hover:border-red-500 text-white p-2.5 sm:p-3 rounded-full transition-all shadow-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-slate-950/80 hover:bg-red-600 border border-slate-800 hover:border-red-500 text-white p-2.5 sm:p-3 rounded-full transition-all shadow-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <ChevronRight size={20} />
              </button>

              <div className="p-5 bg-slate-950 border-t border-slate-900 w-full text-center space-y-1.5">
                <p className="text-sm text-white font-bold uppercase tracking-wide">
                  {lightboxImg.caption}
                </p>
                {lightboxImg.description && (
                  <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    {lightboxImg.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
