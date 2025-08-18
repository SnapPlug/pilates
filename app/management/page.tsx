"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";

type InstructorSummary = {
  instructorId: string;
  instructorName: string;
  classCount: number;
  studentCount: number;
};

export default function ManagementPage() {
  const [month, setMonth] = React.useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<InstructorSummary[]>([]);

  const onLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Wire up Supabase aggregation here
      // Placeholder demo data for basic UI/UX
      const demo: InstructorSummary[] = [
        { instructorId: "1", instructorName: "김민수", classCount: 18, studentCount: 42 },
        { instructorId: "2", instructorName: "이서연", classCount: 15, studentCount: 37 },
        { instructorId: "3", instructorName: "박지훈", classCount: 12, studentCount: 28 },
      ];
      // Simulate latency
      await new Promise((r) => setTimeout(r, 400));
      setRows(demo);
    } catch (e) {
      setError("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const totalClasses = rows.reduce((s, r) => s + r.classCount, 0);
  const totalStudents = rows.reduce((s, r) => s + r.studentCount, 0);
  const avgStudents = rows.length ? (totalStudents / totalClasses || 0) : 0;

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">월간 정산 대시보드</h1>
          <div className="flex items-center gap-2">
            <input
              type="month"
              className="border rounded-md px-2 py-1 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="정산월 선택"
            />
            <button
              onClick={onLoad}
              className="rounded-md bg-black text-white px-3 py-1.5 text-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "불러오는 중..." : "조회"}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard title="총 수업 수" value={totalClasses} />
          <SummaryCard title="총 수강생 수" value={totalStudents} />
          <SummaryCard title="평균 수강 인원/수업" value={avgStudents.toFixed(1)} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">강사명</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">월간 수업수</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">월간 수강생수</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">평균 수강</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.instructorId} className="border-t">
                  <td className="px-3 py-2">{r.instructorName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.classCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.studentCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.classCount ? (r.studentCount / r.classCount).toFixed(1) : "0.0"}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-gray-500">
                    상단에서 월을 선택하고 조회를 눌러 데이터를 불러오세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button className="rounded-md border px-3 py-1.5 text-sm">CSV 내보내기</button>
          <button className="rounded-md border px-3 py-1.5 text-sm">정산서 생성</button>
        </div>
      </div>
    </SidebarLayout>
  );
}

type SummaryCardProps = {
  title: string;
  value: number | string;
};

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="rounded-md border p-4 bg-white">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}


