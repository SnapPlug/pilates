import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase } from "@/lib/supabase";

const ReservationSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  channel: z.enum(["kakao", "naver"]).default("kakao"),
  channelUserId: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const payload = ReservationSchema.parse(json);

    const supabase = serverSupabase();
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        name: payload.name,
        phone: payload.phone,
        date: payload.date,
        time: payload.time,
        channel: payload.channel,
        channel_user_id: payload.channelUserId ?? null,
        note: payload.note ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    const webhook = process.env.MAKE_WEBHOOK_URL;
    if (webhook) {
      fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "reservation.created", reservation: data }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, reservation: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}


