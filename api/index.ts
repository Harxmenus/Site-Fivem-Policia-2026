/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { put, list } from '@vercel/blob';

// Load environment variables
dotenv.config();

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');
const TOKEN_FILE = path.join(process.cwd(), '.admin-token');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Ensure uploads directory exists and is served statically
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------------------------------------------------------------------------
// Admin session token
// ---------------------------------------------------------------------------
// Token is read from ADMIN_TOKEN_SECRET env var or generated once and persisted
// to a local file (.admin-token) so it survives server restarts in dev/prod.
function getAdminToken(): string {
  if (process.env.ADMIN_TOKEN_SECRET) {
    return process.env.ADMIN_TOKEN_SECRET;
  }
  // Persist to disk so the token survives restarts
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const existing = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
      if (existing) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(TOKEN_FILE, generated, 'utf-8');
    return generated;
  } catch {
    // Fallback: ephemeral token (restarts will invalidate sessions — acceptable)
    return crypto.randomBytes(32).toString('hex');
  }
}
// Resolve once at startup so all requests share the same token value.
const ADMIN_TOKEN = getAdminToken();

// ---------------------------------------------------------------------------
// Password hashing (uses Node's built-in crypto, no extra dependency needed)
// ---------------------------------------------------------------------------
function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function isHashedPassword(value: string): boolean {
  return typeof value === 'string' && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);
}

function verifyPassword(plainPassword: string, storedValue: string): boolean {
  if (!isHashedPassword(storedValue)) return false;
  const [salt, hash] = storedValue.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = crypto.scryptSync(plainPassword, salt, 64);
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, suppliedBuffer);
}

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      try {
        geminiClient = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        console.error('Failed to initialize Gemini API client:', err);
      }
    }
  }
  return geminiClient;
}

