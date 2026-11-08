import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/logger";
import { getClientIp, getClientRegion } from "@/lib/security";

export async function POST(request: Request) {
  const session = await getSessionUser();
  const ip = getClientIp(request.headers);
  const region = getClientRegion(request.headers, ip);
  const userAgent = request.headers.get("user-agent") || "";

  if (session) {
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "auth:logout",
      ipAddress: ip,
      region,
      userAgent,
      status: "success",
    });
  }

  await clearSessionCookie();
  return NextResponse.json({
    status: "success",
    message: "Logout berhasil.",
  });
}
