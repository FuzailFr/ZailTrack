import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized", authenticated: false },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: "success",
    authenticated: true,
    user: session,
  });
}