// ---------------------------------------------------------------------------
// Default questions
// ---------------------------------------------------------------------------
const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    question:
      'Em uma incursão em ambiente fechado (CQB), qual é o princípio primordial para a segurança da equipe?',
    options: [
      'Velocidade absoluta acima de tudo',
      'Surpresa, velocidade e violência de ação',
      'Aguardar o amanhecer',
      'Utilizar apenas granadas de efeito moral',
    ],
    answerIndex: 1,
    explanation:
      'O tripé tático do CQB consiste em Surpresa, Velocidade e Violência de Ação para subjugar qualquer resistência rapidamente com segurança.',
  },
  {
    id: 'q2',
    question:
      'Ao deparar-se com uma barricada hostil durante um patrulhamento urbano, qual deve ser a primeira conduta da equipe do GTO?',
    options: [
      'Avançar individualmente a pé',
      'Buscar abrigo imediato, reportar a situação para estabelecer o perímetro e aguardar ordens',
      'Efetuar disparos aleatórios em direção à barricada',
      'Ignorar a barricada e retornar à base sem avisar',
    ],
    answerIndex: 1,
    explanation:
      'Em cenários hostis com barreiras físicas, a prioridade absoluta é garantir a proteção coletiva, comunicar a situação e estabelecer o controle periférico.',
  },
  {
    id: 'q3',
    question:
      'Qual é o principal valor institucional esperado de um operador do Grupo Tático de Operações?',
    options: [
      'Individualismo absoluto nas tomadas de decisão',
      'Lealdade, disciplina rigorosa e espírito de corpo',
      'Busca por fama pessoal e reconhecimento público',
      'Uso desmedido e imediato da força letal',
    ],
    answerIndex: 1,
    explanation:
      'Unidades especiais operam sob a base rígida de respeito mútuo, forte disciplina tática, lealdade e trabalho coordenado de equipe (espírito de corpo).',
  },
  {
    id: 'q4',
    question: 'O que significa a sigla CQB no contexto de operações policiais e militares?',
    options: [
      'Controle de Quarteirões e Barreiras',
      'Close Quarters Battle (Combate em Ambientes Fechados)',
      'Comando de Qualidade e Blindagem',
      'Curso de Qualificação Básica',
    ],
    answerIndex: 1,
    explanation:
      'CQB (Close Quarters Battle) refere-se às técnicas de combate a curta distância em locais confinados, como cômodos e corredores.',
  },
  {
    id: 'q5',
    question:
      'Durante uma negociação tática com reféns, qual o papel primário do negociador do GTO?',
    options: [
      'Ganhar tempo útil, acalmar o tomador de reféns e colher inteligência tática',
      'Invadir o local imediatamente sem qualquer autorização superior',
      'Desafiar verbalmente as intenções do sequestrador',
      'Garantir rotas de fuga inseguras e descontroladas para o suspeito',
    ],
    answerIndex: 0,
    explanation:
      'A negociação visa salvar vidas por meio do diálogo técnico, ganhando tempo valioso para mapear a área e obter dados sobre a situação interna.',
  },
  {
    id: 'q6',
    question:
      'Em patrulhamento em área de alto risco, qual é a postura correta de prontidão com o armamento?',
    options: [
      'Postura totalmente descontraída para evitar assustar moradores',
      'Arma coldreada e sem munição na câmara',
      'Prontidão operacional com disciplina rigorosa de mira e controle do cano',
      'Apontar a arma constantemente para qualquer cidadão na via pública',
    ],
    answerIndex: 2,
    explanation:
      'A segurança do operador e dos cidadãos exige disciplina constante no direcionamento do cano e prontidão compatível com o nível de ameaça.',
  },
  {
    id: 'q7',
    question:
      'Qual equipamento é considerado essencial para proteção balística individual de um operador do GTO?',
    options: [
      'Colete balístico com placas cerâmicas rígidas nível III ou IV e capacete balístico',
      'Apenas óculos escuros de sol de alta performance',
      'Escudo balístico pesado compartilhado por todos',
      'Uniforme de tecido comum, priorizando apenas a agilidade',
    ],
    answerIndex: 0,
    explanation:
      'Operações de alto impacto requerem blindagem individual rígida capaz de reter projéteis de calibres de alta velocidade, além de proteção craniana.',
  },
  {
    id: 'q8',
    question: 'No uso progressivo da força policial, qual a sequência conceitual correta?',
    options: [
      'Iniciar o atendimento diretamente com disparos de arma de fogo letal',
      'Presença física, verbalização, controle de contato, técnicas menos letais e força letal',
      'Lançar gás lacrimogêneo imediatamente sem estabelecer diálogo',
      'Uso imediato de agressão verbal direta para intimidar suspeitos',
    ],
    answerIndex: 1,
    explanation:
      'A lei exige o uso proporcional da força, subindo gradualmente de acordo com o nível de resistência oferecido pelo suspeito.',
  },
  {
    id: 'q9',
    question: "Qual conduta exemplifica corretamente o conceito de 'espírito de corpo' no GTO?",
    options: [
      'Disputar privilégios internos de forma individualista',
      'Solidariedade mútua, coesão grupal e apoio tático incondicional dentro da legalidade',
      'Acobertar infrações graves e desvios de conduta moral dos companheiros',
      'Evitar realizar missões em conjunto com operadores recém-formados',
    ],
    answerIndex: 1,
    explanation:
      'O espírito de corpo é a união leal que garante que nenhum operador seja deixado para trás e que todos trabalhem pelo sucesso da equipe dentro da lei.',
  },
  {
    id: 'q10',
    question:
      'No atendimento pré-hospitalar tático (TCCC), qual a prioridade máxima sob fogo hostil ativo?',
    options: [
      'Realizar ressuscitação cardiopulmonar prolongada em campo aberto',
      'Neutralizar a ameaça ativa ou suprimir o inimigo e mover a vítima para um abrigo antes de intervir',
      'Iniciar imediatamente curativos detalhados na cabeça',
      'Aguardar a chegada de socorristas civis desprotegidos na linha de frente',
    ],
    answerIndex: 1,
    explanation:
      'No cuidado sob fogo (Care Under Fire), o melhor atendimento médico é a supressão do fogo inimigo. Vítimas e socorristas devem buscar abrigo rapidamente.',
  },
  {
    id: 'q11',
    question:
      "Como deve ser feita a entrada de varredura tática em um cômodo conhecida como 'fatiar a torta'?",
    options: [
      'Correr para dentro do quarto de olhos fechados',
      'Visualizar o ambiente de forma angular progressiva a partir do exterior antes de ingressar',
      'Arrombar a porta e deitar-se imediatamente no meio do cômodo',
      'Atirar aleatoriamente através das paredes de gesso para limpar o espaço',
    ],
    answerIndex: 1,
    explanation:
      "O fatiamento angular ('fatiar a torta') permite que o operador exponha apenas uma pequena fração do seu corpo por vez enquanto investiga cantos ocultos.",
  },
  {
    id: 'q12',
    question:
      'Qual característica psicológica é indispensável para um operador do GTO sob estresse severo?',
    options: [
      'Pânico descontrolado e reação de fuga imediata',
      'Equilíbrio emocional, raciocínio lógico analítico e foco estrito na segurança da equipe',
      'Sentimento de raiva extrema e agressividade irrefreável',
      'Apatia completa perante os perigos e riscos presentes no ambiente',
    ],
    answerIndex: 1,
    explanation:
      'O controle emocional permite que o cérebro processe cenários de caos com clareza, tomando decisões éticas e eficazes em milissegundos.',
  },
  {
    id: 'q13',
    question: "O que representa a denominação 'zona quente' em um perímetro de crise tática?",
    options: [
      'A área de descanso climatizada onde ficam guardadas as viaturas',
      'O local com risco iminente, ameaça ativa ou fogo de armas direcionado',
      'A cozinha do alojamento central do batalhão',
      'O posto de comando onde se reúnem as autoridades civis',
    ],
    answerIndex: 1,
    explanation:
      'A Zona Quente (Hot Zone) é o quadrante tático onde existe perigo ativo direto e imediato à integridade física dos operadores.',
  },
  {
    id: 'q14',
    question:
      'Qual o protocolo recomendado de comunicação via rádio em operações especiais do GTO?',
    options: [
      'Conversas descontraídas, extensas e repletas de detalhes pessoais',
      'Mensagens objetivas, linguagem clara padronizada e transmissões estritamente necessárias',
      'Debater abertamente as estratégias com críticas na frequência operacional ativa',
      'Manter o botão de transmissão travado constantemente para capturar ruídos ambientais',
    ],
    answerIndex: 1,
    explanation:
      'Comunicações via rádio devem ser extremamente breves e diretas para manter o canal limpo para alertas críticos e evitar o cansaço auditivo da equipe.',
  },
  {
    id: 'q15',
    question:
      'Qual o propósito central de planejar e memorizar rotas de contingência ou rotas de fuga?',
    options: [
      'Facilitar desvios casuais para compras durante patrulhas',
      'Garantir a evacuação segura de feridos e a continuidade da missão se o caminho principal for bloqueado',
      'Gerar relatórios de consumo excessivo de combustível',
      'Dificultar a localização da equipe pelas forças aliadas de segurança',
    ],
    answerIndex: 1,
    explanation:
      'Rotas de contingência salvam vidas, permitindo que a equipe mude de curso rapidamente em caso de emboscada, acidentes ou bloqueios inesperados.',
  },
];

