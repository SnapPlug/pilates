"use client";
import { Calendar } from "@/components/ui/mini-calendar";
import { format } from "date-fns";

export default function Home() {
  async function handleChange(date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    try {
      await fetch("/api/make/emit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: iso, channel: "kakao" }),
      });
    } catch {
      // no-op for MVP
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Calendar onChange={handleChange} />
      </div>
    </div>
  );
}
