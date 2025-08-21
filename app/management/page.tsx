"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { supabaseClient } from "@/lib/supabaseClient";

type InstructorSummary = {
  instructorId: string;
  instructorName: string;
  classCount: number;
  studentCount: number;
  averageStudents: number;
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

  // 페이지 로드 시 자동으로 데이터 불러오기
  React.useEffect(() => {
    onLoad();
  }, []);

  const onLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      // 선택된 월의 시작일과 끝일 계산
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

      console.log('월간 정산 데이터 조회:', { month, startDate, endDate });

      // 1. 해당 월의 모든 수업 조회 (강사 정보 포함)
      const { data: classes, error: classesError } = await supabaseClient
        .from('class')
        .select(`
          id,
          class_date,
          class_time,
          instructor_id,
          instructor:instructor_id (
            id,
            name
          )
        `)
        .gte('class_date', startDate)
        .lte('class_date', endDate)
        .order('class_date', { ascending: true });

      if (classesError) {
        console.error('수업 조회 오류:', classesError);
        throw new Error('수업 데이터를 불러오는데 실패했습니다.');
      }

      console.log('조회된 수업 수:', classes?.length || 0);

      // 2. 해당 월의 모든 예약 조회 (출석 상태 포함)
      const { data: reservations, error: reservationsError } = await supabaseClient
        .from('reservation')
        .select(`
          id,
          class_id,
          name,
          attendance_status
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (reservationsError) {
        console.error('예약 조회 오류:', reservationsError);
        throw new Error('예약 데이터를 불러오는데 실패했습니다.');
      }

      console.log('조회된 예약 수:', reservations?.length || 0);

      // 3. 강사별 통계 계산
      const instructorStats = new Map<string, {
        instructorId: string;
        instructorName: string;
        classCount: number;
        studentCount: number;
        totalStudents: number;
      }>();

      // 수업별로 강사 통계 계산
      classes?.forEach(classItem => {
        const instructorId = classItem.instructor_id || 'unknown';
        const instructorName = (classItem.instructor as any)?.name || '미지정 강사';
        
        if (!instructorStats.has(instructorId as string)) {
          instructorStats.set(instructorId as string, {
            instructorId: instructorId as string,
            instructorName,
            classCount: 0,
            studentCount: 0,
            totalStudents: 0
          });
        }

        const stats = instructorStats.get(instructorId as string)!;
        stats.classCount++;

        // 해당 수업의 출석한 학생 수 계산
        const classReservations = reservations?.filter(r => r.class_id === classItem.id) || [];
        const attendedStudents = classReservations.filter(r => r.attendance_status === 'attended').length;
        
        stats.studentCount += attendedStudents;
        stats.totalStudents += classReservations.length;
      });

      // 4. 결과 데이터 변환
      const result: InstructorSummary[] = Array.from(instructorStats.values()).map(stats => ({
        instructorId: stats.instructorId,
        instructorName: stats.instructorName,
        classCount: stats.classCount,
        studentCount: stats.studentCount,
        averageStudents: stats.classCount > 0 ? Number((stats.studentCount / stats.classCount).toFixed(1)) : 0
      }));

      console.log('강사별 통계:', result);
      setRows(result);

    } catch (e) {
      console.error('월간 정산 데이터 조회 오류:', e);
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
                    {r.averageStudents.toFixed(1)}
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