// ---------------------------------------------------------------------------
// Default Portal State
// ---------------------------------------------------------------------------
const DEFAULT_PORTAL_DATA = {
  adminCredentials: {
    username: 'admin',
    // Stored in plain text only until the first successful login, at which
    // point the server automatically upgrades it to a salted hash (see
    // verifyAdminCredentials below). Change this via an env var in
    // production: ADMIN_DEFAULT_PASSWORD.
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'gto-password-2026',
  },
  discordWebhook: '',
  history: {
    title: 'Grupo Tático de Operações - GTO',
    subtitle: 'FORÇA, HONRA E DISCIPLINA',
    content:
      'Há mais de cinco anos, iniciamos uma jornada que foi muito além do Roleplay. O que começou como um grupo de amigos apaixonados pelo policiamento dentro do FiveM transformou-se em uma verdadeira irmandade.\n\nDurante essa caminhada, construímos nossa história servindo em diversas corporações e unidades especializadas, sempre buscando excelência, disciplina e comprometimento com um RP sério e de qualidade.\n\nAo longo dos anos, acumulamos experiências em organizações como ROTA, Polícia Rodoviária Federal, GATE, Exército Brasileiro, Polícia Civil, Choque e GOE. Cada treinamento, patrulhamento, operação e ocorrência contribuiu para nossa evolução, fortalecendo não apenas nossas habilidades, mas também os laços que criamos entre nós.\n\nMais do que patentes ou cargos, aprendemos que uma equipe forte é construída através da confiança, do respeito e da amizade.\n\nHoje, o Grupo Tático de Operações (GTO) representa tudo aquilo que construímos durante essa trajetória: união, disciplina, profissionalismo e compromisso com um Roleplay de alto nível.\n\nCada operação realizada, cada certificado conquistado, cada patrulhamento e cada desafio enfrentado fazem parte da nossa história e representam o esforço coletivo de todos que ajudaram a construir essa família.\n\nO GTO não é apenas uma unidade policial dentro do FiveM.\n\nÉ uma irmandade construída ao longo de cinco anos de dedicação.',
    about:
      'O Grupo Tático de Operações (GTO) é uma unidade tática especializada de pronto emprego, preparada para atuar em ocorrências de alta complexidade, patrulhamento tático, gerenciamento de crises, operações especiais, cumprimento de mandados e apoio às demais unidades operacionais.\n\nNossa atuação é baseada em disciplina, treinamento constante, trabalho em equipe e respeito às boas práticas do Roleplay, buscando oferecer uma experiência séria, organizada e imersiva para todos os participantes.\n\nMais do que formar policiais, buscamos formar pessoas comprometidas com os valores da organização e com o crescimento coletivo da equipe.',
    homenagemText:
      'Nenhuma trajetória é construída sozinha. Ao longo desses cinco anos tivemos o privilégio de dividir momentos inesquecíveis com pessoas que deixaram sua marca na nossa história. Cada treinamento, cada operação, cada conquista e cada dificuldade enfrentada fortaleceram uma amizade que vai muito além do jogo. Esta homenagem é um sincero agradecimento a todos que caminharam conosco e ajudaram a transformar o GTO em uma verdadeira família.',
    homenagemNames: [
      'Huanzinho77',
      'PlayboyRJ',
      'Marcos Baloso',
      'Igor PNPL',
      'Ycaro',
      'Gonzaga',
      'Halemão',
      'Iago',
      'Foguinho',
      'Borges',
      'Bene Frances',
    ],
    bannerUrl:
      'https://images.unsplash.com/photo-1508847154043-be12a327dc6f?q=80&w=1200&auto=format&fit=crop',
  },
  timeline: [
    {
      id: 't1',
      year: '2010',
      title: 'Fundação do GTO',
      description:
        'Criação oficial da unidade tática para dar resposta rápida a crimes de alta complexidade e sequestros.',
    },
    {
      id: 't2',
      year: '2014',
      title: 'Implantação do Núcleo de CQB',
      description:
        'Treinamento intensivo de combate em ambientes fechados com instrutores nacionais e internacionais.',
    },
    {
      id: 't3',
      year: '2018',
      title: 'Modernização Tecnológica',
      description:
        'Aquisição de armamento avançado, blindagens e drones táticos de reconhecimento aéreo.',
    },
    {
      id: 't4',
      year: '2022',
      title: 'Operações Integradas',
      description:
        'Alcançou o recorde histórico de neutralização de facções criminosas através de ações coordenadas.',
    },
    {
      id: 't5',
      year: '2026',
      title: 'Digitalização e Novo Portal',
      description:
        'Abertura do processo seletivo unificado tático online com acompanhamento em tempo real.',
    },
  ],
  statistics: [
    {
      id: 's1',
      label: 'Operações Realizadas',
      value: '1,840+',
      icon: 'ShieldAlert',
    },
    {
      id: 's2',
      label: 'Ilícitos Apreendidos (Ton)',
      value: '42.5 T',
      icon: 'Flame',
    },
    {
      id: 's3',
      label: 'Prisões Efetuadas',
      value: '2,150+',
      icon: 'UserX',
    },
    {
      id: 's4',
      label: 'Operadores Formados',
      value: '380+',
      icon: 'Award',
    },
  ],
  gallery: [
    {
      id: 'g1',
      url: 'https://images.unsplash.com/photo-1590418606746-018840f9cd0f?q=80&w=800&auto=format&fit=crop',
      caption: 'Treinamento tático sob condições climáticas extremas.',
      date: 'Maio de 2025',
      category: 'Patrulhamento',
    },
    {
      id: 'g2',
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop',
      caption: 'Simulação de combate urbano em ambiente de rádio-silêncio.',
      date: 'Setembro de 2025',
      category: 'Operações',
    },
    {
      id: 'g3',
      url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=800&auto=format&fit=crop',
      caption: 'Briefing operacional estratégico antes do desdobramento tático.',
      date: 'Novembro de 2025',
      category: 'Certificados',
    },
    {
      id: 'g4',
      url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format&fit=crop',
      caption: 'Tecnologia e drones sendo empregados no patrulhamento de divisas.',
      date: 'Janeiro de 2026',
      category: 'Abordagens',
    },
    {
      id: 'g5',
      url: 'https://images.unsplash.com/photo-1584438784894-089d6a128f3e?q=80&w=800&auto=format&fit=crop',
      caption: 'Apreensão de grande quantidade de contrabando e armamentos clandestinos.',
      date: 'Março de 2026',
      category: 'Apreensões',
    },
  ],
  questions: DEFAULT_QUESTIONS,
  // No fake demo submissions by default in production — a fresh install
  // should start with an empty inbox.
  submissions: [] as any[],
};

