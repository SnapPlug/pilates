import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const webhook = process.env.MAKE_WEBHOOK_URL;

  if (!webhook) {
    return NextResponse.json({ ok: false, error: "MAKE_WEBHOOK_URL is not set" }, { status: 500 });
  }

  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: "calendar.date_selected", payload: body }),
  });

  return NextResponse.json({ ok: true });
}


