"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Calendar, Phone, User, CreditCard, Clock, MapPin } from "lucide-react";
import { getLatestMembershipInfo, type MemberWithMembership } from "@/lib/membership";
import { createLogContext, logDebug, logError } from "@/lib/logger";

interface MemberDetail {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  registered_at: string | null;
  last_visit_at: string | null;
  points: number | null;
  memo: string | null;
  kakao_user_id: string | null;
  membership_status: string;
  remaining_sessions: number;
  expires_at: string | null;
  membership_type: string | null;
  start_date: string | null;
  total_sessions: number;
  used_sessions: number;
  reservations?: Array<{
    id: string;
    created_at: string;
    class: {
      class_date: string;
      class_time: string;
    } | null;
  }>;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const debugId = React.useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (memberId) {
      loadMemberDetail();
    }
  }, [memberId]);

  const loadMemberDetail = async () => {
    const context = `MemberDetailPage#loadMemberDetail`;
    logDebug({ debugId, context, state: 'start', extra: { memberId } }, '회원 상세 정보 로드 시작');

    try {
      setLoading(true);
      setError("");

      // 1. 회원 기본 정보 조회
      const { data: memberData, error: memberError } = await supabase
        .from('member')
        .select(`
          id,
          name,
          gender,
          age,
          phone,
          registered_at,
          last_visit_at,
          points,
          memo,
          kakao_user_id
        `)
        .eq('id', memberId)
        .single();

      if (memberError) {
        logError({ debugId, context, error: memberError, extra: { memberId }, message: '회원 정보 조회 실패' });
        throw new Error('회원 정보를 불러올 수 없습니다.');
      }

      // 2. 회원권 정보 조회
      const membershipInfo = await getLatestMembershipInfo(memberId);

      // 3. 예약 내역 조회 (최근 10개) - class 테이블과 조인
      const { data: reservations, error: reservationError } = await supabase
        .from('reservation')
        .select(`
          id,
          created_at,
          class_id
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(10);

      // class 정보를 별도로 조회
      let reservationsWithClassInfo: Array<{
        id: string;
        created_at: string;
        class: {
          class_date: string;
          class_time: string;
        } | null;
      }> = [];
      if (reservations && reservations.length > 0) {
        const classIds = reservations.map(r => r.class_id);
        const { data: classData, error: classError } = await supabase
          .from('class')
          .select('id, class_date, class_time')
          .in('id', classIds);

        if (!classError && classData) {
          const classMap = new Map(classData.map(c => [c.id, c]));
          reservationsWithClassInfo = reservations.map(reservation => ({
            id: reservation.id as string,
            created_at: reservation.created_at as string,
            class: classMap.get(reservation.class_id) ? {
              class_date: (classMap.get(reservation.class_id) as any).class_date as string,
              class_time: (classMap.get(reservation.class_id) as any).class_time as string
            } : null
          }));
        }
      }

      if (reservationError) {
        logError({ debugId, context, error: reservationError, extra: { memberId }, message: '예약 내역 조회 실패' });
        // 예약 내역 오류는 치명적이지 않으므로 로그만 남기고 계속 진행
      }

             const memberDetail: MemberDetail = {
         ...(memberData as any),
         membership_status: membershipInfo?.membership_status || '미등록',
         remaining_sessions: membershipInfo?.remaining_sessions || 0,
         expires_at: membershipInfo?.expires_at || null,
         membership_type: membershipInfo?.membership_type || null,
         start_date: membershipInfo?.start_date || null,
         total_sessions: membershipInfo?.total_sessions || 0,
         used_sessions: membershipInfo?.used_sessions || 0,
         reservations: reservationsWithClassInfo
       };

      setMember(memberDetail);
      logDebug({ debugId, context, state: 'success', extra: { memberId } }, '회원 상세 정보 로드 완료');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      logError({ debugId, context, error: error as Error, extra: { memberId }, message: '회원 정보 로드 중 오류 발생' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case '활성':
        return 'bg-green-100 text-green-800 border-green-200';
      case '만료':
        return 'bg-red-100 text-red-800 border-red-200';
      case '정지':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '임시':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-red-600 mb-4">
              {error || '회원 정보를 찾을 수 없습니다.'}
            </div>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{member.name} 회원 상세정보</h1>
          </div>
          <Button onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-2" />
            정보 수정
          </Button>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-6">
            {/* 회원 기본 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                기본 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">이름</label>
                  <p className="text-gray-900">{member.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">성별</label>
                  <p className="text-gray-900">{member.gender || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">나이</label>
                  <p className="text-gray-900">{member.age || '-'}세</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">전화번호</label>
                  <p className="text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {member.phone || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">등록일</label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(member.registered_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">최근 방문</label>
                  <p className="text-gray-900 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatDate(member.last_visit_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">포인트</label>
                  <p className="text-gray-900">{member.points || 0}P</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">카카오 연동</label>
                  <p className="text-gray-900">
                    {member.kakao_user_id ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        연동됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        미연동
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {member.memo && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">메모</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{member.memo}</p>
                </div>
              )}
            </div>

            {/* 회원권 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                회원권 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">상태</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMembershipStatusColor(member.membership_status)}`}>
                      {member.membership_status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">회원권 유형</label>
                  <p className="text-gray-900">{member.membership_type || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">시작일</label>
                  <p className="text-gray-900">{formatDate(member.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">만료일</label>
                  <p className="text-gray-900">{formatDate(member.expires_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">총 횟수</label>
                  <p className="text-gray-900">{member.total_sessions}회</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">사용 횟수</label>
                  <p className="text-gray-900">{member.used_sessions}회</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">잔여 횟수</label>
                  <p className="text-gray-900 font-semibold text-lg">{member.remaining_sessions}회</p>
                </div>
              </div>
            </div>

            {/* 예약 내역 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                최근 예약 내역
              </h2>
              {member.reservations && member.reservations.length > 0 ? (
                <div className="space-y-3">
                  {member.reservations.map((reservation) => (
                    <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {reservation.class ? `${reservation.class.class_date} ${reservation.class.class_time}` : '수업 정보 없음'}
                        </p>
                        <p className="text-sm text-gray-500">
                          예약일: {formatDateTime(reservation.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">예약 내역이 없습니다.</p>
              )}
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}