// Deep-clones a slice of DEFAULT_PORTAL_DATA before it's written into the
// live dataset, so later edits to that dataset never mutate the shared
// default object in memory.
function cloneDefault<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Data persistence
// ---------------------------------------------------------------------------
// Strategy:
//   - LOCAL DEV (no BLOB_READ_WRITE_TOKEN): read/write data.json on disk.
//   - PRODUCTION (BLOB_READ_WRITE_TOKEN set): store the entire portal JSON
//     as a single file called "portal-data.json" in Vercel Blob.
// This replaces the deprecated @vercel/kv entirely.
// ---------------------------------------------------------------------------

const BLOB_DATA_FILENAME = 'portal-data.json';

function hasBlobConfig(): boolean {
  return !!process.env.MY_BLOB_TOKEN || !!process.env.BLOB_READ_WRITE_TOKEN;
}

function readLocalData(): any {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    // Ignore error
  }
  return null;
}

function writeLocalData(data: any): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local data.json:', err);
    return false;
  }
}

// We do not use an in-memory cache for blob data because serverless instances
// do not share memory. Using a local cache causes stale data for users.

// Discriminated result so callers can distinguish "file not found" from
// "read error" — critical to avoid overwriting saved data on transient errors.
type BlobReadResult =
  | { status: 'ok'; data: any }
  | { status: 'not_found' }
  | { status: 'error'; err: unknown };

