import React from 'react';
import { Shield, Menu, X, Sun, Moon, MessageSquare, LogOut, Lock } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  navigateTo: (path: string) => void;
  adminToken: string | null;
  handleLogout: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentPath,
  navigateTo,
  adminToken,
  handleLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  darkMode,
  toggleDarkMode,
}) => {
  const isActive = (paths: string[]) => paths.includes(currentPath);

  const navBtn = (path: string, paths: string[], label: React.ReactNode) => (
    <button
      onClick={() => navigateTo(path)}
      className={`
        relative px-1 py-1 text-[11px] font-bold tracking-wider uppercase transition-all duration-200
        hover:text-red-400
        ${
          isActive(paths)
            ? 'text-red-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-red-500 after:rounded-full'
            : 'text-slate-400'
        }
      `}
    >
      {label}
    </button>
  );

  const mobilNavBtn = (path: string, paths: string[], emoji: string, label: string) => (
    <button
      onClick={() => navigateTo(path)}
      className={`text-left px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all text-xs font-bold tracking-wider uppercase
        ${
          isActive(paths)
            ? 'bg-red-950/20 text-red-400 border-l-4 border-red-500'
            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
        }`}
    >
      <span>{emoji}</span> {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() => navigateTo('/')}
        >
          <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg border border-red-500/30 group-hover:scale-105 transition-transform duration-200">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-[9px] text-red-500 font-bold tracking-[0.2em] block leading-none uppercase">
              Portal Oficial
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white leading-tight">
              GTO Tático
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-5 flex-1 justify-center">
          {navBtn('/', ['/', '/inicio'], '🏠 Início')}
          {navBtn('/historia', ['/historia'], '📖 História')}
          {navBtn('/galeria', ['/galeria'], '🖼 Galeria')}
          {navBtn(
            '/processo-seletivo',
            ['/processo-seletivo'],
            <span className="text-red-400">📝 Processo Seletivo</span>
          )}
          {navBtn('/admin', ['/admin'], '🔐 Admin')}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all hover:scale-105"
          >
            {darkMode ? (
              <Sun size={15} className="text-amber-400" />
            ) : (
              <Moon size={15} className="text-slate-400" />
            )}
          </button>

          {/* Social links – desktop */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://discord.gg/EwR6fKMYk"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/60 hover:text-indigo-200 border border-indigo-900/30 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
            >
              <MessageSquare size={12} />
              <span>Discord</span>
            </a>
            <a
              href="https://www.tiktok.com/@zepancadaoficial"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 border border-rose-900/30 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
            >
              <span className="text-xs">🎵</span>
              <span>TikTok</span>
            </a>
          </div>

          {/* Admin / logout */}
          {adminToken ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 pl-3">
              <span className="text-[9px] font-mono font-bold text-red-400 uppercase hidden md:inline">
                Admin
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white border border-red-900/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={12} /> Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigateTo('/admin')}
              className="hidden sm:flex px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-red-800 hover:text-red-400 text-slate-300 text-xs font-bold rounded-xl transition-all items-center gap-1.5 cursor-pointer"
            >
              <Lock size={12} /> Admin
            </button>
          )}

          {/* Mobile burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-slate-950 border-t border-slate-900">
          <div className="px-4 py-4 flex flex-col gap-1">
            {mobilNavBtn('/', ['/', '/inicio'], '🏠', 'Início')}
            {mobilNavBtn('/historia', ['/historia'], '📖', 'Nossa História')}
            {mobilNavBtn('/galeria', ['/galeria'], '🖼', 'Galeria')}
            {mobilNavBtn('/processo-seletivo', ['/processo-seletivo'], '📝', 'Processo Seletivo')}
            {mobilNavBtn('/admin', ['/admin'], '🔐', 'Painel Administrativo')}

            <div className="border-t border-slate-900 pt-3 mt-2 grid grid-cols-2 gap-2">
              <a
                href="https://discord.gg/EwR6fKMYk"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/60 text-center rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-indigo-900/20 text-xs"
              >
                <MessageSquare size={13} /> Discord
              </a>
              <a
                href="https://www.tiktok.com/@zepancadaoficial"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-center rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-rose-900/20 text-xs"
              >
                <span>🎵</span> TikTok
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
