"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  class_id: string;
  class?: {
    class_date: string;
    class_time: string;
    capacity: number;
  };
}

interface Member {
  id: string;
  name: string;
  phone: string;
}

function ReservationManageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [action, setAction] = useState<'change' | 'cancel' | null>(null);
  const [processing, setProcessing] = useState(false);

  const kakaoUserId = searchParams?.get("uid");
  const returnUrl = searchParams?.get("return");

  useEffect(() => {
    if (kakaoUserId) {
      fetchReservations();
    }
  }, [kakaoUserId]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      console.log('예약 조회 시작:', { kakaoUserId });
      
      // 회원 정보 조회
      const { data: memberData, error: memberError } = await supabaseClient
        .from('member')
        .select('id, name, phone')
        .eq('kakao_user_id', kakaoUserId || '')
        .single();

      console.log('회원 정보 조회 결과:', { memberData, memberError });

      if (memberError || !memberData) {
        console.error('회원 정보 조회 실패:', memberError);
        setError('회원 정보를 찾을 수 없습니다.');
        return;
      }

      setMember({
        id: memberData.id as string,
        name: memberData.name as string,
        phone: memberData.phone as string
      });

      // 예약 정보 조회 (class 정보 포함)
      console.log('예약 조회 쿼리 시작:', { name: memberData.name, phone: memberData.phone });
      
      const { data: reservationData, error: reservationError } = await supabaseClient
        .from('reservation')
        .select(`
          id,
          name,
          phone,
          created_at,
          class_id,
          class:class_id (
            class_date,
            class_time,
            capacity
          )
        `)
        .eq('name', memberData.name as string)
        .eq('phone', memberData.phone as string);

      console.log('예약 조회 결과:', { reservationData, reservationError });

      if (reservationError) {
        console.error('예약 조회 오류:', reservationError);
        setError('예약 정보를 불러오는데 실패했습니다.');
        return;
      }

                        // 현재 시간 이후의 예약만 필터링 (정확한 시간 비교)
                  const now = new Date();
                  const today = now.toISOString().split('T')[0];
                  const nowTime = now.toTimeString().slice(0, 5);

                  console.log('필터링 전 예약 데이터:', reservationData);
                  console.log('현재 시간:', { today, nowTime });

                  const upcomingReservations = (reservationData || []).filter((reservation: any) => {
                    console.log('예약 필터링 중:', reservation);
                    
                    // class 정보 체크 로직 수정
                    let classInfo;
                    if (reservation.class) {
                      if (Array.isArray(reservation.class)) {
                        if (reservation.class.length === 0) {
                          console.log('예약 필터링 실패: class 배열이 비어있음');
                          return false;
                        }
                        classInfo = reservation.class[0];
                      } else {
                        // 배열이 아닌 객체인 경우
                        classInfo = reservation.class;
                      }
                    } else {
                      console.log('예약 필터링 실패: class 정보 없음');
                      return false;
                    }
                    
                    const classDate = classInfo.class_date;
                    const classTime = classInfo.class_time;
                    
                    // 정확한 시간 비교: 현재 시간보다 미래의 예약만 포함
                    const isUpcoming = classDate > today || (classDate === today && classTime > nowTime);
                    console.log('예약 시간 비교:', { classDate, classTime, today, nowTime, isUpcoming });
                    return isUpcoming;
                  }).map((reservation: any) => {
                    // class 정보 정규화
                    let classInfo;
                    if (Array.isArray(reservation.class)) {
                      classInfo = reservation.class[0];
                    } else {
                      classInfo = reservation.class;
                    }
                    
                    return {
                      ...reservation,
                      class: classInfo
                    };
                  }).sort((a, b) => {
                    // 날짜/시간 순으로 정렬
                    const dateA = a.class.class_date + ' ' + a.class.class_time;
                    const dateB = b.class.class_date + ' ' + b.class.class_time;
                    return dateA.localeCompare(dateB);
                  });

      console.log('필터링 후 예약 데이터:', upcomingReservations);
      setReservations(upcomingReservations);
    } catch (error) {
      console.error('예약 조회 오류:', error);
      setError('예약 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedReservation) return;

    try {
      setProcessing(true);
      
      const response = await fetch('/api/reservation/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservation_id: selectedReservation
        })
      });

                        const result = await response.json();
                  console.log('예약 취소 API 응답:', result);

                  if (result.success) {
                    alert('예약이 성공적으로 취소되었습니다.');
                    console.log('예약 취소 성공, 목록 새로고침 시작');
                    // 예약 목록 새로고침
                    await fetchReservations();
                    setSelectedReservation(null);
                    setAction(null);
                  } else {
                    console.error('예약 취소 실패:', result);
                    alert('예약 취소에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
                  }
    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert('예약 취소 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChange = () => {
    if (!selectedReservation) return;
    
    // 예약 변경 전용 페이지로 이동
    const params = new URLSearchParams({
      reservation_id: selectedReservation,
      uid: kakaoUserId || '',
      return: returnUrl || ''
    });
    router.push(`/reservation-change?${params.toString()}`);
  };

  const formatDateTime = (date: string, time: string) => {
    const [year, month, day] = date.split('-');
    const [hour] = time.split(':');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[dateObj.getDay()];
    
    return `${Number(month)}/${Number(day)}(${weekday}) ${Number(hour)}시`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">예약 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          예약 관리
        </h1>
        
        {member && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">회원 정보</p>
            <p className="font-semibold">{member.name}님</p>
            <p className="text-sm text-gray-600">{member.phone}</p>
          </div>
        )}

        {reservations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">남은 예약이 없습니다.</p>
            <button 
              onClick={() => router.push(`/reservation?uid=${kakaoUserId}&return=${returnUrl}`)}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              새 예약하기
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">예약 목록</h2>
              <div className="space-y-3">
                {reservations.map((reservation) => (
                  <div 
                    key={reservation.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReservation === reservation.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedReservation(reservation.id)}
                  >
                    {reservation.class && (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {formatDateTime(reservation.class.class_date, reservation.class.class_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            예약일: {new Date(reservation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                          {selectedReservation === reservation.id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedReservation && (
              <div className="space-y-3">
                <button
                  onClick={() => setAction('change')}
                  disabled={processing}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {processing ? '처리 중...' : '예약 변경'}
                </button>
                <button
                  onClick={() => setAction('cancel')}
                  disabled={processing}
                  className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {processing ? '처리 중...' : '예약 취소'}
                </button>
              </div>
            )}

            {action === 'cancel' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium mb-3">예약을 취소하시겠습니까?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {processing ? '취소 중...' : '확인'}
                  </button>
                  <button
                    onClick={() => setAction(null)}
                    disabled={processing}
                    className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {action === 'change' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium mb-3">예약을 변경하시겠습니까?</p>
                <p className="text-sm text-green-700 mb-3">
                  기존 예약이 취소되고 새로운 예약 페이지로 이동합니다.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleChange}
                    className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setAction(null)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              if (returnUrl) {
                window.location.href = returnUrl;
              } else {
                window.history.back();
              }
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            ← 카카오톡으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservationManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>}>
      <ReservationManageInner />
    </Suspense>
  );
}