async function readBlobData(): Promise<BlobReadResult> {
  try {
    const token = process.env.MY_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    const { blobs } = await list({ prefix: BLOB_DATA_FILENAME, token });
    const match = blobs.find((b) => b.pathname === BLOB_DATA_FILENAME);
    if (!match) return { status: 'not_found' };
    // Cache-busting: prevent Vercel CDN from serving a stale version
    const bustUrl = `${match.url}?t=${Date.now()}`;
    const response = await fetch(bustUrl, {
      headers: { 'Cache-Control': 'no-cache, no-store' },
    });
    if (!response.ok) return { status: 'error', err: new Error(`HTTP ${response.status}`) };
    const data = await response.json();
    return { status: 'ok', data };
  } catch (err) {
    console.error('Error reading blob data:', err);
    return { status: 'error', err };
  }
}

async function writeBlobData(data: any): Promise<boolean> {
  try {
    const json = JSON.stringify(data);
    const buffer = Buffer.from(json, 'utf-8');
    const token = process.env.MY_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    console.log('[BLOB] token present:', !!token, 'token prefix:', token?.substring(0, 15));
    await put(BLOB_DATA_FILENAME, buffer, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0, // Prevent CDN from caching — always return fresh data
      token,
    });
    return true;
  } catch (err: any) {
    console.error('Error writing blob data:', err?.message, err?.cause?.message, JSON.stringify(err));
    return false;
  }
}

async function applyMigrations(data: any): Promise<{ data: any; updated: boolean }> {
  let updated = false;
  if (!data.history) {
    data.history = cloneDefault(DEFAULT_PORTAL_DATA.history);
    updated = true;
  } else if (data.history.about === undefined) {
    const defaults = cloneDefault(DEFAULT_PORTAL_DATA.history);
    data.history.about = defaults.about;
    data.history.homenagemText = data.history.homenagemText ?? defaults.homenagemText;
    data.history.homenagemNames = data.history.homenagemNames ?? defaults.homenagemNames;
    delete data.history.mission;
    delete data.history.values;
    updated = true;
  }
  if (Array.isArray(data.submissions)) {
    data.submissions.forEach((submission: any) => {
      if (!submission.passport && submission.phone) {
        submission.passport = submission.phone;
        delete submission.phone;
        updated = true;
      }
    });
  }
  if (Array.isArray(data.gallery)) {
    const fallbackCategoryById: Record<string, string> = {
      g1: 'Patrulhamento',
      g2: 'Operações',
      g3: 'Certificados',
      g4: 'Abordagens',
      g5: 'Apreensões',
    };
    data.gallery.forEach((item: any) => {
      const oldCat = item.category || fallbackCategoryById[item.id] || 'Patrulhamento';
      let newCat = 'Patrulhamento';
      if (oldCat.includes('Operações') || oldCat.includes('Operação')) newCat = 'Operações';
      else if (oldCat.includes('Patrulhamento')) newCat = 'Patrulhamento';
      else if (oldCat.includes('Abordagens') || oldCat.includes('Abordagem')) newCat = 'Abordagens';
      else if (oldCat.includes('Certificados') || oldCat.includes('Certificado'))
        newCat = 'Certificados';
      else if (oldCat.includes('Apreensões') || oldCat.includes('Apreensão')) newCat = 'Apreensões';
      if (item.category !== newCat) {
        item.category = newCat;
        updated = true;
      }
    });
  }
  return { data, updated };
}

