"use client";
import { useState } from "react";
import { Calendar, type CalendarView, CalendarViewControls } from "@/components/ui/mini-calendar";
import { format } from "date-fns";
import { TimeSlots } from "@/components/ui/time-slots";

export default function Home() {
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  async function handleChange(date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    try {
      await fetch("/api/make/emit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "calendar.date_selected", date: iso, channel: "kakao" }),
      });
    } catch {
      // no-op for MVP
    }
    setSelectedDate(date);
    setSelectedTime(null);
  }

  async function handleTimeSelect(time: string) {
    setSelectedTime(time);
    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
    try {
      await fetch("/api/make/emit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "calendar.time_selected", date: dateStr, time, channel: "kakao" }),
      });
    } catch {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-2">
        <Calendar onChange={handleChange} view={view} onViewChange={setView} showControls={false} />
        <div className="flex justify-end">
          <CalendarViewControls view={view} onChange={setView} />
        </div>
        {selectedDate && (
          <TimeSlots
            dateLabel={format(selectedDate, "yyyy년 M월 d일")}
            selectedTime={selectedTime}
            onSelect={handleTimeSelect}
          />
        )}
      </div>
    </div>
  );
}
