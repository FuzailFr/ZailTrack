import { NextResponse } from "next/server";
import { getSessionUser, signFeedToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const feedToken = await signFeedToken(session.userId, session.username);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "zail-track.vercel.app";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const feedUrl = `${protocol}://${host}/api/sheets/feed?token=${feedToken}`;
    const formula = `=IMPORTDATA("${feedUrl}")`;

    return NextResponse.json({
      status: "success",
      feedUrl,
      formula,
      username: session.username,
    });
  } catch (error: any) {
    console.error("Sheets token error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal membuat token Google Sheets." },
      { status: 500 }
    );
  }
}
