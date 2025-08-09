"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const FormSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  phone: z.string().min(6, "전화번호를 입력하세요"),
  date: z.string().min(10, "날짜를 선택하세요"),
  time: z.string().min(5, "시간을 선택하세요"),
  channel: z.enum(["kakao", "naver"]).catch("kakao"),
  channelUserId: z.string().optional(),
  note: z.string().optional(),
});

export default function ReservePage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const json = Object.fromEntries(formData.entries());
    const parsed = FormSchema.safeParse(json);
    if (!parsed.success) {
      setSubmitting(false);
      const first = parsed.error.issues?.[0]?.message ?? "입력값을 확인해주세요";
      setError(first);
      return;
    }
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!body.ok) {
      setError(body.error ?? "예약 중 오류가 발생했습니다");
    } else {
      setSuccess("예약이 접수되었어요! 곧 확인 후 안내드릴게요.");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">예약하기</h1>
      <form action={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm">이름</label>
          <input name="name" className="border rounded-md px-3 py-2 w-full" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm">전화번호</label>
          <input name="phone" className="border rounded-md px-3 py-2 w-full" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm">날짜</label>
            <input type="date" name="date" className="border rounded-md px-3 py-2 w-full" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm">시간</label>
            <input type="time" name="time" className="border rounded-md px-3 py-2 w-full" required />
          </div>
        </div>
        <input type="hidden" name="channel" value="kakao" />
        <input type="hidden" name="channelUserId" value="" />
        <div className="space-y-2">
          <label className="text-sm">메모</label>
          <textarea name="note" className="border rounded-md px-3 py-2 w-full" rows={3} />
        </div>
        <Button disabled={submitting}>
          {submitting ? "예약 중..." : "예약 제출"}
        </Button>
      </form>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
    </div>
  );
}


