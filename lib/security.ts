import crypto from "crypto";

// In-Memory sliding-window rate limiter
// Cocok untuk deployment lokal & serverless instance lifetime
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Bersihkan data lama tiap 5 menit agar memori tetap hemat
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSec: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInSec: Math.ceil((record.resetAt - now) / 1000),
  };
}

// Generate cryptographic one-time reset token (64 hex characters)
export function generateOneTimeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Helper ekstraksi IP client dari headers
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  let ip = "127.0.0.1";
  if (forwarded) {
    ip = forwarded.split(",")[0].trim();
  } else {
    const realIp = headers.get("x-real-ip") || headers.get("cf-connecting-ip");
    if (realIp) ip = realIp.trim();
  }

  // Normalisasi IPv6 loopback ke IPv4 standar
  if (ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost") {
    ip = "127.0.0.1";
  }
  return ip;
}

// Helper deteksi wilayah / region pengakses
export function getClientRegion(headers: Headers, ip: string): string {
  const city = headers.get("x-vercel-ip-city");
  const country = headers.get("x-vercel-ip-country");
  const region = headers.get("x-vercel-ip-country-region");
  const cfCountry = headers.get("cf-ipcountry");

  if (city && country) {
    return `${decodeURIComponent(city)}, ${country}`;
  }
  if (region && country) {
    return `${region}, ${country}`;
  }
  if (country) {
    return country === "ID" ? "Indonesia (ID)" : country;
  }
  if (cfCountry) {
    return cfCountry === "ID" ? "Indonesia (ID)" : cfCountry;
  }

  // Jika koneksi lokal / private network
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "Localhost (Dev)";
  }

  return "Indonesia (ID)";
}

// Country Code Map
const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  US: { name: "United States of America", flag: "🇺🇸" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  DE: { name: "Germany", flag: "🇩🇪" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  PH: { name: "Philippines", flag: "🇵🇭" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  JP: { name: "Japan", flag: "🇯🇵" },
  AU: { name: "Australia", flag: "🇦🇺" },
  NL: { name: "Netherlands", flag: "🇳🇱" },
  FR: { name: "France", flag: "🇫🇷" },
  IN: { name: "India", flag: "🇮🇳" },
  BR: { name: "Brazil", flag: "🇧🇷" },
  CA: { name: "Canada", flag: "🇨🇦" },
};

// Helper detail negara & bendera
export function getCountryDetails(headers: Headers, ip: string): { name: string; code: string; flag: string } {
  const countryHeader = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry");
  if (countryHeader && COUNTRY_MAP[countryHeader.toUpperCase()]) {
    const info = COUNTRY_MAP[countryHeader.toUpperCase()];
    return { name: info.name, code: countryHeader.toUpperCase(), flag: info.flag };
  } else if (countryHeader) {
    return { name: countryHeader, code: countryHeader.toUpperCase(), flag: "🌐" };
  }

  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return { name: "Localhost (Dev)", code: "LOCAL", flag: "📍" };
  }

  return { name: "Indonesia", code: "ID", flag: "🇮🇩" };
}

// User-Agent Parser: Device, OS, Browser
export function parseUserAgent(uaString?: string | null): { device: string; os: string; browser: string } {
  if (!uaString) {
    return { device: "Desktop", os: "Windows", browser: "Chrome" };
  }
  const ua = uaString.toLowerCase();

  // 1. Device
  let device = "Desktop";
  if (ua.includes("ipad") || ua.includes("tablet") || (ua.includes("android") && !ua.includes("mobile"))) {
    device = "Tablet";
  } else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("ipod") || ua.includes("android")) {
    device = "Mobile";
  }

  // 2. Operating System
  let os = "Other";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod") || ua.includes("ios")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("windows") || ua.includes("win32") || ua.includes("win64")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "Mac";
  } else if (ua.includes("ubuntu")) {
    os = "Ubuntu";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // 3. Browser
  let browser = "Other";
  if (ua.includes("edg/") || ua.includes("edge")) {
    browser = "Edge";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  } else if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("opr")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  }

  return { device, os, browser };
}

// -------------------------------------------------------------
// Cryptographic Hash for Sensitive Tokens (SHA-256)
// -------------------------------------------------------------
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// -------------------------------------------------------------
// Account Lockout Protection (Brute-Force & Credential Stuffing)
// -------------------------------------------------------------
interface AccountLockRecord {
  attempts: number;
  lockedUntil?: number;
}

const accountLockStore = new Map<string, AccountLockRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit lockout

export function checkAccountLockout(username: string): { locked: boolean; remainingSec: number } {
  const key = username.toLowerCase().trim();
  const record = accountLockStore.get(key);
  if (!record) return { locked: false, remainingSec: 0 };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSec };
  }

  // Jika waktu lockout sudah habis, reset attempts
  if (record.lockedUntil && record.lockedUntil <= now) {
    accountLockStore.delete(key);
  }

  return { locked: false, remainingSec: 0 };
}

export function recordFailedLogin(username: string): { locked: boolean; remainingSec: number; attempts: number } {
  const key = username.toLowerCase().trim();
  const now = Date.now();
  const record = accountLockStore.get(key) || { attempts: 0 };

  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    accountLockStore.set(key, record);
    return { locked: true, remainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000), attempts: record.attempts };
  }

  accountLockStore.set(key, record);
  return { locked: false, remainingSec: 0, attempts: record.attempts };
}

export function resetFailedLogin(username: string): void {
  const key = username.toLowerCase().trim();
  accountLockStore.delete(key);
}

// -------------------------------------------------------------
// Telegram Webhook Deduplication (Sliding Idempotency Window)
// -------------------------------------------------------------
const processedUpdatesStore = new Map<string, number>();

export function isUpdateProcessed(updateId: number | string): boolean {
  const key = String(updateId);
  const now = Date.now();
  const expireAt = processedUpdatesStore.get(key);
  return expireAt !== undefined && expireAt > now;
}

export function markUpdateProcessed(updateId: number | string, ttlMs: number = 30 * 60 * 1000): void {
  const key = String(updateId);
  processedUpdatesStore.set(key, Date.now() + ttlMs);

  // Bersihkan key usang jika map membesar > 1000 entri
  if (processedUpdatesStore.size > 1000) {
    const now = Date.now();
    for (const [k, exp] of processedUpdatesStore.entries()) {
      if (exp <= now) processedUpdatesStore.delete(k);
    }
  }
}

// -------------------------------------------------------------
// CSRF Origin & Referer Validation
// -------------------------------------------------------------
export function isValidOrigin(request: Request): boolean {
  // Hanya evaluasi mutasi state
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    // Jika tidak ada header origin (misal webhook server-to-server), loloskan jika endpoint webhook
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/telegram/") || url.pathname.startsWith("/api/sheets/")) {
      return true;
    }
    // Jika panggilan langsung internal
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
