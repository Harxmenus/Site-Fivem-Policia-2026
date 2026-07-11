import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  LayoutDashboard,
  History,
  Calendar,
  BarChart3,
  Image as ImageIcon,
  Users,
  Settings,
  LogOut,
  Save,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { PortalData, TimelineEvent, StatisticItem, GalleryItem } from '../types';
import ImageWithFallback from './ImageWithFallback';
import Toast, { useToast } from './Toast';

interface AdminPanelProps {
  onLogout: () => void;
  token: string;
  onRefreshData: () => Promise<void>;
  onPortalDataUpdated?: (data: PortalData) => void;
  portalData: PortalData;
}

export default function AdminPanel({
  onLogout,
  token,
  onRefreshData,
  onPortalDataUpdated,
  portalData,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'history' | 'timeline' | 'statistics' | 'gallery' | 'submissions' | 'settings'
  >('history');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // AI Modal State
  const [aiModal, setAiModal] = useState<{
    isOpen: boolean;
    section: string;
    targetField: string;
    originalText: string;
    instructions: string;
    result: string;
    loading: boolean;
  }>({
    isOpen: false,
    section: '',
    targetField: '',
    originalText: '',
    instructions: '',
    result: '',
    loading: false,
  });

  // Editor states (initialized with portalData on load)
  const [historyForm, setHistoryForm] = useState(portalData.history);
  const [timelineForm, setTimelineForm] = useState<TimelineEvent[]>(portalData.timeline);
  const [statisticsForm, setStatisticsForm] = useState<StatisticItem[]>(portalData.statistics);
  const [galleryForm, setGalleryForm] = useState<GalleryItem[]>(portalData.gallery);
  const [discordWebhook, setDiscordWebhook] = useState(portalData.discordWebhook);
  const [discordUrl, setDiscordUrl] = useState(portalData.discordUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(portalData.tiktokUrl || '');
  const [namesText, setNamesText] = useState(portalData.history.homenagemNames?.join(', ') || '');
  const [showWebhook, setShowWebhook] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Submission details modal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Custom delete confirmation state
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);

  // Toast
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  // Sync state if portalData changes from parent
  useEffect(() => {
    setHistoryForm(portalData.history);
    setTimelineForm(portalData.timeline);
    setStatisticsForm(portalData.statistics);
    setGalleryForm(portalData.gallery);
    setDiscordWebhook(portalData.discordWebhook);
    setDiscordUrl(portalData.discordUrl || '');
    setTiktokUrl(portalData.tiktokUrl || '');
    setNamesText(portalData.history.homenagemNames?.join(', ') || '');
  }, [portalData]);

  // Image Upload Handler
  const handleImageUpload = async (file: File, onSuccess: (url: string) => void) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('A imagem selecionada é muito grande. O limite máximo é 25MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: file.name,
              type: file.type,
              base64: base64String,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              alert('Sua sessão expirou ou não é válida. Faça login novamente.');
              onLogout();
              return;
            }
            const errData = await response.json();
            throw new Error(errData.error || 'Erro no upload.');
          }

          const data = await response.json();
          onSuccess(data.url);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          alert('Erro ao fazer upload: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert('Erro ao ler arquivo: ' + err.message);
    }
  };

  const isValidImageUrl = (urlStr: string) => {
    if (!urlStr) return false;
    const cleanUrl = urlStr.trim();
    if (cleanUrl.startsWith('/uploads/')) return true;
    if (cleanUrl.startsWith('data:image/')) return true;
    try {
      const parsed = new URL(cleanUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = async (updatedFields: Partial<PortalData> & { adminCredentials?: any }) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          alert('Sua sessão expirou ou não é válida. Faça login novamente.');
          onLogout();
          return;
        }
        throw new Error(errData.error || 'Erro ao atualizar o conteúdo no servidor.');
      }

      // Use response data directly to avoid Blob eventual consistency lag
      const responseData = await response.json();
      if (responseData.data && onPortalDataUpdated) {
        onPortalDataUpdated(responseData.data);
      } else {
        await onRefreshData();
      }
      setSaveSuccess(true);
      showToast('success', 'Dados salvos e portal atualizado em tempo real!');
      setTimeout(() => setSaveSuccess(false), 3000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Não foi possível sincronizar com o servidor.');
      showToast('error', err.message || 'Não foi possível sincronizar com o servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // History Actions
  const handleHistoryChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHistoryForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveHistory = () => {
    if (!historyForm.title?.trim()) {
      alert('O Título Oficial não pode ficar em branco.');
      return;
    }
    if (!historyForm.subtitle?.trim()) {
      alert('O Slogan / Subtítulo não pode ficar em branco.');
      return;
    }
    if (!historyForm.content?.trim()) {
      alert('A História Institucional (Narrativa) não pode ficar em branco.');
      return;
    }
    if (!historyForm.about?.trim()) {
      alert('O Sobre o Grupo GTO (Nosso Propósito) não pode ficar em branco.');
      return;
    }
    if (!historyForm.homenagemText?.trim()) {
      alert('O Texto da Homenagem não pode ficar em branco.');
      return;
    }
    if (!isValidImageUrl(historyForm.bannerUrl)) {
      alert(
        'A URL do Banner Principal não é válida. Insira uma URL de imagem válida (http/https) ou faça o upload de um arquivo.'
      );
      return;
    }
    const cleaned = {
      ...historyForm,
      title: historyForm.title.trim(),
      subtitle: historyForm.subtitle.trim(),
      content: historyForm.content.trim(),
      about: historyForm.about.trim(),
      homenagemText: historyForm.homenagemText.trim(),
      bannerUrl: historyForm.bannerUrl.trim(),
    };
    setHistoryForm(cleaned);
    handleSave({ history: cleaned });
  };

  // Timeline Actions
  const handleTimelineChange = (idx: number, field: keyof TimelineEvent, value: string) => {
    const updated = [...timelineForm];
    updated[idx] = { ...updated[idx], [field]: value };
    setTimelineForm(updated);
  };

  const addTimelineEvent = () => {
    const newEvent: TimelineEvent = {
      id: 't-' + Date.now(),
      year: '2026',
      title: 'Novo Evento Tático',
      description: 'Descrição sucinta do marco alcançado pela equipe.',
    };
    setTimelineForm([...timelineForm, newEvent]);
  };

  const deleteTimelineEvent = (id: string) => {
    setTimelineForm(timelineForm.filter((item) => item.id !== id));
  };

  const saveTimeline = () => {
    for (let i = 0; i < timelineForm.length; i++) {
      if (!timelineForm[i].year?.trim()) {
        alert(`O evento de linha do tempo ${i + 1} precisa ter um ano preenchido.`);
        return;
      }
      if (!timelineForm[i].title?.trim()) {
        alert(`O evento de linha do tempo ${i + 1} precisa ter um título preenchido.`);
        return;
      }
      if (!timelineForm[i].description?.trim()) {
        alert(`O evento de linha do tempo ${i + 1} precisa ter uma descrição preenchida.`);
        return;
      }
    }
    const cleanedTimeline = timelineForm.map((item) => ({
      ...item,
      year: item.year.trim(),
      title: item.title.trim(),
      description: item.description.trim(),
    }));
    setTimelineForm(cleanedTimeline);
    handleSave({ timeline: cleanedTimeline });
  };

  // Statistics Actions
  const handleStatChange = (idx: number, field: keyof StatisticItem, value: string) => {
    const updated = [...statisticsForm];
    updated[idx] = { ...updated[idx], [field]: value };
    setStatisticsForm(updated);
  };

  const addStatistic = () => {
    const newStat: StatisticItem = {
      id: 's-' + Date.now(),
      label: 'Nova Métrica',
      value: '0',
      icon: 'ShieldAlert',
    } as StatisticItem;
    setStatisticsForm([...statisticsForm, newStat]);
  };

  const deleteStatistic = (id: string) => {
    setStatisticsForm(statisticsForm.filter((item) => item.id !== id));
  };

  const saveStatistics = () => {
    for (let i = 0; i < statisticsForm.length; i++) {
      if (!statisticsForm[i].label?.trim()) {
        alert(`A métrica ${i + 1} precisa ter um rótulo preenchido.`);
        return;
      }
      if (!statisticsForm[i].value?.trim()) {
        alert(`A métrica ${i + 1} precisa ter um valor preenchido.`);
        return;
      }
      if (!statisticsForm[i].icon?.trim()) {
        alert(`A métrica ${i + 1} precisa ter um ícone preenchido.`);
        return;
      }
    }
    const cleanedStats = statisticsForm.map((item) => ({
      ...item,
      label: item.label.trim(),
      value: item.value.trim(),
      icon: item.icon.trim(),
    }));
    setStatisticsForm(cleanedStats);
    handleSave({ statistics: cleanedStats });
  };

  // Gallery Actions
  const handleGalleryChange = (idx: number, field: keyof GalleryItem, value: string) => {
    const updated = [...galleryForm];
    updated[idx] = { ...updated[idx], [field]: value };
    setGalleryForm(updated);
  };

  const addGalleryItem = () => {
    const newItem: GalleryItem = {
      id: 'g-' + Date.now(),
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop',
      caption: 'Título da Imagem',
      description: 'Descrição opcional da fotografia operacional.',
      date: 'Maio de 2026',
      category: 'Patrulhamento',
      badgeIcon: 'Shield',
    };
    setGalleryForm([...galleryForm, newItem]);
  };

  const deleteGalleryItem = (id: string) => {
    setGalleryForm(galleryForm.filter((item) => item.id !== id));
  };

  const moveGalleryItem = (idx: number, dir: 'up' | 'down') => {
    const updated = [...galleryForm];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= updated.length) return;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setGalleryForm(updated);
  };

  const saveGallery = () => {
    const cleanedGallery = galleryForm.map((item) => ({
      ...item,
      url: item.url.trim(),
      caption: item.caption?.trim() || '',
      description: item.description?.trim() || '',
      date: item.date?.trim() || '',
      category: item.category?.trim() || 'Patrulhamento',
      badgeIcon: item.badgeIcon?.trim() || 'Shield',
    }));

    for (let i = 0; i < cleanedGallery.length; i++) {
      if (!cleanedGallery[i].url) {
        alert(`A imagem ${i + 1} precisa ter uma URL preenchida.`);
        return;
      }
      if (!isValidImageUrl(cleanedGallery[i].url)) {
        alert(
          `A imagem ${i + 1} possui uma URL inválida ou com formato incorreto. Certifique-se de que a URL começa com http://, https:// ou faça o upload direto do computador.`
        );
        return;
      }
      if (!cleanedGallery[i].caption) {
        alert(`A imagem ${i + 1} precisa ter uma legenda preenchida.`);
        return;
      }
      if (!cleanedGallery[i].date) {
        alert(`A imagem ${i + 1} precisa ter uma data/mês preenchidos.`);
        return;
      }
    }
    setGalleryForm(cleanedGallery);
    handleSave({ gallery: cleanedGallery });
  };

  // Submissions (Candidate) Actions
  const deleteSubmission = async (id: string) => {
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Sua sessão expirou ou não é válida. Faça login novamente.');
          onLogout();
          return;
        }
        throw new Error('Falha ao excluir.');
      }
      await onRefreshData();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (err) {
      alert('Erro ao remover ficha.');
    } finally {
      setSubmissionToDelete(null);
    }
  };

  // Discord Config Action
  const saveDiscordConfig = () => {
    const trimmedWebhook = discordWebhook?.trim() || '';
    if (
      trimmedWebhook &&
      !trimmedWebhook.startsWith('https://discord.com/api/webhooks/') &&
      !trimmedWebhook.startsWith('https://discordapp.com/api/webhooks/')
    ) {
      alert('URL de Webhook inválida. Ela deve começar com https://discord.com/api/webhooks/');
      return;
    }
    setDiscordWebhook(trimmedWebhook);
    handleSave({ discordWebhook: trimmedWebhook });
  };

  const saveSocialLinksConfig = () => {
    const trimmedDiscordUrl = discordUrl?.trim() || '';
    const trimmedTiktokUrl = tiktokUrl?.trim() || '';

    const isValidUrl = (url: string) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (!isValidUrl(trimmedDiscordUrl)) {
      alert('URL do Discord inválida. Use um link completo começando com http:// ou https://');
      return;
    }

    if (!isValidUrl(trimmedTiktokUrl)) {
      alert('URL do TikTok inválida. Use um link completo começando com http:// ou https://');
      return;
    }

    setDiscordUrl(trimmedDiscordUrl);
    setTiktokUrl(trimmedTiktokUrl);
    handleSave({ discordUrl: trimmedDiscordUrl, tiktokUrl: trimmedTiktokUrl });
  };

  // Password / Admin Config Action
  const [passForm, setPassForm] = useState({
    username: 'admin',
    newPassword: '',
  });
  const [passSuccess, setPassSuccess] = useState(false);

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedUsername = passForm.username.trim();
    const trimmedPassword = passForm.newPassword.trim();

    if (!trimmedUsername) {
      alert('O nome de usuário não pode ficar em branco.');
      return;
    }
    if (!trimmedPassword) {
      alert('Digite uma senha nova válida.');
      return;
    }
    if (trimmedPassword.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres para maior segurança.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminCredentials: {
            username: trimmedUsername,
            password: trimmedPassword,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Sua sessão expirou ou não é válida. Faça login novamente.');
          onLogout();
          return;
        }
        throw new Error('Erro ao atualizar credenciais.');
      }
      setPassSuccess(true);
      setPassForm({ username: trimmedUsername, newPassword: '' });
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar senha.');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Assistant Call
  const openAiWriter = (sectionName: string, fieldName: string, currentText: string) => {
    setAiModal({
      isOpen: true,
      section: sectionName,
      targetField: fieldName,
      originalText: currentText,
      instructions:
        'Deixe mais imponente, tático e adequado ao linguajar de forças de elite militares brasileiras.',
      result: '',
      loading: false,
    });
  };

  const generateWithAi = async () => {
    setAiModal((prev) => ({ ...prev, loading: true, result: '' }));
    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: aiModal.section,
          originalText: aiModal.originalText,
          instructions: aiModal.instructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na geração.');
      }

      const data = await response.json();
      setAiModal((prev) => ({ ...prev, result: data.result, loading: false }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      setAiModal((prev) => ({
        ...prev,
        result: `Erro: ${error.message}. Verifique a API Key do Gemini no painel de segredos do AI Studio.`,
        loading: false,
      }));
    }
  };

  const applyAiText = () => {
    if (!aiModal.result || aiModal.result.startsWith('Erro:')) return;

    // Dynamically update correct state field
    const field = aiModal.targetField;
    if (field in historyForm) {
      setHistoryForm((prev) => ({ ...prev, [field]: aiModal.result }));
    }

    setAiModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6" id="painel-admin">
      {/* Admin header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-950/60 border border-red-900/50 rounded-xl">
            <LayoutDashboard className="text-red-500 w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Central Administrativa GTO
              </h2>
              <span className="px-2 py-0.5 text-[9px] bg-red-600 text-white font-mono rounded font-bold uppercase tracking-wider">
                ADMIN ATIVO
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Gerencie todo o conteúdo institucional, fotos da galeria, estatísticas e acompanhe
              inscrições em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-red-900 hover:text-red-400 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut size={14} /> Sair do Painel
          </button>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Navigation Rails */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5 shadow-lg">
          <span className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
            Gerenciar Conteúdo
          </span>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <History size={16} /> História e Diretrizes
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <Calendar size={16} /> Linha do Tempo
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'statistics'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <BarChart3 size={16} /> Estatísticas
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <ImageIcon size={16} /> Galeria Operacional
          </button>

          <div className="h-px bg-slate-800 my-2" />

          <span className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
            Triagem Tática
          </span>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users size={16} /> Fichas de Inscrição
            </span>
            {portalData.submissions.length > 0 && (
              <span className="bg-red-600 text-white font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                {portalData.submissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-red-950/40 border-l-2 border-red-500 text-white'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <Settings size={16} /> Integração e Acesso
          </button>
        </div>

        {/* Right Editor Panels */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg min-h-[500px]">
          {/* Status Bar */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold"
              >
                <CheckCircle size={16} className="text-emerald-400 shrink-0" /> Sincronização
                Concluída! Todo o portal foi atualizado em tempo real.
              </motion.div>
            )}
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" /> {saveError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  História e Diretrizes Institucionais
                </h3>
                <button
                  onClick={saveHistory}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}{' '}
                  Salvar Seção
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Título Oficial
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={historyForm.title}
                      onChange={handleHistoryChange}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Slogan / Subtítulo
                    </label>
                    <input
                      type="text"
                      name="subtitle"
                      value={historyForm.subtitle}
                      onChange={handleHistoryChange}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      URL do Banner Principal
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="bannerUrl"
                        value={historyForm.bannerUrl}
                        onChange={handleHistoryChange}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        id="upload-banner-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (uploadedUrl) => {
                              setHistoryForm((prev) => {
                                const updated = { ...prev, bannerUrl: uploadedUrl };
                                handleSave({ history: updated });
                                return updated;
                              });
                            });
                          }
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="upload-banner-input"
                        className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Plus size={14} /> Upload Imagem
                      </label>
                    </div>
                    {historyForm.bannerUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video max-h-[200px]">
                        <ImageWithFallback
                          src={historyForm.bannerUrl}
                          alt="Preview do banner"
                          className="w-full h-full object-contain"
                          loading="eager"
                        />
                      </div>
                    )}
                  </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      História Institucional (Narrativa)
                    </label>
                    <button
                      onClick={() =>
                        openAiWriter('História Institucional GTO', 'content', historyForm.content)
                      }
                      className="text-[10px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer bg-red-950/30 px-2 py-0.5 rounded border border-red-900/40"
                    >
                      <Sparkles size={11} /> Otimizar com IA Gemini
                    </button>
                  </div>
                  <textarea
                    name="content"
                    value={historyForm.content}
                    onChange={handleHistoryChange}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sobre o Grupo GTO (Nosso Propósito)
                    </label>
                    <button
                      onClick={() =>
                        openAiWriter('Sobre o Grupo GTO', 'about', historyForm.about || '')
                      }
                      className="text-[9px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/40"
                    >
                      <Sparkles size={10} /> Otimizar com IA
                    </button>
                  </div>
                  <textarea
                    name="about"
                    value={historyForm.about || ''}
                    onChange={handleHistoryChange}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Texto da Homenagem
                      </label>
                      <button
                        onClick={() =>
                          openAiWriter(
                            'Texto de Homenagem GTO',
                            'homenagemText',
                            historyForm.homenagemText || ''
                          )
                        }
                        className="text-[9px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/40"
                      >
                        <Sparkles size={10} /> IA
                      </button>
                    </div>
                    <textarea
                      name="homenagemText"
                      value={historyForm.homenagemText || ''}
                      onChange={handleHistoryChange}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Membros Homenageados (Separados por vírgula)
                    </label>
                    <textarea
                      name="homenagemNames"
                      value={namesText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNamesText(val);
                        const list = val
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean);
                        setHistoryForm((prev) => ({ ...prev, homenagemNames: list }));
                      }}
                      rows={5}
                      placeholder="Ex: Huanzinho77, PlayboyRJ, Marcos Baloso..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all leading-relaxed font-mono font-medium"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Os veteranos acima receberão insígnias oficiais de operadores destacados no
                      portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Linha do Tempo de Glórias
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Marcos e datas importantes conquistadas pela corporação.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTimelineEvent}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Adicionar Ano
                  </button>
                  <button
                    onClick={saveTimeline}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}{' '}
                    Salvar Linha do Tempo
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {timelineForm.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start relative group"
                  >
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Ano</label>
                      <input
                        type="text"
                        value={item.year}
                        onChange={(e) => handleTimelineChange(idx, 'year', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">
                        Título do Evento
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleTimelineChange(idx, 'title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-5 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">
                        Breve Descrição
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleTimelineChange(idx, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-1 pt-6 flex justify-end">
                      <button
                        onClick={() => deleteTimelineEvent(item.id)}
                        className="p-1.5 bg-slate-900 hover:bg-red-950 hover:text-red-400 border border-slate-800 hover:border-red-900/60 text-slate-400 rounded-lg transition-all cursor-pointer"
                        title="Deletar Ano"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {timelineForm.length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-8">
                    Nenhum evento registrado. Clique em adicionar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STATISTICS */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Estatísticas e Métricas Operacionais
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Indicadores chave exibidos em destaque no portal principal.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addStatistic}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Adicionar Métrica
                  </button>
                  <button
                    onClick={saveStatistics}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}{' '}
                    Salvar Estatísticas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statisticsForm.map((stat, idx) => (
                  <div
                    key={stat.id}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-red-400 font-bold">
                        MÉTRICA {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-mono">ID: {stat.id}</span>
                        <button
                          onClick={() => deleteStatistic(stat.id)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-all cursor-pointer border border-transparent hover:border-red-900/40"
                          title="Excluir Métrica"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">
                          Rótulo / Descritor
                        </label>
                        <input
                          type="text"
                          value={stat.label}
                          onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">
                          Valor Exibido
                        </label>
                        <input
                          type="text"
                          value={stat.value}
                          onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">
                        Ícone Lucide
                      </label>
                      <select
                        value={stat.icon}
                        onChange={(e) => handleStatChange(idx, 'icon', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Shield">🛡️ Escudo (Shield)</option>
                        <option value="ShieldAlert">⚠️ Alerta Tático (ShieldAlert)</option>
                        <option value="Target">🎯 Mira (Target)</option>
                        <option value="Award">🏆 Troféu (Award)</option>
                        <option value="Star">⭐ Estrela (Star)</option>
                        <option value="Zap">⚡ Raio / Velocidade (Zap)</option>
                        <option value="Activity">📊 Atividade (Activity)</option>
                        <option value="Users">👥 Equipe (Users)</option>
                        <option value="Lock">🔒 Cadeado (Lock)</option>
                        <option value="Flame">🔥 Fogo (Flame)</option>
                        <option value="Crosshair">🔭 Mira Telescópica (Crosshair)</option>
                        <option value="UserX">❌ Baixa Operacional (UserX)</option>
                        <option value="Siren">🚨 Sirene (Siren)</option>
                        <option value="BarChart3">📈 Estatística (BarChart3)</option>
                      </select>
                    </div>
                  </div>
                ))}

                {statisticsForm.length === 0 && (
                  <p className="col-span-2 text-center text-slate-500 text-xs py-8">
                    Nenhuma métrica cadastrada. Clique em adicionar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GALLERY */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Galeria Operacional de Imagens
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    URLs de fotos institucionais de alta definição (Unsplash, Discord, etc).
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addGalleryItem}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Adicionar Imagem
                  </button>
                  <button
                    onClick={saveGallery}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}{' '}
                    Salvar Galeria
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {galleryForm.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-500">
                          MÍDIA {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveGalleryItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-950/40 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover para cima"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveGalleryItem(idx, 'down')}
                            disabled={idx === galleryForm.length - 1}
                            className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-950/40 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            onClick={() => deleteGalleryItem(item.id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-all cursor-pointer border border-transparent hover:border-red-900/40"
                            title="Excluir Mídia"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-800 relative">
                        <ImageWithFallback
                          src={item.url}
                          alt="preview"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            URL do Arquivo de Imagem
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.url}
                              onChange={(e) => handleGalleryChange(idx, 'url', e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:outline-none"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              id={`upload-gallery-input-${item.id}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, (uploadedUrl) => {
                                    setGalleryForm((prev) => {
                                      const updated = [...prev];
                                      updated[idx] = { ...updated[idx], url: uploadedUrl };
                                      handleSave({ gallery: updated }); // Auto-save gallery image upload
                                      return updated;
                                    });
                                  });
                                }
                                e.target.value = '';
                              }}
                            />
                            <label
                              htmlFor={`upload-gallery-input-${item.id}`}
                              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-all whitespace-nowrap"
                            >
                              <Plus size={11} /> Upload
                            </label>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            Título / Legenda
                          </label>
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) => handleGalleryChange(idx, 'caption', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            Descrição Curta (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Breve descrição da foto..."
                            value={item.description || ''}
                            onChange={(e) =>
                              handleGalleryChange(idx, 'description', e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            Categoria
                          </label>
                          <select
                            value={item.category || 'Patrulhamento'}
                            onChange={(e) => handleGalleryChange(idx, 'category', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                          >
                            <option value="Operações">Operações</option>
                            <option value="Patrulhamento">Patrulhamento</option>
                            <option value="Abordagens">Abordagens</option>
                            <option value="Certificados">Certificados</option>
                            <option value="Apreensões">Apreensões</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            Ícone do Badge
                          </label>
                          <select
                            value={item.badgeIcon || 'Shield'}
                            onChange={(e) => handleGalleryChange(idx, 'badgeIcon', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                          >
                            <option value="Shield">🛡️ Escudo</option>
                            <option value="Target">🎯 Mira</option>
                            <option value="Award">⭐ Medalha</option>
                            <option value="Zap">⚡ Raio</option>
                            <option value="Activity">📊 Alerta</option>
                            <option value="Lock">🔒 Cadeado</option>
                            <option value="Users">👥 Equipe</option>
                            <option value="Flame">🔥 Fogo</option>
                            <option value="Crosshair">🔭 Mira</option>
                            <option value="Star">🌟 Estrela</option>
                            <option value="ShieldAlert">⚠️ Alerta</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">
                            Data de Registro
                          </label>
                          <input
                            type="text"
                            value={item.date}
                            onChange={(e) => handleGalleryChange(idx, 'date', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {galleryForm.length === 0 && (
                  <p className="col-span-2 text-center text-slate-500 text-xs py-8">
                    Nenhuma imagem na galeria. Clique em adicionar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CANDIDATE SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  Inscrições Recebidas ({portalData.submissions.length})
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Fichas de candidatos triadas automaticamente a partir do teste de 15 questões.
                </p>
              </div>

              <div className="space-y-3">
                {portalData.submissions.map((sub) => {
                  const percent = Math.round((sub.score / 15) * 100);
                  const formattedDate = new Date(sub.timestamp).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={sub.id}
                      className={`bg-slate-950/60 border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        sub.passed
                          ? 'border-emerald-950 hover:border-emerald-800/80'
                          : 'border-slate-800 hover:border-red-950/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{sub.name}</h4>
                          <span
                            className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                              sub.passed
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                                : 'bg-red-950 text-red-400 border border-red-900/40'
                            }`}
                          >
                            {sub.passed
                              ? `APROVADO (${sub.score}/15)`
                              : `REPROVADO (${sub.score}/15)`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs font-mono">
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-red-500" /> Discord:{' '}
                            <strong className="text-slate-200">{sub.discordTag}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Passaporte (ID):{' '}
                            <strong className="text-slate-200">{sub.passport || sub.phone}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Idade: <strong className="text-slate-200">{sub.age} anos</strong>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          Inscrição realizada em: {formattedDate}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 cursor-pointer"
                        >
                          Ver Gabarito
                        </button>
                        <button
                          onClick={() => deleteSubmission(sub.id)}
                          className="p-2 bg-slate-900 hover:bg-red-950 hover:text-red-400 border border-slate-800 hover:border-red-950 text-slate-400 rounded-lg transition-all cursor-pointer"
                          title="Remover Candidato"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {portalData.submissions.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    Nenhuma ficha de candidato recebida ainda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & PASSWORD */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Discord Webhook URL Configuration */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Integração com Discord
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Configure um Webhook de canal para receber notificações instantâneas de novas
                    inscrições táticas.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Discord Webhook URL
                    </label>
                    <div className="relative">
                      <input
                        type={showWebhook ? 'text' : 'password'}
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl pl-4 pr-11 py-2.5 text-xs text-white focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhook((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-all cursor-pointer"
                        title={showWebhook ? 'Ocultar URL' : 'Exibir URL'}
                      >
                        {showWebhook ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Deixe em branco se preferir desativar o webhook. Suas notificações de embed de
                      alta fidelidade serão enviadas imediatamente para o canal vinculado do Discord
                      sempre que um candidato realizar o teste tático de 15 questões.
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={saveDiscordConfig}
                      disabled={isSaving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isSaving ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}{' '}
                      Salvar Integração
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Links Configuration */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Links Sociais
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Atualize os links públicos de Discord e TikTok exibidos no cabeçalho e rodapé.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Link do Discord
                    </label>
                    <input
                      type="text"
                      value={discordUrl}
                      onChange={(e) => setDiscordUrl(e.target.value)}
                      placeholder="https://discord.gg/seu-servidor"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Link do TikTok
                    </label>
                    <input
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@seu_usuario"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-pink-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={saveSocialLinksConfig}
                      disabled={isSaving}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isSaving ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}{' '}
                      Salvar Links
                    </button>
                  </div>
                </div>
              </div>

              {/* Password / Admin Accounts Configuration */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Acesso de Administrador
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Altere as credenciais de login para a Central Administrativa.
                  </p>
                </div>

                <form
                  onSubmit={savePassword}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4"
                >
                  {passSuccess && (
                    <div className="bg-emerald-950/30 border border-emerald-900/60 text-emerald-300 px-3 py-2 rounded-lg text-xs font-semibold">
                      Credenciais atualizadas com sucesso! Guarde sua nova senha.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Usuário
                      </label>
                      <input
                        type="text"
                        value={passForm.username}
                        onChange={(e) =>
                          setPassForm((prev) => ({ ...prev, username: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nova Senha Tática
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passForm.newPassword}
                          onChange={(e) =>
                            setPassForm((prev) => ({ ...prev, newPassword: e.target.value }))
                          }
                          placeholder="Mínimo de 6 caracteres"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl pl-4 pr-11 py-2 text-xs text-white focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-all cursor-pointer"
                          title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isSaving ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}{' '}
                      Atualizar Credenciais
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: AI SUGGESTER MODAL */}
      <AnimatePresence>
        {aiModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-red-500" /> Redator Inteligente Gemini AI
                </h4>
                <button
                  onClick={() => setAiModal((prev) => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-white font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-xs text-slate-400 leading-relaxed">
                  A Inteligência Artificial do <strong className="text-white">Gemini</strong>{' '}
                  reescreverá seu texto atual utilizando uma linguagem militarizada imponente,
                  patriótica e adequada à elite do Grupo Tático de Operações.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Linguajar ou Tom Preferencial
                  </label>
                  <input
                    type="text"
                    value={aiModal.instructions}
                    onChange={(e) =>
                      setAiModal((prev) => ({ ...prev, instructions: e.target.value }))
                    }
                    placeholder="Instruções para o redator..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {aiModal.result && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Check size={12} /> Sugestão de Texto Gerada:
                    </label>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                      {aiModal.result}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setAiModal((prev) => ({ ...prev, isOpen: false }))}
                    className="flex-1 px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Descartar
                  </button>

                  <button
                    onClick={generateWithAi}
                    disabled={aiModal.loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {aiModal.loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Escrevendo com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> {aiModal.result ? 'Re-gerar texto' : 'Gerar com IA'}
                      </>
                    )}
                  </button>

                  {aiModal.result && !aiModal.result.startsWith('Erro:') && (
                    <button
                      onClick={applyAiText}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      <Check size={14} /> Aplicar Texto
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CANDIDATE ANSWERS REVIEW */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase font-mono">
                    Gabarito do Candidato: {selectedSubmission.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Visualização detalhada das 15 respostas marcadas no teste tático.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-white font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 border border-slate-800/80 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">Discord ID</span>
                    <strong className="text-white text-sm">{selectedSubmission.discordTag}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">
                      Resultado Geral
                    </span>
                    <strong
                      className={selectedSubmission.passed ? 'text-emerald-400' : 'text-red-400'}
                    >
                      {selectedSubmission.passed
                        ? `APROVADO (${selectedSubmission.score}/15)`
                        : `REPROVADO (${selectedSubmission.score}/15)`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">Idade</span>
                    <strong className="text-white">{selectedSubmission.age} anos</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px]">
                      Passaporte (ID)
                    </span>
                    <strong className="text-white">
                      {selectedSubmission.passport || selectedSubmission.phone}
                    </strong>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Questões do Teste
                  </h5>
                  {portalData.questions.map((q, idx) => {
                    const ans = selectedSubmission.answers[idx];
                    const correctAns = q.answerIndex;
                    const isCorrect = ans === correctAns;

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-950/40 border border-slate-800 p-3 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-slate-400">
                            Questão {idx + 1}
                          </span>
                          {isCorrect ? (
                            <span className="text-emerald-400 font-bold font-mono text-[10px] uppercase flex items-center gap-1">
                              ✓ Correta
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold font-mono text-[10px] uppercase flex items-center gap-1">
                              ✗ Incorreta
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-100">{q.question}</p>
                        <div className="space-y-1 text-slate-400 pl-2 border-l border-slate-800">
                          <p>
                            <strong className="text-slate-500">Selecionada:</strong>{' '}
                            {q.options[ans] || 'Sem resposta'}
                          </p>
                          {!isCorrect && (
                            <p>
                              <strong className="text-emerald-500">Correta:</strong>{' '}
                              {q.options[correctAns]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-2">
                <button
                  onClick={() => deleteSubmission(selectedSubmission.id)}
                  className="px-4 py-2 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Excluir Inscrição
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-800 cursor-pointer transition-all"
                >
                  Fechar Gabarito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