async function getPortalData(): Promise<any> {
  // ── Local dev ──────────────────────────────────────────────────────────────
  if (!hasBlobConfig()) {
    console.warn(
      '[WARN] No BLOB_READ_WRITE_TOKEN configured. Using local data.json (data will reset on each deploy).' +
      ' Set BLOB_READ_WRITE_TOKEN in your Vercel project environment variables to persist data.'
    );
    const local = readLocalData();
    return local ?? cloneDefault(DEFAULT_PORTAL_DATA);
  }

  // ── Production: Vercel Blob ────────────────────────────────────────────────
  const result = await readBlobData();

  if (result.status === 'not_found') {
    // First run: blob file doesn't exist yet → seed with defaults and save.
    console.log('[BLOB] portal-data.json not found, seeding with defaults.');
    const data = cloneDefault(DEFAULT_PORTAL_DATA);
    await writeBlobData(data);
    return data;
  }

  if (result.status === 'error') {
    // Transient read error: return defaults IN MEMORY only — NEVER overwrite
    // the saved blob, or we'd erase all user data on a bad network request.
    console.error('[BLOB] Read error — returning in-memory defaults WITHOUT overwriting saved data.');
    return cloneDefault(DEFAULT_PORTAL_DATA);
  }

  // status === 'ok'
  try {
    const { data: migrated, updated } = await applyMigrations(result.data);
    if (updated) await writeBlobData(migrated);
    return migrated;
  } catch (error) {
    console.error('Error applying migrations, returning unmodified data:', error);
    return result.data;
  }
}

async function savePortalData(data: any): Promise<boolean> {
  // ── Local dev ──────────────────────────────────────────────────────────────
  if (!hasBlobConfig()) {
    return writeLocalData(data);
  }

  // ── Production: Vercel Blob ────────────────────────────────────────────────
  return writeBlobData(data);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const requireAdmin = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = await getAdminToken();
  if (authHeader === `Bearer ${token}`) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }
};

// Very small in-memory brute-force guard for the login endpoint. This is
// intentionally simple (no external dependency) and resets on restart, but
// it's enough to slow down naive password-guessing attempts.
const loginAttemptsByIp = new Map<string, { count: number; windowStart: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttemptsByIp.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

function resetLoginAttempts(ip: string) {
  loginAttemptsByIp.delete(ip);
}

// Verifies a login attempt against stored credentials, transparently
// upgrading a legacy plain-text password to a salted hash on first success.
async function verifyAdminCredentials(
  data: any,
  username: string,
  password: string
): Promise<boolean> {
  const creds = data.adminCredentials || DEFAULT_PORTAL_DATA.adminCredentials;
  if (username !== creds.username) return false;

  if (isHashedPassword(creds.password)) {
    return verifyPassword(password, creds.password);
  }

  const matches = password === creds.password;
  if (matches) {
    data.adminCredentials.password = hashPassword(password);
    await savePortalData(data);
  }
  return matches;
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// 1. Get Portal Data (excludes credentials for safety)
app.get('/api/content', async (req, res) => {
  const data = await getPortalData();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adminCredentials, ...publicData } = data;
  res.json(publicData);
});

// 2. Admin Login
app.post('/api/login', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (isLoginRateLimited(ip)) {
    return res.status(429).json({
      error: 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
    });
  }

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const data = await getPortalData();
  if (await verifyAdminCredentials(data, username, password)) {
    resetLoginAttempts(ip);
    // Return the real session token so subsequent authenticated requests work
    res.json({ token: ADMIN_TOKEN, username });
  } else {
    res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }
});

