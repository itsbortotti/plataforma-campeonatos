import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4006";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const res = await fetch(`${API}/api/cron/finalize-stale-matches`, {
    method: "POST",
    headers: { Authorization: auth },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
