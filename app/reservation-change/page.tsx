"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

interface ClassInfo {
  id: string;
  class_date: string;
  class_time: string;
  capacity: number;
  availableSlots?: number;
  isAvailable?: boolean;
}

interface ReservationInfo {
  id: string;
  name: string;
  phone: string;
  class: ClassInfo;
}

function ReservationChangeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [changing, setChanging] = useState(false);

  const reservationId = searchParams?.get("reservation_id");
  const kakaoUserId = searchParams?.get("uid");
  const returnUrl = searchParams?.get("return");

  useEffect(() => {
    if (reservationId) {
      fetchReservationAndClasses();
    }
  }, [reservationId]);

  const fetchReservationAndClasses = async () => {
    try {
      setLoading(true);
      
      // 1. 선택된 예약 정보 조회
      const { data: reservationData, error: reservationError } = await supabaseClient
        .from('reservation')
        .select(`
          id,
          name,
          phone,
          class:class_id (
            id,
            class_date,
            class_time,
            capacity
          )
        `)
        .eq('id', reservationId || '')
        .single();

      if (reservationError || !reservationData) {
        setError('예약 정보를 찾을 수 없습니다.');
        return;
      }

      // class 정보 정규화 (배열에서 객체로 변환)
      const normalizedReservation = {
        ...reservationData,
        id: reservationData.id as string,
        name: reservationData.name as string,
        phone: reservationData.phone as string,
        class: Array.isArray(reservationData.class) 
          ? reservationData.class[0] 
          : reservationData.class
      };

      setReservation(normalizedReservation);

      // 2. 변경 가능한 수업 조회 (현재 예약보다 미래의 수업만)
      const currentClass = normalizedReservation.class;
      const currentDateTime = `${currentClass.class_date} ${currentClass.class_time}`;

      // 현재 시간 기준으로 미래 수업만 조회
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const nowTime = now.toTimeString().slice(0, 5);

      const { data: classesData, error: classesError } = await supabaseClient
        .from('class')
        .select('id, class_date, class_time, capacity')
        .or(`class_date.gt.${currentClass.class_date},and(class_date.eq.${currentClass.class_date},class_time.gt.${currentClass.class_time})`)
        .order('class_date', { ascending: true })
        .order('class_time', { ascending: true });

      if (classesError) {
        setError('수업 정보를 불러오는데 실패했습니다.');
        return;
      }

      // 3. 각 수업의 예약 현황 확인 및 현재 시간 기준 필터링
      const classesWithAvailability = await Promise.all(
        (classesData || []).map(async (classInfo) => {
          const { data: reservationCount } = await supabaseClient
            .from('reservation')
            .select('id', { count: 'exact' })
            .eq('class_id', classInfo.id as string);

          const availableSlots = (classInfo.capacity as number) - (reservationCount?.length || 0);
          
          // 현재 시간보다 미래인지 확인
          const isFuture = (classInfo.class_date as string) > today || 
            ((classInfo.class_date as string) === today && (classInfo.class_time as string) > nowTime);
          
          return {
            ...classInfo,
            id: classInfo.id as string,
            class_date: classInfo.class_date as string,
            class_time: classInfo.class_time as string,
            capacity: classInfo.capacity as number,
            availableSlots,
            isAvailable: availableSlots > 0 && isFuture
          };
        })
      );

      // 예약 가능하고 미래인 수업만 필터링
      const availableClasses = classesWithAvailability.filter(c => c.isAvailable);
      setAvailableClasses(availableClasses);

    } catch (error) {
      console.error('예약 변경 정보 조회 오류:', error);
      setError('정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeReservation = async (newClassId: string) => {
    if (!reservation || !newClassId) return;

    try {
      setChanging(true);

      // 1. 기존 예약 삭제
      const { error: deleteError } = await supabaseClient
        .from('reservation')
        .delete()
        .eq('id', reservation.id);

      if (deleteError) {
        throw new Error('기존 예약 취소에 실패했습니다.');
      }

      // 2. 새로운 예약 생성
      const { error: insertError } = await supabaseClient
        .from('reservation')
        .insert({
          class_id: newClassId,
          name: reservation.name,
          phone: reservation.phone,
          uid: kakaoUserId || null
        });

      if (insertError) {
        throw new Error('새로운 예약 생성에 실패했습니다.');
      }

      alert('예약이 성공적으로 변경되었습니다!');
      
      // 카카오톡으로 돌아가기
      if (returnUrl) {
        window.location.href = returnUrl;
      } else {
        router.push('/reservation-manage?uid=' + kakaoUserId);
      }

    } catch (error) {
      console.error('예약 변경 오류:', error);
      alert('예약 변경에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setChanging(false);
    }
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

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">예약 정보를 찾을 수 없습니다.</p>
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
          예약 변경
        </h1>

        {/* 현재 예약 정보 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold text-blue-800 mb-2">현재 예약</h2>
          <p className="text-blue-700">
            {formatDateTime(reservation.class.class_date, reservation.class.class_time)}
          </p>
          <p className="text-sm text-blue-600">
            {reservation.name}님 • {reservation.phone}
          </p>
        </div>

        {/* 변경 가능한 수업 목록 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">변경 가능한 수업</h2>
          
          {availableClasses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">변경 가능한 수업이 없습니다.</p>
              <p className="text-sm text-gray-500">
                현재 예약보다 미래의 수업 중 예약 가능한 수업이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableClasses.map((classInfo) => (
                <div 
                  key={classInfo.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {formatDateTime(classInfo.class_date, classInfo.class_time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        예약 가능: {classInfo.availableSlots}/{classInfo.capacity}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleChangeReservation(classInfo.id)}
                      disabled={changing}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {changing ? '변경 중...' : '변경하기'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="space-y-3">
          <button
            onClick={() => {
              if (returnUrl) {
                window.location.href = returnUrl;
              } else {
                router.push('/reservation-manage?uid=' + kakaoUserId);
              }
            }}
            className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600"
          >
            취소하고 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservationChangePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>}>
      <ReservationChangeInner />
    </Suspense>
  );
}
