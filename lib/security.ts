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
