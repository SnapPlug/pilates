"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { supabaseClient } from "@/lib/supabaseClient";

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  totalClasses: number;
  totalReservations: number;
  totalAttendance: number;
  totalAbsence: number;
  membersByRemainingSessions: {
    [sessions: number]: number;
  };
  membersByExpiryBuffer: {
    [days: number]: number;
  };
};

type MemberDetail = {
  id: string;
  name: string;
  membershipStatus: string;
  remainingSessions: number;
  expiryDate: string;
  lastAttendance: string | null;
  daysUntilExpiry?: number;
};

type ReservationDetail = {
  id: string;
  memberName: string;
  className: string;
  classDate: string;
  classTime: string;
  attendanceStatus: string;
};

type SystemSettings = {
  weeklyRecommendedSessions: number;
  membershipExpirationBuffer: number;
  remainingSessionsThreshold: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [memberDetails, setMemberDetails] = React.useState<MemberDetail[]>([]);
  const [reservationDetails, setReservationDetails] = React.useState<ReservationDetail[]>([]);
  const [systemSettings, setSystemSettings] = React.useState<SystemSettings>({
    weeklyRecommendedSessions: 2,
    membershipExpirationBuffer: 3,
    remainingSessionsThreshold: 3
  });
  
  // 월 선택 상태
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 월 변경 핸들러
  const handleMonthChange = (month: string) => {
    console.log('월 변경:', month);
    setSelectedMonth(month);
    
    // systemSettings가 로드된 경우에만 즉시 데이터 로드
    if (systemSettings && Object.keys(systemSettings).length > 0) {
      loadDashboardData(month);
    }
    // systemSettings가 로드되지 않은 경우, useEffect에서 자동으로 처리됨
  };

  // 시스템 설정 로드
  const loadSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSystemSettings({
          weeklyRecommendedSessions: data.weeklyRecommendedSessions || 2,
          membershipExpirationBuffer: data.membershipExpirationBuffer || 3,
          remainingSessionsThreshold: data.remainingSessionsThreshold || 3
        });
        console.log('시스템 설정 로드 완료:', data);
      }
    } catch (error) {
      console.error('시스템 설정 로드 실패:', error);
    }
  };

  const loadDashboardData = async (month?: string) => {
    // systemSettings가 로드되지 않은 경우 대기
    if (!systemSettings || Object.keys(systemSettings).length === 0) {
      console.log('systemSettings가 아직 로드되지 않음, 대기 중...');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetMonth = month || selectedMonth;
      const [year, monthNum] = targetMonth.split('-').map(Number);
      
      // 선택된 월의 날짜 범위 계산
      const startDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

      console.log('대시보드 데이터 조회:', { 
        targetMonth, 
        selectedMonth, 
        month, 
        year, 
        monthNum, 
        startDate, 
        endDate 
      });

      // 1. 회원 통계 조회 (해당 월에 활동한 회원만)
      console.log('회원 데이터 조회 시작...');

      // 해당 월에 예약이 있거나 회원권이 활성인 회원 조회
      const { data: members, error: membersError } = await supabaseClient
        .from('member')
        .select(`
          id,
          name,
          membership_history (
            status,
            remaining_sessions,
            end_date,
            created_at,
            updated_at
          )
        `)
        .order('name');

      if (membersError) {
        console.error('회원 조회 오류:', membersError);
        throw new Error(`회원 데이터를 불러오는데 실패했습니다: ${membersError.message}`);
      }

      console.log('회원 데이터 조회 성공:', { count: members?.length || 0 });

      // 2. 예약 및 출석 통계 조회 (해당 월)
      const { data: reservations, error: reservationsError } = await supabaseClient
        .from('reservation')
        .select(`
          id,
          name,
          attendance_status,
          class:class_id (
            class_date,
            class_time,
            class_name
          )
        `)
        .gte('class.class_date', startDate)
        .lte('class.class_date', endDate);

      if (reservationsError) {
        console.error('예약 조회 오류:', reservationsError);
        throw new Error(`예약 데이터를 불러오는데 실패했습니다: ${reservationsError.message}`);
      }

      // 3. 통계 계산 (해당 월 기준)
      let totalMembers = 0;
      let activeMembers = 0;
      let expiredMembers = 0;
      const membersByRemainingSessions: { [sessions: number]: number } = {};
      const membersByExpiryBuffer: { [days: number]: number } = {};
      const memberDetailList: MemberDetail[] = [];

      // 수업 수 계산 (해당 월)
      const totalClasses = reservations?.filter(r => r.class).length || 0;

      // 해당 월에 활동한 회원만 필터링 (더 엄격하게)
      const activeMembersInMonth = new Set();
      const memberActivityCount = new Map(); // 회원별 활동 횟수
      
      reservations?.forEach((reservation: any) => {
        if (reservation.name) {
          activeMembersInMonth.add(reservation.name);
          memberActivityCount.set(reservation.name, (memberActivityCount.get(reservation.name) || 0) + 1);
        }
      });

      console.log('월별 활동 회원:', {
        month: targetMonth,
        activeMembersCount: activeMembersInMonth.size,
        activeMembers: Array.from(activeMembersInMonth),
        memberActivityCount: Object.fromEntries(memberActivityCount)
      });

      // 해당 월에 실제로 활동한 회원만 통계에 포함
      members?.forEach((member: any) => {
        const membership = member.membership_history?.[0] as any;
        const hasActivityInMonth = activeMembersInMonth.has(member.name);
        
        // 해당 월에 활동한 회원만 포함 (회원권 상태와 관계없이)
        if (hasActivityInMonth) {
          totalMembers++;
          
          if (membership) {
            const endDate = new Date(membership.end_date);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            const isActive = membership.status === '활성' && endDate > today;
            
            if (isActive) {
              activeMembers++;
            } else {
              expiredMembers++;
            }

            const remainingSessions = membership.remaining_sessions || 0;
            
            // 잔여 횟수별 분류 (해당 월 활동 회원만)
            if (!membersByRemainingSessions[remainingSessions]) {
              membersByRemainingSessions[remainingSessions] = 0;
            }
            membersByRemainingSessions[remainingSessions]++;

            // 설정값에 따른 잔여 횟수 분류
            if (remainingSessions <= systemSettings.remainingSessionsThreshold) {
              const key = `${remainingSessions}회 이하`;
              if (!membersByRemainingSessions[key as keyof typeof membersByRemainingSessions]) {
                (membersByRemainingSessions as any)[key] = 0;
              }
              (membersByRemainingSessions as any)[key]++;
            }

            // 설정값에 따른 만료 기간 분류
            if (daysUntilExpiry <= systemSettings.membershipExpirationBuffer && daysUntilExpiry > 0) {
              const key = `${daysUntilExpiry}일 이내`;
              if (!membersByExpiryBuffer[key as keyof typeof membersByExpiryBuffer]) {
                (membersByExpiryBuffer as any)[key] = 0;
              }
              (membersByExpiryBuffer as any)[key]++;
            }

            memberDetailList.push({
              id: member.id,
              name: member.name,
              membershipStatus: isActive ? '활성' : '만료',
              remainingSessions,
              expiryDate: membership.end_date,
              lastAttendance: null, // TODO: 마지막 출석일 조회 로직 추가
              daysUntilExpiry
            });
          } else {
            // 회원권이 없는 회원 (해당 월에 활동했지만 회원권 없음)
            expiredMembers++;
            memberDetailList.push({
              id: member.id,
              name: member.name,
              membershipStatus: '회원권 없음',
              remainingSessions: 0,
              expiryDate: '-',
              lastAttendance: null
            });
          }
        }
      });

      // 4. 예약 상세 정보 (해당 월, 날짜순으로 정렬)
      const reservationDetailList: ReservationDetail[] = (reservations || [])
        .sort((a: any, b: any) => {
          const dateA = (a.class as any)?.class_date || '';
          const dateB = (b.class as any)?.class_date || '';
          return dateB.localeCompare(dateA); // 최신 날짜가 먼저 오도록 내림차순 정렬
        })
        .map((r: any) => ({
          id: r.id,
          memberName: r.name,
          className: (r.class as any)?.class_name || '수업명 없음',
          classDate: (r.class as any)?.class_date || '',
          classTime: (r.class as any)?.class_time || '',
          attendanceStatus: r.attendance_status === 'attended' ? '출석' : 
                           r.attendance_status === 'absent' ? '결석' : '대기'
        }));

      // 5. 월별 통계 계산
      const totalReservations = reservations?.length || 0;
      const totalAttendance = reservations?.filter(r => r.attendance_status === 'attended').length || 0;
      const totalAbsence = reservations?.filter(r => r.attendance_status === 'absent').length || 0;

      console.log('월별 통계 계산 결과:', {
        month: targetMonth,
        totalMembers,
        activeMembers,
        expiredMembers,
        totalClasses,
        totalReservations,
        totalAttendance,
        totalAbsence,
        membersByRemainingSessions: Object.fromEntries(Object.entries(membersByRemainingSessions).filter(([key]) => key.includes('회 이하'))),
        membersByExpiryBuffer: Object.fromEntries(Object.entries(membersByExpiryBuffer))
      });

      // 6. 통계 객체 생성
      const dashboardStats: DashboardStats = {
        totalMembers,
        activeMembers,
        expiredMembers,
        totalClasses,
        totalReservations,
        totalAttendance,
        totalAbsence,
        membersByRemainingSessions,
        membersByExpiryBuffer
      };

      setStats(dashboardStats);
      setMemberDetails(memberDetailList);
      setReservationDetails(reservationDetailList);

    } catch (e) {
      console.error('대시보드 데이터 조회 오류:', e);
      setError("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 페이지 로드 시 자동으로 데이터 불러오기
  React.useEffect(() => {
    loadSystemSettings();
  }, []);

  // systemSettings가 로드된 후 대시보드 데이터 로드
  React.useEffect(() => {
    if (systemSettings && Object.keys(systemSettings).length > 0) {
      loadDashboardData();
    }
  }, [systemSettings]);

  // selectedMonth 변경 시 useEffect 제거 (handleMonthChange에서 처리)

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">대시보드</h1>
          <div className="flex items-center gap-4">
            {/* 월 선택기 */}
            <div className="flex items-center gap-2">
              <label htmlFor="month-selector" className="text-sm text-gray-600">월 선택:</label>
              <select
                id="month-selector"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* 최근 12개월 옵션 생성 */}
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const value = `${year}-${month}`;
                  const label = `${year}년 ${month}월`;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <button
              onClick={() => loadDashboardData()}
              className="rounded-md bg-black text-white px-3 py-1.5 text-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md" role="alert">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* 선택된 월 표시 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800">
                📅 {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월 통계
              </h2>
              <p className="text-sm text-blue-600 mt-1">
                {(() => {
                  const [year, month] = selectedMonth.split('-').map(Number);
                  const startDate = new Date(year, month - 1, 1);
                  const endDate = new Date(year, month, 0);
                  return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
                })()}
              </p>
            </div>

            {/* 주요 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">활동 회원수</div>
                <div className="mt-2 text-2xl font-bold text-blue-600">{stats.totalMembers}명</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">유효 회원수</div>
                <div className="mt-2 text-2xl font-bold text-green-600">{stats.activeMembers}명</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">만료 회원수</div>
                <div className="mt-2 text-2xl font-bold text-red-600">{stats.expiredMembers}명</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">총 수업수</div>
                <div className="mt-2 text-2xl font-bold text-indigo-600">{stats.totalClasses}건</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">예약수</div>
                <div className="mt-2 text-2xl font-bold text-purple-600">{stats.totalReservations}건</div>
              </div>
            </div>

            {/* 출석 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">출석수</div>
                <div className="mt-2 text-2xl font-bold text-green-600">{stats.totalAttendance}건</div>
                <div className="text-xs text-gray-500 mt-1">
                  출석률: {stats.totalReservations > 0 ? ((stats.totalAttendance / stats.totalReservations) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">결석수</div>
                <div className="mt-2 text-2xl font-bold text-red-600">{stats.totalAbsence}건</div>
                <div className="text-xs text-gray-500 mt-1">
                  결석률: {stats.totalReservations > 0 ? ((stats.totalAbsence / stats.totalReservations) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">대기/미정</div>
                <div className="mt-2 text-2xl font-bold text-yellow-600">
                  {stats.totalReservations - stats.totalAttendance - stats.totalAbsence}건
                </div>
              </div>
            </div>

            {/* 잔여횟수별 회원수와 잔여 기간별 회원수를 1줄에 2개 컬럼으로 배치 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 잔여횟수별 회원수 (설정값 기반만) */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-4">
                  {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월 잔여횟수별 회원수
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (설정: {systemSettings.remainingSessionsThreshold}회 이하 알림)
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(stats.membersByRemainingSessions)
                    .filter(([key]) => key.includes('회 이하'))
                    .map(([sessions, count]) => (
                      <div key={sessions} className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{count}명</div>

                      </div>
                    ))}
                  {Object.entries(stats.membersByRemainingSessions)
                    .filter(([key]) => key.includes('회 이하'))
                    .length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      설정값({systemSettings.remainingSessionsThreshold}회 이하)에 해당하는 회원이 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 잔여 기간별 회원수 (설정값 기반만) */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-4">
                  {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월 잔여 기간별 회원수
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (설정: {systemSettings.membershipExpirationBuffer}일 이내 만료 알림)
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(stats.membersByExpiryBuffer)
                    .sort(([a], [b]) => {
                      const daysA = parseInt(a.match(/\d+/)?.[0] || '0');
                      const daysB = parseInt(b.match(/\d+/)?.[0] || '0');
                      return daysA - daysB;
                    })
                    .map(([days, count]) => (
                      <div key={days} className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{count}명</div>

                      </div>
                    ))}
                  {Object.entries(stats.membersByExpiryBuffer).length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      설정값({systemSettings.membershipExpirationBuffer}일 이내)에 해당하는 회원이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 회원 상세 정보 */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">
                {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월 회원 상세 정보
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">이름</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">회원권 상태</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">잔여 횟수</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">만료일</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">만료까지 남은 일수</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">마지막 출석일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDetails.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{member.name}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            member.membershipStatus === '활성' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.membershipStatus}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                          {member.remainingSessions}회
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                          {member.expiryDate}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                          {member.daysUntilExpiry !== undefined ? `${member.daysUntilExpiry}일` : '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">
                          {member.lastAttendance || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>

            {/* 예약 상세 정보 */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">
                예약 상세 정보 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월)
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">회원명</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">수업명</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">수업일</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">수업시간</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">출석상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservationDetails.map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{reservation.memberName}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{reservation.className}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">{reservation.classDate}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center">{reservation.classTime}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            reservation.attendanceStatus === '출석' 
                              ? 'bg-green-100 text-green-800'
                              : reservation.attendanceStatus === '결석'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {reservation.attendanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            </div>
          </>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
        )}
      </div>
    </SidebarLayout>
  );
}
