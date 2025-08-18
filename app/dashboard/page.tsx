"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import Link from "next/link";

type Kpi = {
  label: string;
  value: number | string;
  hint?: string;
};

type ReservationItem = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  classTitle: string;
};

type ClassItem = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  instructor: string;
  capacity: number;
  reserved: number;
};

export default function Page() {
  const [period, setPeriod] = React.useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [kpis, setKpis] = React.useState<Kpi[]>([
    { label: "오늘 수업", value: 0 },
    { label: "예약 건수", value: 0 },
    { label: "회원 수", value: 0 },
    { label: "강사 수", value: 0 },
  ]);

  const [upcoming, setUpcoming] = React.useState<ClassItem[]>([]);
  const [recentReservations, setRecentReservations] = React.useState<ReservationItem[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with Supabase queries.
      // Demo data for structure
      const demoKpis: Kpi[] = [
        { label: period === "today" ? "오늘 수업" : period === "week" ? "이번주 수업" : "이번달 수업", value: 12 },
        { label: "예약 건수", value: 28 },
        { label: "회원 수", value: 134 },
        { label: "강사 수", value: 6 },
      ];

      const demoUpcoming: ClassItem[] = [
        { id: "c1", date: "2025-08-16", time: "10:00", instructor: "김민수", capacity: 3, reserved: 2 },
        { id: "c2", date: "2025-08-16", time: "14:00", instructor: "이서연", capacity: 3, reserved: 1 },
        { id: "c3", date: "2025-08-17", time: "09:00", instructor: "박지훈", capacity: 3, reserved: 3 },
      ];

      const demoRecent: ReservationItem[] = [
        { id: "r1", date: "2025-08-15", time: "12:00", name: "홍길동", classTitle: "매트 필라테스" },
        { id: "r2", date: "2025-08-15", time: "14:00", name: "김영희", classTitle: "기구 필라테스" },
        { id: "r3", date: "2025-08-14", time: "18:00", name: "이철수", classTitle: "서킷 트레이닝" },
      ];

      await new Promise((r) => setTimeout(r, 300));
      setKpis(demoKpis);
      setUpcoming(demoUpcoming);
      setRecentReservations(demoRecent);
    } catch (e) {
      setError("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">대시보드</h1>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border p-1 text-sm bg-white">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1.5 rounded-md ${p === period ? "bg-black text-white" : "text-gray-700"}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === "today" ? "오늘" : p === "week" ? "주" : "월"}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              className="rounded-md bg-black text-white px-3 py-1.5 text-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "불러오는 중..." : "조회"}
            </button>
          </div>
          </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-md border p-4 bg-white">
              <div className="text-xs text-gray-500">{k.label}</div>
              <div className="mt-2 text-2xl font-semibold">{k.value}</div>
              {k.hint && <div className="mt-1 text-xs text-gray-400">{k.hint}</div>}
    </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Upcoming classes */}
          <section className="rounded-md border bg-white p-4 flex flex-col min-h-[280px]">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold">다가오는 수업</h2>
              <Link href="/class" className="text-sm underline">시간표 보기</Link>
            </header>
            <div className="mt-3 flex-1 overflow-auto divide-y">
              {upcoming.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.time} · {c.instructor}</div>
                    <div className="text-xs text-gray-500">{c.date}</div>
                  </div>
                  <div className="text-sm tabular-nums">({c.reserved}/{c.capacity})</div>
                </div>
              ))}
              {!loading && upcoming.length === 0 && (
                <div className="py-10 text-center text-gray-500 text-sm">조회하여 데이터를 확인하세요.</div>
              )}
            </div>
            <div className="pt-3 mt-auto flex items-center justify-end gap-2 border-t">
              <Link href="/class/new" className="rounded-md border px-3 py-1.5 text-sm">수업 추가</Link>
            </div>
          </section>

          {/* Recent reservations */}
          <section className="rounded-md border bg-white p-4 flex flex-col min-h-[280px]">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold">최근 예약</h2>
              <Link href="/reservation" className="text-sm underline">예약 페이지</Link>
            </header>
            <div className="mt-3 flex-1 overflow-auto divide-y">
              {recentReservations.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.date} · {r.time} · {r.classTitle}</div>
                  </div>
                </div>
              ))}
              {!loading && recentReservations.length === 0 && (
                <div className="py-10 text-center text-gray-500 text-sm">조회하여 데이터를 확인하세요.</div>
              )}
            </div>
            <div className="pt-3 mt-auto flex items-center justify-end gap-2 border-t">
              <Link href="/cancel" className="rounded-md border px-3 py-1.5 text-sm">예약 취소/조회</Link>
            </div>
          </section>
        </div>

        

        {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
      </div>
    </SidebarLayout>
  );
}
