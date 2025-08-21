"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Suspense } from "react";

type ClassRow = {
  id: string;
  class_date: string; // yyyy-mm-dd
  class_time: string; // HH:MM
  capacity: number;
};

type ReservationRow = {
  id: string;
  class_id: string;
  uid: string | null;
  name: string;
  phone: string;
  created_at: string;
};

type ReservationWithClass = ReservationRow & {
  class_date?: string | null;
  class_time?: string | null;
};

function CancelInner() {
  const searchParams = useSearchParams();
  const uid = searchParams?.get("uid") ?? "";
  const nameFromUrl = searchParams?.get("name") ?? "";
  const phoneFromUrl = searchParams?.get("phone") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReservationWithClass[]>([]);
  const [name, setName] = useState(nameFromUrl);
  const [phone, setPhone] = useState(phoneFromUrl);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const canQuery = Boolean(uid || (name && phone));

  const load = async () => {
    if (!canQuery) return;
    try {
      setLoading(true);
      setError("");
      let q = supabase
        .from("reservation")
        .select("id,class_id,uid,name,phone,created_at");
      if (uid) q = q.eq("uid", uid);
      else q = q.eq("name", name).eq("phone", phone);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;

      const classIds = Array.from(new Set((data || []).map((r: any) => r.class_id as string)));
      const classesById: Record<string, ClassRow> = {};
      if (classIds.length > 0) {
        const { data: classData } = await supabase
          .from("class")
          .select("id,class_date,class_time,capacity")
          .in("id", classIds);
        (classData || []).forEach((c: any) => {
          classesById[c.id as string] = {
            id: c.id as string,
            class_date: String(c.class_date),
            class_time: String(c.class_time).slice(0, 5),
            capacity: Number(c.capacity ?? 0),
          };
        });
      }

      const merged: ReservationWithClass[] = (data || []).map((r: any) => ({
        ...r,
        class_date: classesById[r.class_id as string]?.class_date ?? null,
        class_time: classesById[r.class_id as string]?.class_time ?? null,
      }));
      setRows(merged);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "예약 정보를 불러오지 못했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, nameFromUrl, phoneFromUrl]);

  const rowsWithMeta = useMemo(() => {
    const now = new Date();
    return rows
      .map((r) => {
        const dateStr = r.class_date ?? "";
        const timeStr = r.class_time ?? "00:00";
        const dt = new Date(`${dateStr}T${timeStr}:00`);
        const isPast = isNaN(dt.getTime()) ? false : dt < now;
        return { ...r, dt, isPast };
      })
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());
  }, [rows]);

  const onCancel = async (row: ReservationWithClass) => {
    try {
      setBusyId(row.id);
      const { error } = await supabase.from("reservation").delete().eq("id", row.id);
      if (error) throw error;

      const makeUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
      if (makeUrl) {
        try {
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "reservation.canceled",
              reservationId: row.id,
              uid: row.uid,
              name: row.name,
              phone: row.phone,
              classId: row.class_id,
              date: row.class_date,
              time: row.class_time,
            }),
          });
        } catch {}
      }

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      alert("예약이 취소되었습니다. 채팅으로 돌아가주세요.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "예약 취소 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      <div className="rounded-xl border p-4 sm:p-6 bg-background/50">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold">내 예약 관리</h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">취소할 수업을 선택하거나 변경을 눌러 새로운 시간으로 이동하세요.</p>
        </div>

        {!canQuery && (
          <div className="space-y-2">
            
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded border bg-background px-2 text-sm"
              />
              <input
                type="tel"
                placeholder="연락처 (예: 01012345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-9 w-full rounded border bg-background px-2 text-sm"
              />
              <Button size="sm" onClick={load} disabled={!canQuery || loading}>
                {loading ? "조회 중..." : "조회"}
              </Button>
            </div>
          </div>
        )}

        {loading && <div className="text-sm">로딩 중...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">
            예약 내역이 없습니다. 새로운 예약을 원하시면
            <a href="/reservation" className="ml-1 underline">예약 페이지</a>로 이동하세요.
          </div>
        )}

        {rowsWithMeta.length > 0 && (
          <div className="space-y-3">
            {rowsWithMeta.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-0.5 rounded-full text-xs ${r.isPast ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                    {r.isPast ? "지난 수업" : "예정"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {r.class_date ? format(new Date(r.class_date), "yyyy년 M월 d일") : "-"} {r.class_time ?? ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.name} · {r.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/reservation?uid=${encodeURIComponent(uid || "")}&name=${encodeURIComponent(name || "")}`}
                    className="text-xs sm:text-sm underline text-muted-foreground hover:text-foreground"
                  >
                    변경
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => setConfirmId(r.id)}
                  >
                    {busyId === r.id ? "취소 중..." : "취소"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 간단 확인 모달 */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border bg-background p-4 shadow-lg">
            {(() => {
              const target = rows.find((r) => r.id === confirmId);
              const when = target?.class_date ? `${format(new Date(target.class_date), "yyyy년 M월 d일")} ${target?.class_time ?? ""}` : "";
              return (
                <>
                  <div className="text-sm">예약 취소</div>
                  <div className="mt-1 text-base font-semibold">{when}</div>
                  <div className="mt-2 text-xs text-muted-foreground">취소 후 좌석은 다른 사용자에게 제공될 수 있습니다.</div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>아니오</Button>
                    <Button size="sm" onClick={() => { const targetRow = rows.find(r => r.id === confirmId); if (targetRow) onCancel(targetRow); }}>네, 취소할게요</Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">로딩 중...</div>}>
      <CancelInner />
    </Suspense>
  );
}