// 3. Update Portal Data
app.post('/api/content', requireAdmin, async (req, res) => {
  const incomingData = req.body || {};
  const currentData = await getPortalData();

  const updatedData = {
    ...currentData,
    history:
      incomingData.history && typeof incomingData.history === 'object'
        ? incomingData.history
        : currentData.history,
    timeline: Array.isArray(incomingData.timeline) ? incomingData.timeline : currentData.timeline,
    statistics: Array.isArray(incomingData.statistics)
      ? incomingData.statistics
      : currentData.statistics,
    gallery: Array.isArray(incomingData.gallery) ? incomingData.gallery : currentData.gallery,
    questions: Array.isArray(incomingData.questions)
      ? incomingData.questions
      : currentData.questions,
    discordWebhook:
      typeof incomingData.discordWebhook === 'string'
        ? incomingData.discordWebhook
        : currentData.discordWebhook,
  };

  if (
    incomingData.adminCredentials &&
    typeof incomingData.adminCredentials.username === 'string' &&
    incomingData.adminCredentials.username.trim() &&
    typeof incomingData.adminCredentials.password === 'string' &&
    incomingData.adminCredentials.password.trim().length >= 6
  ) {
    updatedData.adminCredentials = {
      username: incomingData.adminCredentials.username.trim(),
      password: hashPassword(incomingData.adminCredentials.password.trim()),
    };
  }

  if (await savePortalData(updatedData)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminCredentials, ...publicData } = updatedData;
    res.json({ success: true, data: publicData });
  } else {
    res.status(500).json({ error: 'Erro ao salvar os dados no servidor.' });
  }
});

// Only these image types may be uploaded. The extension used on disk is
// derived from the verified MIME type inside the base64 payload itself, not
// from the client-supplied filename — this prevents someone from uploading
// an executable/script disguised with an image-looking filename.
const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Initialize multer for file uploads (must be declared before use)
const upload = multer();

// Image Upload Endpoint (protected)
app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res) => {
  // ── Accept a raw URL: just return it as-is (no upload needed) ──────────────
  // Check both top-level body.url and body.base64 that looks like a URL
  const rawUrl = req.body?.url;
  if (
    typeof rawUrl === 'string' &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  ) {
    return res.json({ success: true, url: rawUrl });
  }

  // Accept either a JSON body with a base64 string or a multipart file upload
  let base64: string | undefined;
  if (req.body && typeof req.body.base64 === 'string') {
    base64 = req.body.base64;
  } else if (req.file && req.file.buffer) {
    const mime = req.file.mimetype;
    const data = req.file.buffer.toString('base64');
    base64 = `data:${mime};base64,${data}`;
  }

  if (!base64) {
    return res.status(400).json({ error: 'Dados de upload inválidos.' });
  }

  // Also handle if base64 field is actually a plain URL
  if (base64.startsWith('http://') || base64.startsWith('https://')) {
    return res.json({ success: true, url: base64 });
  }

  const matches = base64.match(/^data:([A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Formato Base64 inválido.' });
  }

  const mimeType = matches[1].toLowerCase();
  const extension = ALLOWED_IMAGE_EXTENSIONS[mimeType];
  if (!extension) {
    return res.status(400).json({
      error: 'Tipo de arquivo não permitido. Envie apenas imagens PNG, JPG, WEBP ou GIF.',
    });
  }

  try {
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'A imagem excede o limite máximo de 25MB.' });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;

    // Save to Vercel Blob or fallback to local storage
    let fileUrl = '';
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, buffer, { access: 'public' });
      fileUrl = blob.url;
    } else {
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      fileUrl = `/uploads/${filename}`;
    }

    res.json({ success: true, url: fileUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Erro ao salvar imagem no servidor.' });
  }
});

// 4. Delete a Candidate Submission
app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const currentData = await getPortalData();
  currentData.submissions = (currentData.submissions || []).filter((sub: any) => sub.id !== id);

  if (await savePortalData(currentData)) {
    res.json({ success: true, message: 'Inscrição removida com sucesso.' });
  } else {
    res.status(500).json({ error: 'Erro ao deletar inscrição.' });
  }
});

