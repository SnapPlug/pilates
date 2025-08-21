"use client";
import React from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { supabaseClient } from "@/lib/supabaseClient";

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  totalReservations: number;
  totalAttendance: number;
  totalAbsence: number;
  membersByRemainingSessions: {
    [sessions: number]: number;
  };
};

type MemberDetail = {
  id: string;
  name: string;
  membershipStatus: string;
  remainingSessions: number;
  expiryDate: string;
  lastAttendance: string | null;
};

type ReservationDetail = {
  id: string;
  memberName: string;
  className: string;
  classDate: string;
  classTime: string;
  attendanceStatus: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [memberDetails, setMemberDetails] = React.useState<MemberDetail[]>([]);
  const [reservationDetails, setReservationDetails] = React.useState<ReservationDetail[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [year, month] = new Date().toISOString().split('T')[0].split('-').map(Number);
      
      // 월간 날짜 범위 계산
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      console.log('대시보드 데이터 조회:', { startDate, endDate });

      // 1. 회원 통계 조회
      console.log('회원 데이터 조회 시작...');

      // 1. 회원 통계 조회
      const { data: members, error: membersError } = await supabaseClient
        .from('member')
        .select(`
          id,
          name,
          membership_history (
            status,
            remaining_sessions,
            end_date
          )
        `)
        .order('name');

      if (membersError) {
        console.error('회원 조회 오류:', membersError);
        throw new Error(`회원 데이터를 불러오는데 실패했습니다: ${membersError.message}`);
      }

      console.log('회원 데이터 조회 성공:', { count: members?.length || 0 });

      // 2. 예약 및 출석 통계 조회
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

      // 3. 통계 계산
      const totalMembers = members?.length || 0;
      let activeMembers = 0;
      let expiredMembers = 0;
      const membersByRemainingSessions: { [sessions: number]: number } = {};
      const memberDetailList: MemberDetail[] = [];

      members?.forEach(member => {
        const membership = member.membership_history?.[0];
        
        if (membership) {
          const isActive = membership.status === '활성' && 
            new Date(membership.end_date) > new Date();
          
          if (isActive) {
            activeMembers++;
          } else {
            expiredMembers++;
          }

          const remainingSessions = membership.remaining_sessions || 0;
          if (!membersByRemainingSessions[remainingSessions]) {
            membersByRemainingSessions[remainingSessions] = 0;
          }
          membersByRemainingSessions[remainingSessions]++;

          memberDetailList.push({
            id: member.id,
            name: member.name,
            membershipStatus: isActive ? '활성' : '만료',
            remainingSessions,
            expiryDate: membership.end_date,
            lastAttendance: null // TODO: 마지막 출석일 조회 로직 추가
          });
        } else {
          // membership_history가 없는 회원 처리
          expiredMembers++;
          if (!membersByRemainingSessions[0]) {
            membersByRemainingSessions[0] = 0;
          }
          membersByRemainingSessions[0]++;

          memberDetailList.push({
            id: member.id,
            name: member.name,
            membershipStatus: '회원권 없음',
            remainingSessions: 0,
            expiryDate: '-',
            lastAttendance: null
          });
        }
      });

      // 4. 예약 및 출석 통계
      const totalReservations = reservations?.length || 0;
      const totalAttendance = reservations?.filter(r => r.attendance_status === 'attended').length || 0;
      const totalAbsence = reservations?.filter(r => r.attendance_status === 'absent').length || 0;

      // 5. 예약 상세 정보 (날짜순으로 정렬)
      const reservationDetailList: ReservationDetail[] = (reservations || [])
        .sort((a, b) => {
          const dateA = (a.class as any)?.class_date || '';
          const dateB = (b.class as any)?.class_date || '';
          return dateB.localeCompare(dateA); // 최신 날짜가 먼저 오도록 내림차순 정렬
        })
        .map(r => ({
          id: r.id,
          memberName: r.name,
          className: (r.class as any)?.class_name || '수업명 없음',
          classDate: (r.class as any)?.class_date || '',
          classTime: (r.class as any)?.class_time || '',
          attendanceStatus: r.attendance_status === 'attended' ? '출석' : 
                           r.attendance_status === 'absent' ? '결석' : '대기'
        }));

      const dashboardStats: DashboardStats = {
        totalMembers,
        activeMembers,
        expiredMembers,
        totalReservations,
        totalAttendance,
        totalAbsence,
        membersByRemainingSessions
      };

      console.log('대시보드 통계:', dashboardStats);
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
    loadDashboardData();
  }, []);

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">대시보드</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
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
            {/* 주요 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">총 회원수</div>
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

            {/* 잔여횟수별 회원수 */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">잔여횟수별 회원수</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(stats.membersByRemainingSessions)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([sessions, count]) => (
                    <div key={sessions} className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{count}명</div>
                      <div className="text-sm text-gray-600">{sessions}회 남음</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 회원 상세 정보 */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">회원 상세 정보</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">이름</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">회원권 상태</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">잔여 횟수</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">만료일</th>
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
              <h3 className="text-lg font-semibold mb-4">예약 상세 정보</h3>
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
