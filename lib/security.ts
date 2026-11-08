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
  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "Localhost (ID)";
  }

  return "ID (Indonesia)";
}
