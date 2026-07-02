import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.disable('x-powered-by');

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
function loadOrCreateAdminToken(): string {
  if (process.env.ADMIN_TOKEN_SECRET) {
    return process.env.ADMIN_TOKEN_SECRET;
  }
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const existing = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (existing) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(TOKEN_FILE, generated, 'utf8');
    return generated;
  } catch (err) {
    console.error('Could not persist admin token, using an in-memory token instead:', err);
    return crypto.randomBytes(32).toString('hex');
  }
}
const ADMIN_TOKEN = loadOrCreateAdminToken();

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
// Default data (simplified – full data lives in server.ts)
// ---------------------------------------------------------------------------
const DEFAULT_QUESTIONS = [] as any[]; // placeholder – actual questions are defined in server.ts
const DEFAULT_PORTAL_DATA = {
  adminCredentials: {
    username: 'admin',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'gto-password-2026',
  },
  discordWebhook: '',
  history: {
    title: 'Grupo Tático de Operações - GTO',
    subtitle: 'FORÇA, HONRA E DISCIPLINA',
    content: '',
    about: '',
    homenagemText: '',
    homenagemNames: [],
    bannerUrl: 'https://images.unsplash.com/photo-1508847154043-be12a327dc6f?q=80&w=1200&auto=format&fit=crop',
  },
  timeline: [],
  statistics: [],
  gallery: [],
  questions: DEFAULT_QUESTIONS,
  submissions: [],
};

function cloneDefault<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getPortalData(): any {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const fresh = cloneDefault(DEFAULT_PORTAL_DATA);
      fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2), 'utf8');
      return fresh;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading portal data, returning default fallback:', error);
    return cloneDefault(DEFAULT_PORTAL_DATA);
  }
}

function savePortalData(data: any): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing portal data:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }
};

// Rate limiting for login
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

function verifyAdminCredentials(data: any, username: string, password: string): boolean {
  const creds = data.adminCredentials || DEFAULT_PORTAL_DATA.adminCredentials;
  if (username !== creds.username) return false;
  if (isHashedPassword(creds.password)) {
    return verifyPassword(password, creds.password);
  }
  const matches = password === creds.password;
  if (matches) {
    data.adminCredentials.password = hashPassword(password);
    savePortalData(data);
  }
  return matches;
}

// ---------------------------------------------------------------------------
// API Endpoints (mirroring original server.ts)
// ---------------------------------------------------------------------------
app.get('/api/content', (req, res) => {
  const data = getPortalData();
  const { adminCredentials, ...publicData } = data;
  res.json(publicData);
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (isLoginRateLimited(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }
  const data = getPortalData();
  if (verifyAdminCredentials(data, username, password)) {
    resetLoginAttempts(ip);
    res.json({ token: ADMIN_TOKEN, username });
  } else {
    res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }
});

app.post('/api/content', requireAdmin, (req, res) => {
  const incomingData = req.body || {};
  const currentData = getPortalData();
  const updatedData = { ...currentData, ...incomingData };
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
  if (savePortalData(updatedData)) {
    const { adminCredentials, ...publicData } = updatedData;
    res.json({ success: true, data: publicData });
  } else {
    res.status(500).json({ error: 'Erro ao salvar os dados no servidor.' });
  }
});

export default app;
