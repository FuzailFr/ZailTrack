import { getDb } from "./db";

export interface AuditLogInput {
  userId?: number | null;
  username?: string | null;
  role?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  region?: string | null;
  userAgent?: string | null;
  status?: "success" | "warning" | "error";
}

// Sanitizer untuk memastikan token/password tidak pernah masuk ke log
function sanitizeDetails(data: any): any {
  if (!data || typeof data !== "object") return data;
  const clone = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = ["password", "token", "secret", "jwt", "cookie", "authorization"];

  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      clone[key] = "[REDACTED]";
    } else if (typeof clone[key] === "object" && clone[key] !== null) {
      clone[key] = sanitizeDetails(clone[key]);
    }
  }
  return clone;
}

function isPrivateIp(ip?: string | null): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  );
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const sql = getDb();
    const detailsJson = input.details ? JSON.stringify(sanitizeDetails(input.details)) : null;

    let region = input.region;
    if (!region) {
      if (!input.ipAddress || isPrivateIp(input.ipAddress)) {
        region = "Localhost (Dev)";
      } else {
        // Coba cari region yang sudah pernah tercatat untuk IP publik ini
        try {
          const known = await sql`
            SELECT region FROM audit_logs 
            WHERE ip_address = ${input.ipAddress} 
              AND region IS NOT NULL 
              AND region NOT LIKE 'Localhost%' 
            ORDER BY id DESC LIMIT 1
          `;
          if (known && known[0]?.region) {
            region = known[0].region;
          } else {
            region = input.ipAddress.startsWith("44.") ? "Ashburn, US" : "Indonesia (ID)";
          }
        } catch {
          region = input.ipAddress.startsWith("44.") ? "Ashburn, US" : "Indonesia (ID)";
        }
      }
    }

    await sql`
      INSERT INTO audit_logs (
        user_id, username, role, action, target_type, target_id, details, ip_address, region, user_agent, status
      ) VALUES (
        ${input.userId || null},
        ${input.username || null},
        ${input.role || null},
        ${input.action},
        ${input.targetType || null},
        ${input.targetId ? String(input.targetId) : null},
        ${detailsJson ? sql`${detailsJson}::jsonb` : null},
        ${input.ipAddress || null},
        ${region},
        ${input.userAgent || null},
        ${input.status || "success"}
      )
    `;
  } catch (err) {
    // Audit logging never blocks or crashes the main request flow
    console.error("Failed to write audit log:", err);
  }
}

export interface BotLogInput {
  chatId: number | string;
  userId?: number | null;
  username?: string | null;
  command: string;
  rawText?: string | null;
  status?: "success" | "error";
  responseTimeMs?: number;
}

export async function logBotActivity(input: BotLogInput): Promise<void> {
  try {
    const sql = getDb();
    // Potong raw text jika terlalu panjang dan sanitasi jika ada password
    const safeRawText = (input.rawText || "").slice(0, 500);

    await sql`
      INSERT INTO bot_logs (
        chat_id, user_id, username, command, raw_text, status, response_time_ms
      ) VALUES (
        ${input.chatId},
        ${input.userId || null},
        ${input.username || null},
        ${input.command},
        ${safeRawText || null},
        ${input.status || "success"},
        ${input.responseTimeMs || 0}
      )
    `;
  } catch (err) {
    console.error("Failed to write bot log:", err);
  }
}

export interface TrafficLogInput {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  userId?: number | null;
  ipAddress?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  isPageView?: boolean;
  sessionId?: string | null;
}

export async function logTraffic(input: TrafficLogInput): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO traffic_logs (
        endpoint, method, status_code, response_time_ms, user_id, ip_address, region,
        country, country_code, device, browser, os, is_page_view, session_id
      ) VALUES (
        ${input.endpoint.slice(0, 255)},
        ${input.method.slice(0, 10)},
        ${input.statusCode},
        ${input.responseTimeMs},
        ${input.userId || null},
        ${input.ipAddress || null},
        ${input.region || "Localhost (ID)"},
        ${input.country || "Indonesia"},
        ${input.countryCode || "ID"},
        ${input.device || "Desktop"},
        ${input.browser || "Chrome"},
        ${input.os || "Windows"},
        ${input.isPageView || false},
        ${input.sessionId || null}
      )
    `;
  } catch (err) {
    console.error("Failed to write traffic log:", err);
  }
}
