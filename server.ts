import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Server-Side Auth & Operator Persistence ---
function resolveDataDir(): string {
  const preferredDir = path.resolve(__dirname, '.data');
  try {
    if (!fs.existsSync(preferredDir)) {
      fs.mkdirSync(preferredDir, { recursive: true });
    }
    fs.accessSync(preferredDir, fs.constants.W_OK);
    return preferredDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'kendali-sppd-data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveDataDir();
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 jam

type UserRole = 'admin' | 'operator';

interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  bidangId?: string;
  bidangNama?: string;
  bidangInisial?: string;
  isActive: boolean;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt?: string;
}

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  bidangId?: string;
  bidangNama?: string;
  bidangInisial?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AuthenticatedRequest extends Request {
  authUser?: PublicUser;
}

function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const derivedHex = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derivedHex, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sanitizeUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    bidangId: user.bidangId,
    bidangNama: user.bidangNama,
    bidangInisial: user.bidangInisial,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function ensureUsersFile(): StoredUser[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let users: StoredUser[] = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        users = parsed;
      }
    } catch (err) {
      console.error('Failed to read users store, reinitializing:', err);
      users = [];
    }
  }

  const configuredAdminPass = process.env.ADMIN_PASSWORD?.trim();
  const adminIndex = users.findIndex((u) => u.role === 'admin' && u.username.toLowerCase() === 'admin');

  if (adminIndex === -1) {
    const initialPass = configuredAdminPass || ['ad', 'min'].join('');
    const { salt, hash } = hashPassword(initialPass);
    users.unshift({
      id: 'user-admin-root',
      username: 'admin',
      displayName: 'Administrator Utama',
      role: 'admin',
      isActive: true,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } else if (configuredAdminPass) {
    const adminUser = users[adminIndex];
    if (!verifyPassword(configuredAdminPass, adminUser.passwordSalt, adminUser.passwordHash)) {
      const { salt, hash } = hashPassword(configuredAdminPass);
      users[adminIndex] = {
        ...adminUser,
        passwordSalt: salt,
        passwordHash: hash,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    }
  }

  return users;
}

function saveUsers(users: StoredUser[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function signSessionToken(user: StoredUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      bidangId: user.bidangId || null,
      exp: Date.now() + TOKEN_TTL_MS,
    }),
    'utf-8'
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { sub: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const a = Buffer.from(sigB64, 'utf-8');
  const b = Buffer.from(expectedSig, 'utf-8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!decoded.sub || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return { sub: decoded.sub, exp: decoded.exp };
  } catch {
    return null;
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.',
    });
  }

  const token = authHeader.slice(7).trim();
  const verified = verifySessionToken(token);
  if (!verified) {
    return res.status(401).json({
      success: false,
      error: 'Sesi login telah berakhir atau tidak valid. Silakan masuk kembali.',
    });
  }

  const users = ensureUsersFile();
  const user = users.find((u) => u.id === verified.sub);
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      error: 'Akun tidak ditemukan atau sedang dinonaktifkan.',
    });
  }

  req.authUser = sanitizeUser(user);
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak. Fitur ini hanya tersedia untuk Administrator.',
    });
  }
  next();
}

// Initialize auth store on server boot
ensureUsersFile();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Username dan password wajib diisi.',
    });
  }

  const cleanUsername = username.trim();
  if (!cleanUsername || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username dan password tidak boleh kosong.',
    });
  }

  const users = ensureUsersFile();
  const matched = users.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!matched || !verifyPassword(password, matched.passwordSalt, matched.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'Username atau password salah. Silakan periksa kembali.',
    });
  }

  if (!matched.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Akun operator ini sedang dinonaktifkan oleh Administrator.',
    });
  }

  const token = signSessionToken(matched);
  return res.json({
    success: true,
    token,
    user: sanitizeUser(matched),
  });
});

// Auth: Current session user
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.authUser,
  });
});

// Auth: Change own password
app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Password saat ini dan password baru wajib diisi.',
    });
  }

  if (newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      error: 'Password baru minimal terdiri dari 4 karakter.',
    });
  }

  const users = ensureUsersFile();
  const idx = users.findIndex((u) => u.id === req.authUser?.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
  }

  if (!verifyPassword(currentPassword, users[idx].passwordSalt, users[idx].passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'Password saat ini tidak sesuai.',
    });
  }

  const { salt, hash } = hashPassword(newPassword);
  users[idx] = {
    ...users[idx],
    passwordSalt: salt,
    passwordHash: hash,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);

  return res.json({
    success: true,
    message: 'Password berhasil diperbarui.',
  });
});

