import { NextResponse } from "next/server";
import { getClientIp, getClientRegion, getCountryDetails, parseUserAgent } from "@/lib/security";
import { logTraffic } from "@/lib/logger";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const start = performance.now();
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const path = String(body.path || "/").slice(0, 255);
    const sessionId = String(body.sessionId || "").slice(0, 64);
    const userAgent = request.headers.get("user-agent") || "";

    const ip = getClientIp(request.headers);
    const region = getClientRegion(request.headers, ip);
    const country = getCountryDetails(request.headers, ip);
    const uaInfo = parseUserAgent(userAgent);

    const session = await getSessionUser();
    const duration = Math.round(performance.now() - start);

    await logTraffic({
      endpoint: path,
      method: "GET",
      statusCode: 200,
      responseTimeMs: duration,
      userId: session?.userId || null,
      ipAddress: ip,
      region,
      country: country.name,
      countryCode: country.code,
      device: uaInfo.device,
      browser: uaInfo.browser,
      os: uaInfo.os,
      isPageView: true,
      sessionId: sessionId || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("analytics collect error:", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