// 5. Submit candidate test
app.post('/api/submit-test', async (req, res) => {
  const { name, discordTag, age, passport, phone, answers } = req.body || {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedDiscordTag = typeof discordTag === 'string' ? discordTag.trim() : '';
  const contactInfo =
    typeof passport === 'string' && passport.trim()
      ? passport.trim()
      : typeof phone === 'string'
        ? phone.trim()
        : '';
  const trimmedAge = typeof age === 'string' ? age.trim() : age;

  if (
    !trimmedName ||
    !trimmedDiscordTag ||
    !trimmedAge ||
    !contactInfo ||
    !Array.isArray(answers)
  ) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  if (trimmedName.length > 100 || trimmedDiscordTag.length > 100 || contactInfo.length > 50) {
    return res.status(400).json({ error: 'Um ou mais campos excedem o tamanho máximo permitido.' });
  }

  const data = await getPortalData();
  const questions = data.questions || DEFAULT_QUESTIONS;

  if (answers.length !== questions.length) {
    return res.status(400).json({
      error: 'O número de respostas enviadas não corresponde ao número de questões do teste.',
    });
  }

  // Calculate score
  let score = 0;
  answers.forEach((ans: number, idx: number) => {
    if (questions[idx] && questions[idx].answerIndex === ans) {
      score++;
    }
  });

  // Aprovação exige pelo menos 11 de 15 acertos (~73%).
  const passed = score >= 11;

  const newSubmission = {
    id: 'sub-' + crypto.randomUUID(),
    name: trimmedName,
    discordTag: trimmedDiscordTag,
    age: trimmedAge,
    passport: contactInfo,
    answers,
    score,
    timestamp: new Date().toISOString(),
    passed,
  };

  data.submissions = data.submissions || [];
  data.submissions.unshift(newSubmission);
  await savePortalData(data);

  // Send Discord Webhook if configured
  const webhookUrl = data.discordWebhook || process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    try {
      const embedFields = [
        { name: 'Candidato', value: newSubmission.name, inline: true },
        { name: 'Discord ID', value: newSubmission.discordTag, inline: true },
        { name: 'Idade', value: `${newSubmission.age} anos`, inline: true },
        { name: 'Passaporte (ID)', value: newSubmission.passport, inline: true },
        {
          name: 'Pontuação',
          value: `**${score} / ${questions.length}** (${Math.round((score / questions.length) * 100)}%)`,
          inline: true,
        },
        {
          name: 'Status',
          value: passed ? '🟢 **APROVADO (Apto para TAF)**' : '🔴 **REPROVADO**',
          inline: true,
        },
      ];

      const discordPayload = {
        username: 'Portal GTO - Recrutamento',
        avatar_url:
          'https://images.unsplash.com/photo-1508847154043-be12a327dc6f?q=80&w=200&auto=format&fit=crop',
        embeds: [
          {
            title: '⚡ Nova Ficha de Inscrição Recebida',
            description:
              'Um candidato realizou o teste tático do GTO pelo portal oficial. Veja os detalhes abaixo:',
            color: passed ? 3066993 : 15158332, // Green or Red
            fields: embedFields,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Portal GTO Oficial • Sistema de Triagem Automática',
            },
          },
        ],
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });
      console.log('Discord webhook sent successfully.');
    } catch (err) {
      console.error('Failed to send Discord webhook:', err);
    }
  }

  res.json({ success: true, score, passed, total: questions.length });
});

// 6. Gemini-powered text improver / writer
app.post('/api/ai-suggest', async (req, res) => {
  const { section, originalText, instructions } = req.body || {};
  const client = getGeminiClient();

  if (!client) {
    return res.status(503).json({
      error:
        'API Key do Gemini não configurada ou inválida. Configure nas configurações de segredo do AI Studio.',
    });
  }

  if (typeof originalText === 'string' && originalText.length > 8000) {
    return res.status(400).json({
      error: 'O texto original excede o tamanho máximo permitido para processamento por IA.',
    });
  }
  if (typeof instructions === 'string' && instructions.length > 1000) {
    return res
      .status(400)
      .json({ error: 'As instruções fornecidas excedem o tamanho máximo permitido.' });
  }

  try {
    const prompt = `Você é um assessor de comunicação militar e tático sênior.
Escreva em Português do Brasil com tom altamente profissional, tático, inspirador e imponente, ideal para uma força policial tática especial (GTO - Grupo Tático de Operações).

Tarefa: Refinar ou gerar texto para a seção: "${section}".
Texto original atual: "${originalText || 'Nenhum'}"
Instruções adicionais de ajuste: "${instructions || 'Tornar mais heroico, impactante e militarizado.'}"

Por favor, escreva um parágrafo polido, sem quebras de linha longas ou formatações markdown excessivas (use apenas texto fluido). Não adicione saudações de IA (como "Aqui está o seu texto:"), forneça diretamente apenas o texto final polido.`;

    const model = 'gemini-2.5-flash'; // Standard, fast, high-performance
    const response = await client.models.generateContent({
      model,
      contents: prompt,
    });

    const resultText = response.text?.trim() || '';
    res.json({ result: resultText });
  } catch (error: any) {
    console.error('Gemini AI API error:', error);
    res.status(500).json({
      error: 'Erro ao se comunicar com a Inteligência Artificial do Gemini: ' + error.message,
    });
  }
});



export default app;
