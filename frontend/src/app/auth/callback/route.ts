import { NextResponse } from "next/server";

/** Google OAuth callback is handled by the backend at /api/auth/google/callback */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
