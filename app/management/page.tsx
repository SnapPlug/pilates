"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { supabaseClient } from "@/lib/supabaseClient";

type ClassCapacityAnalysis = {
  capacity: number;
  classCount: number;
  studentCount: number;
  utilizationRate: number;
  examples: string[];
};

type DailyAttendanceAnalysis = {
  instructorId: string;
  instructorName: string;
  date: string;
  capacity: number;
  totalClasses: number;
  attendanceBreakdown: {
    [attendanceCount: number]: number; // 0명, 1명, 2명, 3명 출석한 수업 수
  };
  totalStudents: number;
  utilizationRate: number;
  classDetails: Array<{
    classTime: string;
    attendanceCount: number;
    studentNames: string[];
  }>;
};

type InstructorSummary = {
  instructorId: string;
  instructorName: string;
  classCount: number;
  studentCount: number;
  averageStudents: number;
  maxCapacity: number; // 추가: 해당 강사의 최대 수업 정원
  capacityBreakdown: {
    [capacity: number]: number;
  };
  attendanceBreakdown: {
    [attendance: number]: number;
  };
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
  const [capacityAnalysis, setCapacityAnalysis] = React.useState<ClassCapacityAnalysis[]>([]);
  const [pricingData, setPricingData] = React.useState<{
    [instructorId: string]: {
      [attendance: number]: { unitPrice: number; taxRate: number };
    };
  }>({});

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

      // 1. 해당 월의 모든 수업 조회 (강사 정보, 정원 포함)
      const { data: classes, error: classesError } = await supabaseClient
        .from('class')
        .select(`
          id,
          class_date,
          class_time,
          capacity,
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
      // class_id를 통해 해당 월의 수업에 연결된 예약만 조회
      const classIds = classes?.map(c => c.id) || [];
      let reservations: any[] = [];
      
      if (classIds.length > 0) {
        const { data: reservationsData, error: reservationsError } = await supabaseClient
          .from('reservation')
          .select(`
            id,
            class_id,
            name,
            attendance_status
          `)
          .in('class_id', classIds);

        if (reservationsError) {
          console.error('예약 조회 오류:', reservationsError);
          throw new Error('예약 데이터를 불러오는데 실패했습니다.');
        }
        
        reservations = reservationsData || [];
      }

      console.log('조회된 예약 수:', reservations?.length || 0);

      // 3. 강사별 통계 계산
      const instructorStats = new Map<string, {
        instructorId: string;
        instructorName: string;
        classCount: number;
        studentCount: number;
        totalStudents: number;
        maxCapacity: number; // 추가: 해당 강사의 최대 수업 정원
        capacityBreakdown: { [capacity: number]: number };
        attendanceBreakdown: { [attendance: number]: number };
      }>();

      // 수업별로 강사 통계 계산
      classes?.forEach(classItem => {
        const instructorId = classItem.instructor_id || 'unknown';
        const instructorName = (classItem.instructor as any)?.name || '미지정 강사';
        const capacity = (classItem as any).capacity || 0;
        
        if (!instructorStats.has(instructorId as string)) {
          instructorStats.set(instructorId as string, {
            instructorId: instructorId as string,
            instructorName,
            classCount: 0,
            studentCount: 0,
            totalStudents: 0,
            maxCapacity: 0, // 초기값 설정
            capacityBreakdown: {},
            attendanceBreakdown: {}
          });
        }

        const stats = instructorStats.get(instructorId as string)!;
        stats.classCount++;

        // 정원별 수업 수 카운트
        if (!stats.capacityBreakdown[capacity]) {
          stats.capacityBreakdown[capacity] = 0;
        }
        stats.capacityBreakdown[capacity]++;

        // 최대 정원 업데이트
        if (capacity > stats.maxCapacity) {
          stats.maxCapacity = capacity;
        }

        // 해당 수업의 출석한 학생 수 계산
        const classReservations = reservations?.filter(r => r.class_id === classItem.id) || [];
        const attendedStudents = classReservations.filter(r => r.attendance_status === 'attended').length;
        
        // 출석 인원별 수업 수 카운트
        if (!stats.attendanceBreakdown[attendedStudents]) {
          stats.attendanceBreakdown[attendedStudents] = 0;
        }
        stats.attendanceBreakdown[attendedStudents]++;
        
        stats.studentCount += attendedStudents;
        stats.totalStudents += classReservations.length;
      });

      // 4. 정원별 분석 데이터 생성
      const capacityStats = new Map<number, {
        capacity: number;
        classCount: number;
        studentCount: number;
        examples: string[];
      }>();

      classes?.forEach(classItem => {
        const capacity = (classItem as any).capacity || 0;
        const classDate = (classItem as any).class_date;
        const classTime = (classItem as any).class_time;
        
        if (!capacityStats.has(capacity)) {
          capacityStats.set(capacity, {
            capacity,
            classCount: 0,
            studentCount: 0,
            examples: []
          });
        }

        const stats = capacityStats.get(capacity)!;
        stats.classCount++;

        // 해당 수업의 출석한 학생 수 계산
        const classReservations = reservations?.filter(r => r.class_id === classItem.id) || [];
        const attendedStudents = classReservations.filter(r => r.attendance_status === 'attended').length;
        stats.studentCount += attendedStudents;

        // 예시 수업 정보 추가 (최대 3개)
        if (stats.examples.length < 3) {
          const instructorName = ((classItem as any).instructor as any)?.name || '미지정';
          stats.examples.push(`${classDate} ${classTime} (${instructorName})`);
        }
      });

      const capacityAnalysisData: ClassCapacityAnalysis[] = Array.from(capacityStats.values()).map(stats => ({
        capacity: stats.capacity,
        classCount: stats.classCount,
        studentCount: stats.studentCount,
        utilizationRate: stats.classCount > 0 ? Number(((stats.studentCount / (stats.capacity * stats.classCount)) * 100).toFixed(1)) : 0,
        examples: stats.examples
      }));

      // 5. 결과 데이터 변환
      const result: InstructorSummary[] = Array.from(instructorStats.values()).map(stats => ({
        instructorId: stats.instructorId,
        instructorName: stats.instructorName,
        classCount: stats.classCount,
        studentCount: stats.studentCount,
        averageStudents: stats.classCount > 0 ? Number((stats.studentCount / stats.classCount).toFixed(1)) : 0,
        maxCapacity: stats.maxCapacity, // 최대 정원 추가
        capacityBreakdown: stats.capacityBreakdown,
        attendanceBreakdown: stats.attendanceBreakdown
      }));

      console.log('강사별 통계:', result);
      console.log('정원별 분석:', capacityAnalysisData);
      setRows(result);
      setCapacityAnalysis(capacityAnalysisData);

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
          <h1 className="text-xl md:text-2xl font-semibold">수업 현황 분석 대시보드</h1>
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
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-3">수업종류별 수업 수</h3>
            <div className="grid grid-cols-3 gap-2">
              {(() => {
                const totalByType = rows.reduce((acc, row) => {
                  Object.entries(row.attendanceBreakdown).forEach(([attendance, count]) => {
                    if (!acc[attendance]) acc[attendance] = 0;
                    acc[attendance] += count;
                  });
                  return acc;
                }, {} as { [key: string]: number });
                
                return Object.entries(totalByType)
                  .filter(([attendance, count]) => Number(attendance) > 0 && count > 0)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([attendance, count]) => (
                    <div key={attendance} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {attendance}명
                        </span>
                        <span className="text-lg font-bold text-black">
                          {count}개
                        </span>
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>

        {/* 강사별 상세 통계 테이블 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">강사별 상세 통계</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-24" rowSpan={2}>강사명</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-28" rowSpan={2}>월간 총 수업수</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-32" rowSpan={2}>월간 총 수강생 수</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900" colSpan={2}>출석 수강생별 수업 수</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-20" rowSpan={2}>단가</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-16" rowSpan={2}>세금</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-20" rowSpan={2}>합계</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-20">수업종류</th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 w-20">수업수</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const attendanceLevels = Array.from({ length: row.maxCapacity + 1 }, (_, i) => i)
                    .filter(attendance => attendance > 0); // 0명 출석 제외
                  
                  return attendanceLevels.map((attendance, attendanceIndex) => (
                    <tr key={`${row.instructorId}-${attendance}`} className="hover:bg-gray-50">
                      {attendanceIndex === 0 && (
                        <>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center" rowSpan={attendanceLevels.length}>
                            {row.instructorName}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center" rowSpan={attendanceLevels.length}>
                            {row.classCount}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center" rowSpan={attendanceLevels.length}>
                            {row.studentCount}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                        {attendance}명
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                        {row.attendanceBreakdown[attendance] || 0}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                        <input
                          type="number"
                          className="w-20 text-center border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                          defaultValue={attendance === 1 ? 50000 : attendance === 2 ? 60000 : attendance === 3 ? 70000 : 0}
                          placeholder="단가"
                          min="0"
                          step="1000"
                          onChange={(e) => {
                            const newPricingData = { ...pricingData };
                            if (!newPricingData[row.instructorId]) {
                              newPricingData[row.instructorId] = {};
                            }
                            if (!newPricingData[row.instructorId][attendance]) {
                              newPricingData[row.instructorId][attendance] = { unitPrice: 0, taxRate: 3.3 };
                            }
                            newPricingData[row.instructorId][attendance].unitPrice = Number(e.target.value);
                            setPricingData(newPricingData);
                          }}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                        <input
                          type="number"
                          className="w-16 text-center border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                          defaultValue={attendance > 0 ? 3.3 : 0}
                          placeholder="세금%"
                          min="0"
                          max="100"
                          step="0.1"
                          onChange={(e) => {
                            const newPricingData = { ...pricingData };
                            if (!newPricingData[row.instructorId]) {
                              newPricingData[row.instructorId] = {};
                            }
                            if (!newPricingData[row.instructorId][attendance]) {
                              newPricingData[row.instructorId][attendance] = { unitPrice: 50000, taxRate: 3.3 };
                            }
                            newPricingData[row.instructorId][attendance].taxRate = Number(e.target.value);
                            setPricingData(newPricingData);
                          }}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                        {(() => {
                          const unitPrice = pricingData[row.instructorId]?.[attendance]?.unitPrice || 
                            (attendance === 1 ? 50000 : attendance === 2 ? 60000 : attendance === 3 ? 70000 : 0);
                          const classCount = row.attendanceBreakdown[attendance] || 0;
                          
                          if (attendance > 0 && classCount > 0) {
                            const total = classCount * unitPrice;
                            return total.toLocaleString();
                          }
                          return '-';
                        })()}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
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