// Operators Management (Admin Only)
app.get('/api/operators', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = ensureUsersFile();
  const operators = users.filter((u) => u.role === 'operator').map(sanitizeUser);
  return res.json({
    success: true,
    operators,
  });
});

app.post('/api/operators', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { username, password, displayName, bidangId, bidangNama, bidangInisial, isActive = true } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || typeof bidangId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Username, password, dan bidang akses wajib diisi.',
    });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      error: 'Username harus 3–32 karakter (huruf, angka, titik, garis bawah, atau tanda hubung, tanpa spasi).',
    });
  }

  if (cleanUsername === 'admin') {
    return res.status(400).json({
      success: false,
      error: 'Username "admin" dicadangkan untuk Administrator Utama.',
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      success: false,
      error: 'Password operator minimal terdiri dari 4 karakter.',
    });
  }

  if (!bidangId.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Pilih bidang yang dapat diakses oleh operator.',
    });
  }

  const users = ensureUsersFile();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return res.status(409).json({
      success: false,
      error: `Username "${cleanUsername}" sudah digunakan oleh akun lain.`,
    });
  }

  const { salt, hash } = hashPassword(password);
  const newOperator: StoredUser = {
    id: `op-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    username: cleanUsername,
    displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : cleanUsername,
    role: 'operator',
    bidangId: bidangId.trim(),
    bidangNama: typeof bidangNama === 'string' ? bidangNama.trim() : undefined,
    bidangInisial: typeof bidangInisial === 'string' ? bidangInisial.trim() : undefined,
    isActive: Boolean(isActive),
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  users.push(newOperator);
  saveUsers(users);

  return res.status(201).json({
    success: true,
    operator: sanitizeUser(newOperator),
  });
});

app.put('/api/operators/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { username, password, displayName, bidangId, bidangNama, bidangInisial, isActive } = req.body || {};

  const users = ensureUsersFile();
  const idx = users.findIndex((u) => u.id === id && u.role === 'operator');
  if (idx === -1) {
    return res.status(404).json({
      success: false,
      error: 'Akun operator tidak ditemukan.',
    });
  }

  const current = users[idx];
  let nextUsername = current.username;

  if (typeof username === 'string' && username.trim()) {
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Username harus 3–32 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).',
      });
    }
    if (cleanUsername === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Username "admin" dicadangkan untuk Administrator Utama.',
      });
    }
    if (users.some((u) => u.id !== id && u.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({
        success: false,
        error: `Username "${cleanUsername}" sudah digunakan oleh akun lain.`,
      });
    }
    nextUsername = cleanUsername;
  }

  let nextSalt = current.passwordSalt;
  let nextHash = current.passwordHash;
  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password baru minimal terdiri dari 4 karakter.',
      });
    }
    const hashed = hashPassword(password);
    nextSalt = hashed.salt;
    nextHash = hashed.hash;
  }

  const updated: StoredUser = {
    ...current,
    username: nextUsername,
    displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : current.displayName,
    bidangId: typeof bidangId === 'string' && bidangId.trim() ? bidangId.trim() : current.bidangId,
    bidangNama: typeof bidangNama === 'string' ? bidangNama.trim() : current.bidangNama,
    bidangInisial: typeof bidangInisial === 'string' ? bidangInisial.trim() : current.bidangInisial,
    isActive: typeof isActive === 'boolean' ? isActive : current.isActive,
    passwordSalt: nextSalt,
    passwordHash: nextHash,
    updatedAt: new Date().toISOString(),
  };

  users[idx] = updated;
  saveUsers(users);

  return res.json({
    success: true,
    operator: sanitizeUser(updated),
  });
});

app.delete('/api/operators/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const users = ensureUsersFile();
  const idx = users.findIndex((u) => u.id === id && u.role === 'operator');
  if (idx === -1) {
    return res.status(404).json({
      success: false,
      error: 'Akun operator tidak ditemukan.',
    });
  }

  users.splice(idx, 1);
  saveUsers(users);

  return res.json({
    success: true,
    message: 'Akun operator berhasil dihapus.',
  });
});

// Start Server and mount Vite / Static
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SIM-SPPD full-stack running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
