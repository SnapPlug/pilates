"use client";
import { Calendar } from "@/components/ui/mini-calendar";

// 전역 로그 추가
console.log("=== 예약 페이지 스크립트 로드됨 ===");

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// 에러 바운더리 컴포넌트
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string>("");

  if (hasError) {
    return (
      <div className="p-4 text-red-500">
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>새로고침</button>
      </div>
    );
  }

  return (
    <div onError={(e) => {
      console.error("에러 바운더리에서 오류 감지:", e);
      setError("알 수 없는 오류가 발생했습니다");
      setHasError(true);
    }}>
      {children}
    </div>
  );
}

type ClassRow = {
  id: string;
  class_date: string; // yyyy-mm-dd
  class_time: string; // HH:MM:SS or HH:MM
  capacity: number;
  member_name?: string | null; // 예약자명(개발용, 콤마구분 가능성)
  isPastClass?: boolean; // 과거 수업 여부
};

type ReservationRow = {
  id: string;
  class_id: string;
  uid: string | null;
  name: string;
  phone: string;
  created_at: string;
  class_date: string;
  class_time: string;
};

function ReservationInner() {
  const searchParams = useSearchParams();
  const uidFromUrl = searchParams?.get("uid") ?? "";
  const nameFromUrl = searchParams?.get("name") ?? "";
  const modeFromUrl = searchParams?.get("mode") ?? ""; // cancel, change 등
  const existingReservationId = searchParams?.get("existing_reservation_id") ?? ""; // 변경할 예약 ID
  
  // URL 파라미터 디버깅
  console.log("URL 파라미터:", { uidFromUrl, nameFromUrl, modeFromUrl });
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(nameFromUrl);
  const [userPhone, setUserPhone] = useState<string>("");
  const [mappingStatus, setMappingStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(modeFromUrl === "cancel" || modeFromUrl === "change");
  const [myReservations, setMyReservations] = useState<ReservationRow[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState<string | null>(null);
  const [changingReservation, setChangingReservation] = useState<string | null>(null);
  const [showChangeForm, setShowChangeForm] = useState<string | null>(null);

  const [reservationsByClass, setReservationsByClass] = useState<Record<string, number>>({});

  // 카카오 사용자 ID와 회원 정보 매핑
  const handleUserMapping = async (name: string, phone: string) => {
    console.log("handleUserMapping 시작:", { uidFromUrl, name, phone });
    
    if (!uidFromUrl || !name || !phone) {
      console.log("매핑 정보 부족:", { uidFromUrl, name, phone });
      return;
    }

    try {
      setMappingStatus("매핑 중...");
      console.log("매핑 시작:", { kakao_user_id: uidFromUrl, name, phone });

      const response = await fetch('/api/member/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kakao_user_id: uidFromUrl,
          name: name,
          phone: phone
        })
      });

      const result = await response.json();
      console.log("매핑 결과:", result);

      if (result.success) {
        setMappingStatus("회원과 성공적으로 연결되었습니다!");
        setTimeout(() => setMappingStatus(""), 3000);
      } else {
        setMappingStatus("매핑 실패: " + (result.message || "알 수 없는 오류"));
        setTimeout(() => setMappingStatus(""), 5000);
      }
    } catch (error) {
      console.error("매핑 오류:", error);
      setMappingStatus("매핑 중 오류가 발생했습니다.");
      setTimeout(() => setMappingStatus(""), 5000);
    }
  };

  useEffect(() => {
    console.log("ReservationInner 컴포넌트 마운트됨");
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("class")
          .select("id,class_date,class_time,capacity,\"member name\"");
        if (error) throw error;
        const normalized: ClassRow[] = (data || []).map((r: { id: string; class_date: string | Date; class_time: string; capacity: number; [key: string]: unknown }) => ({
          id: r.id,
          class_date: String(r.class_date),
          class_time: String(r.class_time).slice(0, 5),
          capacity: Number(r.capacity ?? 0),
          member_name: typeof r["member name"] === "string" ? (r["member name"] as string) : null,
        }));
        setClasses(normalized);
      } catch (e: unknown) {
        console.error("[ERROR][reservation#fetch]", e);
        const message = e instanceof Error ? e.message : "수업 정보를 불러오지 못했습니다.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // mode가 cancel이나 change일 때 자동으로 예약 목록 불러오기
  useEffect(() => {
    if ((modeFromUrl === "cancel" || modeFromUrl === "change") && (uidFromUrl || nameFromUrl)) {
      fetchMyReservations();
    }
  }, [modeFromUrl, uidFromUrl, nameFromUrl]);

  // 내 예약 목록 불러오기
  const fetchMyReservations = async () => {
    if (!uidFromUrl && !nameFromUrl) {
      setError("사용자 정보가 없습니다.");
      return;
    }

    try {
      setLoadingReservations(true);
      let query = supabase
        .from("reservation")
        .select(`
          id,
          class_id,
          uid,
          name,
          phone,
          created_at,
          class:class_id(class_date, class_time)
        `);

      if (uidFromUrl) {
        query = query.eq("uid", uidFromUrl);
      } else if (nameFromUrl) {
        query = query.eq("name", nameFromUrl);
      }

      const { data, error } = await query;
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: ReservationRow[] = (data || []).map((r: any) => ({
        id: r.id,
        class_id: r.class_id,
        uid: r.uid,
        name: r.name,
        phone: r.phone,
        created_at: r.created_at,
        class_date: r.class?.class_date || "",
        class_time: r.class?.class_time?.slice(0, 5) || "",
      }));

      setMyReservations(formatted);
    } catch (e: unknown) {
      console.error("[ERROR][reservation#fetchMyReservations]", e);
      const message = e instanceof Error ? e.message : "예약 정보를 불러오지 못했습니다.";
      setError(message);
    } finally {
      setLoadingReservations(false);
    }
  };

  // 예약 취소
  const cancelReservation = async (reservationId: string) => {
    try {
      setCancellingReservation(reservationId);
      const { error } = await supabase
        .from("reservation")
        .delete()
        .eq("id", reservationId);
      
      if (error) throw error;

      // 예약 목록에서 제거
      setMyReservations(prev => prev.filter(r => r.id !== reservationId));
      
      // 예약 수 업데이트
      const reservation = myReservations.find(r => r.id === reservationId);
      if (reservation) {
        setReservationsByClass(prev => ({
          ...prev,
          [reservation.class_id]: Math.max(0, (prev[reservation.class_id] || 0) - 1)
        }));
      }

      // 카카오톡으로 돌아가기
      if (uidFromUrl) {
        const kakaoBotId = process.env.NEXT_PUBLIC_KAKAO_BOT_ID || '_YOUR_BOT_ID';
        const kakaoReturnUrl = `https://pf.kakao.com/${kakaoBotId}/chat?return=cancelled&uid=${uidFromUrl}`;
        alert("예약이 취소되었습니다! 카카오톡으로 돌아갑니다.");
        setTimeout(() => {
          window.location.href = kakaoReturnUrl;
        }, 2000);
      } else {
        alert("예약이 취소되었습니다.");
      }
    } catch (e: unknown) {
      console.error("[ERROR][reservation#cancelReservation]", e);
      const message = e instanceof Error ? e.message : "예약 취소 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setCancellingReservation(null);
    }
  };

  // 예약 변경
  const changeReservation = async (oldReservationId: string, newClassId: string) => {
    try {
      setChangingReservation(oldReservationId);
      
      // 1) 기존 예약 정보 가져오기
      const oldReservation = myReservations.find(r => r.id === oldReservationId);
      if (!oldReservation) {
        throw new Error("기존 예약 정보를 찾을 수 없습니다.");
      }

      // 2) 새 수업의 capacity 체크
      const newClass = classes.find(c => c.id === newClassId);
      if (!newClass) {
        throw new Error("새 수업 정보를 찾을 수 없습니다.");
      }

      const reserved = getReservedCount(newClass);
      if (reserved >= newClass.capacity) {
        throw new Error("이미 마감된 수업입니다.");
      }

      // 3) 새 예약 생성
      const { error: insertError } = await supabase.from("reservation").insert({
        class_id: newClassId,
        uid: oldReservation.uid,
        name: oldReservation.name,
        phone: oldReservation.phone,
      });
      
      if (insertError) throw insertError;

      // 4) 기존 예약 삭제
      const { error: deleteError } = await supabase
        .from("reservation")
        .delete()
        .eq("id", oldReservationId);
      
      if (deleteError) throw deleteError;

      // 5) 예약 수 업데이트
      setReservationsByClass(prev => ({
        ...prev,
        [oldReservation.class_id]: Math.max(0, (prev[oldReservation.class_id] || 0) - 1),
        [newClassId]: (prev[newClassId] || 0) + 1
      }));

      // 6) 예약 목록에서 제거하고 새 예약 추가
      setMyReservations(prev => {
        const filtered = prev.filter(r => r.id !== oldReservationId);
        const newReservation: ReservationRow = {
          id: `temp-${Date.now()}`, // 임시 ID
          class_id: newClassId,
          uid: oldReservation.uid,
          name: oldReservation.name,
          phone: oldReservation.phone,
          created_at: new Date().toISOString(),
          class_date: newClass.class_date,
          class_time: newClass.class_time.slice(0, 5),
        };
        return [...filtered, newReservation];
      });

      setShowChangeForm(null);
      
      // 카카오톡으로 돌아가기
      if (uidFromUrl) {
        const kakaoBotId = process.env.NEXT_PUBLIC_KAKAO_BOT_ID || '_YOUR_BOT_ID';
        const kakaoReturnUrl = `https://pf.kakao.com/${kakaoBotId}/chat?return=changed&uid=${uidFromUrl}`;
        alert("예약이 변경되었습니다! 카카오톡으로 돌아갑니다.");
        setTimeout(() => {
          window.location.href = kakaoReturnUrl;
        }, 2000);
      } else {
        alert("예약이 변경되었습니다.");
      }
    } catch (e: unknown) {
      console.error("[ERROR][reservation#changeReservation]", e);
      const message = e instanceof Error ? e.message : "예약 변경 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setChangingReservation(null);
    }
  };

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [] as ClassRow[];
    const key = format(selectedDate, "yyyy-MM-dd");
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const currentTime = format(now, "HH:mm");
    
    return classes
      .filter((c) => c.class_date === key)
      .map((c) => {
        // 과거 수업인지 확인
        const isPastClass = 
          c.class_date < today || 
          (c.class_date === today && c.class_time <= currentTime);
        
        return {
          ...c,
          isPastClass
        };
      })
      .sort((a, b) => a.class_time.localeCompare(b.class_time));
  }, [classes, selectedDate]);

  const getReservedCount = (row: ClassRow) => reservationsByClass[row.id] ?? 0;

  // fetch reservations count for ALL classes so that markers persist across dates
  useEffect(() => {
    const loadCountsAll = async () => {
      const ids = classes.map((r) => r.id);
      if (ids.length === 0) return setReservationsByClass({});
      try {
        const { data, error } = await supabase
          .from("reservation")
          .select("id,class_id")
          .in("class_id", ids);
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data || []).forEach((r: { class_id: string }) => {
          counts[r.class_id] = (counts[r.class_id] ?? 0) + 1;
        });
        setReservationsByClass(counts);
      } catch (e) {
        // ignore in dev if table missing
      }
    };
    loadCountsAll();
  }, [classes]);

  const handleReserve = async (row: ClassRow) => {
    setActiveClassId(row.id);
    // 이름이 없으면 URL 이름으로 세팅
    if (!userName && nameFromUrl) setUserName(nameFromUrl);
  };

  const submitReservation = async (row: ClassRow) => {
    console.log("submitReservation 시작:", { 
      userName, 
      userPhone, 
      uidFromUrl, 
      rowId: row.id,
      modeFromUrl,
      existingReservationId
    });
    
    if (!userName || !userPhone) {
      setError("이름과 연락처를 입력해주세요.");
      return;
    }
    setError("");
    try {
      setSaving(true);
      
      // 변경 모드인 경우 기존 예약 취소
      if (modeFromUrl === 'change' && existingReservationId) {
        console.log("변경 모드: 기존 예약 취소 중...", existingReservationId);
        const { error: cancelError } = await supabase
          .from("reservation")
          .delete()
          .eq("id", existingReservationId);
        
        if (cancelError) {
          console.error("기존 예약 취소 실패:", cancelError);
          throw new Error("기존 예약 취소에 실패했습니다.");
        }
        console.log("기존 예약 취소 완료");
      }
      
      // 1) capacity 체크
      const reserved = getReservedCount(row);
      if (reserved >= row.capacity) {
        setError("이미 마감된 수업입니다.");
        setSaving(false);
        return;
      }
      
      // 2) insert reservation
      const { error } = await supabase.from("reservation").insert({
        class_id: row.id,
        uid: uidFromUrl || null,
        name: userName,
        phone: userPhone,
      });
      if (error) throw error;

      // 2-1) 카카오 사용자 ID와 회원 정보 매핑
      console.log("매핑 조건 확인:", { uidFromUrl, hasUid: !!uidFromUrl });
      if (uidFromUrl) {
        console.log("매핑 시작 - handleUserMapping 호출");
        await handleUserMapping(userName, userPhone);
        
        // 2-1-1) kakao_user_id를 member 테이블에 저장
        try {
          console.log('매핑 시작 - 입력값:', { 
            kakao_user_id: uidFromUrl, 
            name: userName, 
            phone: userPhone 
          });
          
          // 이름과 전화번호로 member 찾기
          const { data: memberData, error: memberError } = await supabase
            .from('member')
            .select('id, name, phone')
            .eq('name', userName)
            .eq('phone', userPhone);
          
          console.log('회원 검색 결과:', { memberData, memberError });
          
          if (memberData && memberData.length > 0 && !memberError) {
            const member = memberData[0];
            console.log('매칭된 회원:', member);
            
            // kakao_user_id 업데이트 (새로운 API 사용)
            const updateResponse = await fetch('/api/member/update-kakao-id', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                member_id: member.id,
                kakao_user_id: uidFromUrl
              })
            });

            const updateResult = await updateResponse.json();
            const updateError = updateResult.error ? new Error(updateResult.error) : null;
            
            if (updateError) {
              console.error('카카오 사용자 ID 저장 오류:', updateError);
              setMappingStatus("매핑 실패: " + updateError.message);
            } else {
              console.log('카카오 사용자 ID가 성공적으로 저장되었습니다.');
              setMappingStatus("매핑 성공!");
            }
          } else {
            console.log('매칭되는 회원을 찾을 수 없습니다:', { name: userName, phone: userPhone });
            
            // 전체 회원 목록 확인 (디버깅용)
            const { data: allMembers } = await supabase
              .from('member')
              .select('id, name, phone')
              .order('created_at', { ascending: false })
              .limit(10);
            
            console.log('전체 회원 목록 (최근 10개):', allMembers);
            setMappingStatus("매칭 실패: 회원을 찾을 수 없습니다");
          }
        } catch (error) {
          console.error('카카오 사용자 ID 저장 실패:', error);
          setMappingStatus("매핑 오류: " + (error instanceof Error ? error.message : '알 수 없는 오류'));
        }
      }

      // 2-1) 예약 정보 포맷팅(표시용) – DB 스키마 변경 없이 Make/카카오에 쓰기 위함
      const baseDate = selectedDate ?? new Date();
      const prettyDate = format(baseDate, "yyyy년 M월 d일");
      const [hh, mm] = String(row.class_time || "00:00").split(":");
      const dateForTime = new Date(baseDate);
      dateForTime.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
      const prettyTime = format(dateForTime, "HH:mm");

      // 2-2) Make Webhook으로 전달(선택). 환경변수에 URL이 있을 경우에만 전송
      const makeUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
      if (makeUrl) {
        try {
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "reservation.confirmed",
              uid: uidFromUrl || null,
              name: userName,
              phone: userPhone,
              classId: row.id,
              date: format(baseDate, "yyyy-MM-dd"),
              time: row.class_time,
              datePretty: prettyDate,
              timePretty: prettyTime,
            }),
          });
        } catch (e) {
          // 네트워크 오류는 사용자 흐름을 막지 않음
          console.warn("[reservation] make webhook send failed", e);
        }
      }
      // 3) refresh counts
      setReservationsByClass((prev) => ({ ...prev, [row.id]: reserved + 1 }));
      setActiveClassId(null);
      
      // 4) 카카오톡으로 돌아가기
      if (uidFromUrl) {
        // 카카오톡 챗봇으로 돌아가기 (예약 완료 상태)
        const kakaoBotId = process.env.NEXT_PUBLIC_KAKAO_BOT_ID || '_YOUR_BOT_ID';
        const kakaoReturnUrl = `https://pf.kakao.com/${kakaoBotId}/chat?return=completed&uid=${uidFromUrl}`;
        
        // 사용자에게 완료 메시지 표시
        alert("예약이 완료되었습니다! 카카오톡으로 돌아갑니다.");
        
        // 잠시 후 카카오톡으로 이동
        setTimeout(() => {
          window.location.href = kakaoReturnUrl;
        }, 2000);
      } else {
        alert("예약이 완료되었습니다. 채팅으로 돌아가주세요.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "예약 처리 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const dayStatus = (day: Date): "available" | "full" | "none" => {
    const key = format(day, "yyyy-MM-dd");
    const dayRows = classes.filter((c) => c.class_date === key);
    if (dayRows.length === 0) return "none";
    const hasAvailable = dayRows.some((r) => getReservedCount(r) < r.capacity);
    return hasAvailable ? "available" : "full";
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* 예약 취소/변경 버튼 */}
      <div className="flex gap-4 mb-4">
        <Button 
          variant={showMyReservations ? "default" : "outline"}
          onClick={() => {
            setShowMyReservations(!showMyReservations);
            if (!showMyReservations) {
              fetchMyReservations();
            }
          }}
        >
          {showMyReservations ? "새 예약하기" : "내 예약 보기/취소"}
        </Button>
      </div>

      {showMyReservations ? (
        // 내 예약 목록 화면
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {modeFromUrl === "cancel" ? "예약 취소" : 
             modeFromUrl === "change" ? "예약 변경" : "내 예약 목록"}
          </h2>
          {modeFromUrl === "cancel" && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border">
              취소하고 싶은 수업을 선택하세요.
            </div>
          )}
          {modeFromUrl === "change" && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border">
              변경하고 싶은 수업을 선택하고 새로운 수업을 선택하세요.
            </div>
          )}
          {loadingReservations ? (
            <div className="text-sm">로딩 중...</div>
          ) : myReservations.length === 0 ? (
            <div className="text-sm text-muted-foreground">예약된 수업이 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myReservations.map((reservation) => (
                <div key={reservation.id} className="rounded border p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {reservation.class_date} {reservation.class_time}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      예약자: {reservation.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      연락처: {reservation.phone}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {modeFromUrl !== "cancel" && modeFromUrl !== "change" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowChangeForm(showChangeForm === reservation.id ? null : reservation.id)}
                      >
                        예약 변경
                      </Button>
                    )}
                    {modeFromUrl !== "change" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancellingReservation === reservation.id}
                        onClick={() => cancelReservation(reservation.id)}
                      >
                        {cancellingReservation === reservation.id ? "취소 중..." : "예약 취소"}
                      </Button>
                    )}
                  </div>
                  
                  {/* 예약 변경 폼 */}
                  {modeFromUrl === "change" && (
                    <div className="mt-4 p-3 bg-gray-50 rounded border">
                      <div className="text-sm font-medium mb-3">새로운 수업 선택</div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {classes
                          .filter(c => c.id !== reservation.class_id) // 현재 예약된 수업 제외
                          .sort((a, b) => {
                            // 날짜순, 시간순으로 정렬
                            const dateCompare = a.class_date.localeCompare(b.class_date);
                            if (dateCompare !== 0) return dateCompare;
                            return a.class_time.localeCompare(b.class_time);
                          })
                          .map((classItem) => {
                            const reserved = getReservedCount(classItem);
                            const isFull = reserved >= classItem.capacity;
                            return (
                              <div key={classItem.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {classItem.class_date} {classItem.class_time}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    예약 {reserved}/{classItem.capacity}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  disabled={isFull || changingReservation === reservation.id}
                                  onClick={() => changeReservation(reservation.id, classItem.id)}
                                >
                                  {changingReservation === reservation.id ? "변경 중..." : (isFull ? "마감" : "선택")}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // 기존 예약 화면
        <>
          <Calendar onSelect={(d) => setSelectedDate(d)} dayStatus={dayStatus} />

          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm text-muted-foreground">
              {selectedDate ? format(selectedDate, "yyyy년 M월 d일") : "날짜를 선택하세요"}
            </div>
            {loading && <div className="text-sm">로딩 중...</div>}
            {error && <div className="text-sm text-red-500">{error}</div>}
      {mappingStatus && (
        <div className={`text-sm p-3 rounded border ${
          mappingStatus.includes("성공") 
            ? "text-green-700 bg-green-50 border-green-200" 
            : mappingStatus.includes("실패") || mappingStatus.includes("오류")
            ? "text-red-700 bg-red-50 border-red-200"
            : "text-blue-700 bg-blue-50 border-blue-200"
        }`}>
          {mappingStatus}
        </div>
      )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slotsForSelectedDate.map((row) => {
                const reserved = getReservedCount(row);
                const isFull = reserved >= row.capacity;
                const isPastClass = row.isPastClass || false;
                const isDisabled = isFull || isPastClass;
                
                return (
                  <div key={row.id} className={`flex items-center justify-between rounded border p-3 ${
                    isPastClass ? 'opacity-50 bg-gray-50' : ''
                  }`}>
                    <div>
                      <div className="text-sm font-medium">{row.class_time}</div>
                      <div className="text-xs text-muted-foreground">
                        예약 {reserved}/{row.capacity}
                        {isPastClass && <span className="text-red-500 ml-2">(지난 수업)</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button 
                        disabled={isDisabled} 
                        onClick={() => handleReserve(row)}
                        className={isPastClass ? 'bg-gray-300 text-gray-500' : ''}
                      >
                        {isPastClass ? "지난 수업" : isFull ? "마감" : "예약"}
                      </Button>
                      {activeClassId === row.id && !isDisabled && (
                        <div className="mt-2 w-full max-w-xs">
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="이름"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              className="h-9 w-full rounded border bg-background px-2 text-sm"
                            />
                            <input
                              type="tel"
                              placeholder="연락처 (예: 01012345678)"
                              value={userPhone}
                              onChange={(e) => setUserPhone(e.target.value.replace(/[^0-9]/g, ""))}
                              className="h-9 w-full rounded border bg-background px-2 text-sm"
                            />
                            <Button size="sm" disabled={saving} onClick={() => submitReservation(row)}>
                              {saving ? "저장 중..." : "예약 확정"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loading && slotsForSelectedDate.length === 0 && (
                <div className="text-sm text-muted-foreground">해당 날짜의 수업이 없습니다.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Page() {
  console.log("=== Page 컴포넌트 렌더링 ===");
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-4 text-sm">로딩 중...</div>}>
        <ReservationInner />
      </Suspense>
    </ErrorBoundary>
  );
}


