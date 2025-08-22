"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createLogContext, logDebug, logError } from "@/lib/logger";

type MembershipHistory = {
  id: string;
  member_id: string;
  membership_type: string;
  start_date: string;
  end_date: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  status: "활성" | "만료" | "정지" | "취소" | "대기";
  notes?: string;
  created_at: string;
  updated_at: string;
};

type Member = {
  id: string;
  name: string;
  gender: "남" | "여" | "기타";
  age: number;
  phone: string;
  membershipStatus: "활성" | "만료" | "정지" | "취소" | "대기";
  registeredAt: string;
  lastVisitAt: string;
  remainingSessions: number;
  expiresAt: string;
  points: number;
  kakaoId?: string;
  isTemp?: boolean;
};

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(value).slice(0, 10);
  }
}

// 회원권 상태를 계산하는 함수
function calculateMembershipStatus(history: any): "활성" | "만료" | "정지" | "취소" | "대기" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(history.end_date);
  endDate.setHours(0, 0, 0, 0);
  
  // 기간이 만료되었는지 확인
  const isExpired = endDate < today;
  
  // 횟수가 소진되었는지 확인
  const isSessionsExhausted = history.remaining_sessions <= 0;
  
  // 기간과 횟수 모두 만료된 경우
  if (isExpired || isSessionsExhausted) {
    return "만료";
  }
  
  // 그 외의 경우 활성
  return "활성";
}

export default function MembershipPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  
  const [member, setMember] = useState<Member | null>(null);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 회원권 추가 관련 상태
  const [showAddMembershipModal, setShowAddMembershipModal] = useState(false);
  const [membershipForm, setMembershipForm] = useState({
    membership_type: "",
    start_date: "",
    end_date: "",
    total_sessions: "",
    used_sessions: "",
    remaining_sessions: "",
    notes: ""
  });
  
  // 회원권 수정 관련 상태
  const [showEditMembershipModal, setShowEditMembershipModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembershipHistory | null>(null);
  const [editMembershipForm, setEditMembershipForm] = useState({
    membership_type: "",
    start_date: "",
    end_date: "",
    total_sessions: "",
    used_sessions: "",
    remaining_sessions: "",
    notes: ""
  });
  
  // 회원권 삭제 관련 상태
  const [showDeleteMembershipModal, setShowDeleteMembershipModal] = useState(false);
  const [deletingMembership, setDeletingMembership] = useState<MembershipHistory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 시스템 설정 상태
  const [systemSettings, setSystemSettings] = useState({
    weeklyRecommendedSessions: 2,
    membershipExpirationBuffer: 3
  });

  // 시스템 설정 로드
  const loadSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSystemSettings({
          weeklyRecommendedSessions: data.weeklyRecommendedSessions || 2,
          membershipExpirationBuffer: data.membershipExpirationBuffer || 3
        });
        console.log('시스템 설정 로드 완료:', data);
      }
    } catch (error) {
      console.error('시스템 설정 로드 실패:', error);
    }
  };

  // 설정 변경 감지를 위한 주기적 확인
  useEffect(() => {
    if (memberId) {
      // 초기 설정 로드
      loadSystemSettings();
      
      // 2초마다 설정 변경 확인 (설정 페이지에서 변경 시 실시간 반영)
      const interval = setInterval(() => {
        loadSystemSettings();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [memberId]);

  // 시작일 변경 시 만료일 자동 계산
  const handleStartDateChange = (startDate: string) => {
    const totalSessions = Number(membershipForm.total_sessions);
    
    if (totalSessions && startDate) {
      // 설정에서 가져온 1주간 권장 횟수 사용
      const weeklyRecommendedSessions = systemSettings.weeklyRecommendedSessions;
      const weeksNeeded = Math.ceil(totalSessions / weeklyRecommendedSessions);
      
      // 시작일로부터 계산된 주 수만큼 더하기
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
      
      // YYYY-MM-DD 형식으로 변환
      const endDate = endDateObj.toISOString().split('T')[0];
      
      console.log('만료일 자동 계산:', {
        totalSessions,
        weeklyRecommendedSessions,
        weeksNeeded,
        startDate,
        endDate
      });
      
      setMembershipForm(prev => ({
        ...prev,
        start_date: startDate,
        end_date: endDate
      }));
    } else {
      setMembershipForm(prev => ({ ...prev, start_date: startDate }));
    }
  };

  const fetchMemberData = async () => {
    console.log('=== fetchMemberData 시작 ===');
    console.log('조회할 memberId:', memberId);
    
    const logCtx = createLogContext('MembershipPage', 'fetchMemberData');
    logDebug(logCtx, '회원 데이터 조회 시작', { memberId });
    
    try {
      setLoading(true);
      setError("");

      console.log('1. 회원 정보 조회 시작');
      // 회원 정보 조회
      const { data: memberData, error: memberError } = await supabase
        .from("member")
        .select("*")
        .eq("id", memberId)
        .single();

      console.log('회원 정보 조회 결과:', { memberData, memberError });

      if (memberError) {
        console.error("회원 정보 조회 오류:", memberError);
        throw memberError;
      }

      const mappedMember: Member = {
        id: memberData.id as string,
        name: (memberData.name as string) ?? "",
        gender: ((memberData.gender as string) ?? "") as Member["gender"],
        age: Number((memberData.age as number) ?? 0),
        phone: (memberData.phone as string) ?? "",
        membershipStatus: ((memberData.membership_status as string) ?? "활성") as Member["membershipStatus"],
        registeredAt: toDisplayDate(memberData.registered_at as string),
        lastVisitAt: toDisplayDate(memberData.last_visit_at as string),
        remainingSessions: Number((memberData.remaining_sessions as number) ?? 0),
        expiresAt: toDisplayDate(memberData.expires_at as string),
        points: Number((memberData.points as number) ?? 0),
        kakaoId: (memberData.kakao_id as string) ?? "",
        isTemp: (memberData.is_temp as boolean) ?? false
      };

      console.log('매핑된 회원 정보:', mappedMember);
      setMember(mappedMember);

      console.log('2. 회원권 히스토리 조회 시작');
      // 회원권 히스토리 조회 (더 상세한 정보 포함)
      const { data: historyData, error: historyError } = await supabase
        .from("membership_history")
        .select(`
          id,
          member_id,
          membership_type,
          start_date,
          end_date,
          total_sessions,
          used_sessions,
          remaining_sessions,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      console.log('회원권 히스토리 조회 결과:', { historyData, historyError });

      if (historyError) {
        console.error("회원권 히스토리 조회 실패:", historyError);
        setMembershipHistory([]);
      } else {
        const history = historyData || [];
        console.log("조회된 회원권 히스토리 개수:", history.length);
        console.log("각 히스토리 항목:", history.map((h, i) => ({ 
          index: i, 
          id: h.id, 
          type: h.membership_type, 
          remaining: h.remaining_sessions,
          status: h.status,
          updated_at: h.updated_at 
        })));
        const typedHistory: MembershipHistory[] = history.map((h: any) => ({
          id: h.id as string,
          member_id: h.member_id as string,
          membership_type: h.membership_type as string,
          start_date: h.start_date as string,
          end_date: h.end_date as string,
          total_sessions: h.total_sessions as number,
          used_sessions: h.used_sessions as number,
          remaining_sessions: h.remaining_sessions as number,
          status: h.status as "활성" | "만료" | "정지" | "취소" | "대기",
          notes: h.notes as string | undefined,
          created_at: h.created_at as string,
          updated_at: h.updated_at as string
        }));
        setMembershipHistory(typedHistory);
      }

      logDebug({ ...logCtx, state: 'success' }, '회원 데이터 조회 완료');
      console.log('=== fetchMemberData 완료 ===');

    } catch (e: unknown) {
      const error = e as Error;
      logError({ ...logCtx, error, state: 'error' });
      console.error("=== fetchMemberData 오류 발생 ===");
      console.error("fetchMemberData 전체 오류:", error);
      setError("회원 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Supabase 연결 테스트 함수
  const testSupabaseConnection = async () => {
    console.log('=== Supabase 연결 테스트 ===');
    console.log('supabase 객체 확인:', !!supabase);
    console.log('supabase.from 메서드 확인:', typeof supabase?.from);
    
    try {
      console.log('membership_history 테이블 조회 시도...');
      const { data, error } = await supabase
        .from('membership_history')
        .select('id')
        .limit(1);
      
      console.log('연결 테스트 결과:', { data, error });
      
      if (error) {
        console.error('Supabase 연결 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        console.error('오류 상세:', error.details);
        return false;
      }
      
      console.log('Supabase 연결 성공');
      return true;
    } catch (error) {
      console.error('Supabase 연결 예외:', error);
      console.error('예외 타입:', typeof error);
      console.error('예외 내용:', error);
      return false;
    }
  };

  useEffect(() => {
    if (memberId) {
      console.log('useEffect 실행 - memberId:', memberId);
      testSupabaseConnection().then(connected => {
        console.log('Supabase 연결 상태:', connected);
        fetchMemberData();
      });
    }
  }, [memberId]);

  // 회원권 추가 모달 열기
  const handleShowAddMembership = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // 기본값으로 10회권을 가정하여 만료일 계산
    const defaultSessions = 10;
    const weeklyRecommendedSessions = systemSettings.weeklyRecommendedSessions;
    const weeksNeeded = Math.ceil(defaultSessions / weeklyRecommendedSessions);
    
    // 시작일로부터 계산된 주 수만큼 더하기
    const startDateObj = new Date(today);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
    
    const endDate = endDateObj.toISOString().split('T')[0];
    
    console.log('기본 만료일 계산:', {
      defaultSessions,
      weeklyRecommendedSessions,
      weeksNeeded,
      startDate: today,
      endDate
    });
    
    setMembershipForm({
      membership_type: "",
      start_date: today,
      end_date: endDate,
      total_sessions: "",
      used_sessions: "",
      remaining_sessions: "",
      notes: ""
    });
    setShowAddMembershipModal(true);
  };

  // 회원권 추가 실행
  const handleAddMembership = async () => {
    if (!membershipForm.membership_type || !membershipForm.start_date || !membershipForm.end_date || !membershipForm.total_sessions) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    let insertData: any = null; // insertData를 함수 전체에서 사용할 수 있도록 선언
    let calculatedEndDate: string = ''; // calculatedEndDate를 함수 전체에서 사용할 수 있도록 선언

    try {
      // 데이터 유효성 검사
      if (!memberId) {
        throw new Error('회원 ID가 없습니다.');
      }
      if (!membershipForm.membership_type) {
        throw new Error('회원권 종류가 선택되지 않았습니다.');
      }
      if (!membershipForm.start_date) {
        throw new Error('시작일이 설정되지 않았습니다.');
      }
      if (!membershipForm.total_sessions || Number(membershipForm.total_sessions) <= 0) {
        throw new Error('총 횟수가 올바르지 않습니다.');
      }

      // end_date가 없거나 빈 값인 경우 자동 계산
      calculatedEndDate = membershipForm.end_date;
      if (!calculatedEndDate || calculatedEndDate.trim() === '') {
        console.log('end_date가 누락되어 자동 계산합니다.');
        
        const totalSessions = Number(membershipForm.total_sessions);
        const weeklyRecommendedSessions = systemSettings.weeklyRecommendedSessions;
        const weeksNeeded = Math.ceil(totalSessions / weeklyRecommendedSessions);
        
        const startDateObj = new Date(membershipForm.start_date);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
        
        calculatedEndDate = endDateObj.toISOString().split('T')[0];
        
        console.log('자동 계산된 end_date:', {
          totalSessions,
          weeklyRecommendedSessions,
          weeksNeeded,
          startDate: membershipForm.start_date,
          calculatedEndDate
        });
      }

      if (!calculatedEndDate) {
        throw new Error('만료일을 계산할 수 없습니다.');
      }

      console.log('회원권 추가 시도:', {
        member_id: memberId,
        membership_type: membershipForm.membership_type,
        start_date: membershipForm.start_date,
        end_date: calculatedEndDate, // 자동 계산된 end_date 사용
        total_sessions: Number(membershipForm.total_sessions),
        used_sessions: 0,
        remaining_sessions: Number(membershipForm.total_sessions),
        status: "활성",
        notes: membershipForm.notes || null
      });

      // Supabase 연결 상태 확인
      console.log('Supabase 클라이언트 상태:', {
        hasClient: !!supabase,
        hasFrom: !!supabase?.from,
        hasInsert: !!supabase?.from('membership_history')?.insert
      });

      // 테이블 스키마 확인을 위한 테스트 쿼리
      try {
        const { data: schemaData, error: schemaError } = await supabase
          .from('membership_history')
          .select('*')
          .limit(1);
        
        console.log('테이블 스키마 확인:', { schemaData, schemaError });
        
        // 기존 데이터의 status 값 확인
        if (schemaData && schemaData.length > 0) {
          console.log('기존 데이터의 status 값들:', schemaData.map(item => item.status));
        }
      } catch (schemaErr) {
        console.log('스키마 확인 오류:', schemaErr);
      }

      // status 값 테스트 - 다양한 값으로 시도
      const statusValues = ['활성', 'active', 'ACTIVE', 'Active'];
      
      for (const statusValue of statusValues) {
        console.log(`${statusValue} status로 시도 중...`);
        
        insertData = {
          member_id: memberId,
          membership_type: membershipForm.membership_type, // 원래 값 그대로 사용
          start_date: membershipForm.start_date,
          end_date: calculatedEndDate,
          total_sessions: Number(membershipForm.total_sessions),
          used_sessions: 0,
          remaining_sessions: Number(membershipForm.total_sessions),
          status: statusValue,
          notes: membershipForm.notes || null
        };

        console.log(`${statusValue} status로 시도:`, insertData);

        const { data, error } = await supabase
          .from('membership_history')
          .insert(insertData)
          .select()
          .single();

        if (!error) {
          console.log(`${statusValue} status로 성공!`, data);
          // 성공적으로 추가된 경우
          setShowAddMembershipModal(false);
          setMembershipForm({
            membership_type: "",
            start_date: "",
            end_date: "",
            total_sessions: "",
            used_sessions: "",
            remaining_sessions: "",
            notes: ""
          });
          
          // 회원권 목록 새로고침
          await fetchMemberData();
          alert("회원권이 성공적으로 추가되었습니다.");
          return; // 성공하면 함수 종료
        } else {
          console.log(`${statusValue} status 실패:`, error);
          if (error.code !== '23514') {
            // status가 아닌 다른 오류인 경우 중단
            throw error;
          }
        }
      }

      // 모든 status 값이 실패한 경우
      throw new Error('모든 status 값이 실패했습니다. 데이터베이스 제약 조건을 확인해주세요.');
    } catch (error: any) {
      console.error('회원권 추가 오류:', error);
      
      // 구체적인 오류 메시지 표시
      let errorMessage = '회원권 추가에 실패했습니다.';
      let details = '';
      
      if (error?.code === '23514') {
        errorMessage = '회원권 상태가 올바르지 않습니다.';
        details = `시도한 모든 status 값이 실패했습니다.\n\n시도한 값들: active, 활성, ACTIVE, Active, 대기, waiting, WAITING\n\n데이터베이스의 실제 제약 조건을 확인해주세요.`;
      } else if (error?.code === '23502') {
        errorMessage = '필수 필드가 누락되었습니다.';
        details = '모든 필수 항목을 입력해주세요.';
      } else if (error?.code === '23503') {
        errorMessage = '존재하지 않는 회원입니다.';
        details = '회원 정보를 다시 확인해주세요.';
      } else if (error?.code === '42501') {
        errorMessage = '권한이 없습니다.';
        details = '관리자 권한이 필요합니다.';
      } else if (error?.message) {
        errorMessage = `오류: ${error.message}`;
        details = '잠시 후 다시 시도해주세요.';
      }
      
      const fullMessage = details ? `${errorMessage}\n\n${details}` : errorMessage;
      alert(fullMessage);
      
      // 콘솔에 상세 오류 정보 출력
      console.error('오류 상세 정보:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        formData: membershipForm,
        insertData: insertData
      });
    }
  };

  // 회원권 수정 모달 열기
  const handleShowEditMembership = (membership: MembershipHistory) => {
    console.log('=== 회원권 수정 모달 열기 ===');
    console.log('선택된 회원권:', membership);
    
    setEditingMembership(membership);
    
    const formData = {
      membership_type: membership.membership_type,
      start_date: membership.start_date,
      end_date: membership.end_date,
      total_sessions: membership.total_sessions.toString(),
      used_sessions: (membership.used_sessions || 0).toString(),
      remaining_sessions: membership.remaining_sessions.toString(),
      notes: membership.notes || ""
    };
    
    console.log('폼에 설정할 데이터:', formData);
    setEditMembershipForm(formData);
    setShowEditMembershipModal(true);
    console.log('수정 모달 열기 완료');
  };

  // 회원권 수정 실행
  const handleEditMembership = async () => {
    console.log('=== 회원권 수정 프로세스 시작 ===');
    console.log('1. 입력 검증 시작');
    console.log('editingMembership:', editingMembership);
    console.log('editMembershipForm:', editMembershipForm);

    if (!editingMembership || !editMembershipForm.membership_type || !editMembershipForm.start_date || !editMembershipForm.end_date || !editMembershipForm.total_sessions || !editMembershipForm.used_sessions) {
      console.log('필수 항목 누락 - 수정 중단');
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    try {
      console.log('2. 데이터 유효성 검사 시작');
      
      // 데이터 유효성 검사
      const totalSessions = Number(editMembershipForm.total_sessions);
      const usedSessions = Number(editMembershipForm.used_sessions);
      const remainingSessions = Math.max(0, totalSessions - usedSessions);
      
      console.log('계산된 값들:', {
        totalSessions,
        usedSessions,
        remainingSessions
      });
      
      if (usedSessions > totalSessions) {
        console.log('유효성 검사 실패: 사용된 횟수 > 총 횟수');
        alert("사용된 횟수는 총 횟수보다 클 수 없습니다.");
        return;
      }

      if (usedSessions < 0) {
        console.log('유효성 검사 실패: 사용된 횟수 < 0');
        alert("사용된 횟수는 0보다 작을 수 없습니다.");
        return;
      }

      console.log('3. Supabase 업데이트 준비');
      const updatePayload = {
        membership_type: editMembershipForm.membership_type,
        start_date: editMembershipForm.start_date,
        end_date: editMembershipForm.end_date,
        total_sessions: totalSessions,
        remaining_sessions: remainingSessions,
        used_sessions: usedSessions,
        notes: editMembershipForm.notes || null,
        updated_at: new Date().toISOString()
      };
      
      console.log('업데이트 payload:', updatePayload);
      console.log('업데이트 대상 ID:', editingMembership.id);

      // API 엔드포인트를 통한 업데이트 실행
      console.log('4. API 엔드포인트로 업데이트 실행');
      const response = await fetch('/api/membership/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: editingMembership.id,
          ...updatePayload
        }),
      });

      console.log('5. API 응답 확인');
      const result = await response.json();
      console.log('API 응답 결과:', result);

      if (!response.ok) {
        console.error('API 업데이트 오류:', result);
        throw new Error(result.error || '회원권 정보 업데이트에 실패했습니다.');
      }

      if (!result.success) {
        console.warn('API 업데이트 실패:', result);
        throw new Error(result.error || '업데이트할 회원권 정보를 찾을 수 없습니다.');
      }

      console.log('6. 업데이트 성공 - UI 상태 정리');
      console.log('업데이트된 데이터:', result.data);

      // 성공적으로 수정된 경우
      setShowEditMembershipModal(false);
      setEditingMembership(null);
      setEditMembershipForm({
        membership_type: "",
        start_date: "",
        end_date: "",
        total_sessions: "",
        used_sessions: "",
        remaining_sessions: "",
        notes: ""
      });
      
      console.log('7. 회원권 목록 새로고침 시작');
      // 회원권 목록 새로고침
      await fetchMemberData();
      console.log('8. 회원권 목록 새로고침 완료');
      
      alert("회원권이 성공적으로 수정되었습니다.");
      console.log('=== 회원권 수정 프로세스 완료 ===');
    } catch (error) {
      console.error('=== 회원권 수정 오류 발생 ===');
      console.error('오류 상세:', error);
      
      let errorMessage = '회원권 수정에 실패했습니다.';
      
      if (error instanceof Error) {
        console.log('오류 메시지 분석:', error.message);
        if (error.message.includes('permission')) {
          errorMessage = '데이터베이스 접근 권한이 없습니다. RLS 정책을 확인해주세요.';
        } else if (error.message.includes('constraint')) {
          errorMessage = '입력한 데이터가 제약조건을 만족하지 않습니다.';
        } else if (error.message.includes('찾을 수 없습니다')) {
          errorMessage = '업데이트할 회원권 정보를 찾을 수 없습니다.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
      console.log('=== 회원권 수정 오류 처리 완료 ===');
    }
  };

  // 회원권 삭제 모달 열기
  const handleShowDeleteMembership = (membership: MembershipHistory) => {
    console.log('=== 회원권 삭제 모달 열기 ===');
    console.log('삭제할 회원권:', membership);
    
    setDeletingMembership(membership);
    setShowDeleteMembershipModal(true);
    console.log('삭제 모달 열기 완료');
  };

  // 회원권 삭제 실행
  const handleDeleteMembership = async () => {
    if (!deletingMembership) {
      alert('삭제할 회원권 정보가 없습니다.');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('=== 회원권 삭제 프로세스 시작 ===');
      console.log('삭제할 회원권 ID:', deletingMembership.id);

      // API 엔드포인트를 통한 삭제 실행
      const response = await fetch('/api/membership/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: deletingMembership.id
        }),
      });

      const result = await response.json();
      console.log('삭제 API 응답 결과:', result);

      if (!response.ok) {
        console.error('삭제 API 오류:', result);
        throw new Error(result.error || '회원권 삭제에 실패했습니다.');
      }

      if (!result.success) {
        console.warn('삭제 API 실패:', result);
        throw new Error(result.error || '회원권을 삭제할 수 없습니다.');
      }

      console.log('회원권 삭제 성공:', result.data);

      // 성공적으로 삭제된 경우
      setShowDeleteMembershipModal(false);
      setDeletingMembership(null);
      
      console.log('회원권 목록 새로고침 시작');
      // 회원권 목록 새로고침
      await fetchMemberData();
      console.log('회원권 목록 새로고침 완료');
      
      alert("회원권이 성공적으로 삭제되었습니다.");
      console.log('=== 회원권 삭제 프로세스 완료 ===');
    } catch (error) {
      console.error('=== 회원권 삭제 오류 발생 ===');
      console.error('오류 상세:', error);
      
      let errorMessage = '회원권 삭제에 실패했습니다.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      console.log('=== 회원권 삭제 오류 처리 완료 ===');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="w-full">
          <div className="text-sm">불러오는 중...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !member) {
    return (
      <SidebarLayout>
        <div className="w-full">
          <div className="text-sm text-red-500">{error || "회원을 찾을 수 없습니다."}</div>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mt-4"
          >
            뒤로 가기
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="w-full h-full overflow-y-auto pb-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로 가기
          </Button>
          <h1 className="text-lg font-semibold">{member.name}님의 회원권 정보</h1>
        </div>

        {/* 현재 이용중인 회원권 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-emerald-700">🎯 현재 이용중인 회원권</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const activeMembership = membershipHistory.find(h => {
                    const status = calculateMembershipStatus(h);
                    return status === "활성";
                  });
                  if (activeMembership) {
                    handleShowEditMembership(activeMembership);
                  }
                }}
                className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                ✏️ 수정
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => {
                  const activeMembership = membershipHistory.find(h => {
                    const status = calculateMembershipStatus(h);
                    return status === "활성";
                  });
                  if (activeMembership) {
                    handleShowDeleteMembership(activeMembership);
                  }
                }}
              >
                🗑️ 삭제
              </Button>
            </div>
          </div>
          {(() => {
            const activeMembership = membershipHistory.find(h => {
              const status = calculateMembershipStatus(h);
              return status === "활성";
            });
            
            if (!activeMembership) {
              return (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-lg font-medium text-gray-600 mb-2">현재 이용중인 회원권이 없습니다</div>
                  <Button 
                    onClick={handleShowAddMembership}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    ✨ 새로운 회원권 등록하기
                  </Button>
                </div>
              );
            }
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="text-sm text-emerald-600 font-medium mb-1">회원권 종류</div>
                  <div className="text-lg font-bold text-emerald-800">{activeMembership.membership_type}</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-1">잔여 횟수</div>
                  <div className="text-2xl font-bold text-blue-800">{activeMembership.remaining_sessions}회</div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-1">만료일</div>
                  <div className="text-lg font-bold text-orange-800">{toDisplayDate(activeMembership.end_date)}</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-1">시작일</div>
                  <div className="text-lg font-bold text-purple-800">{toDisplayDate(activeMembership.start_date)}</div>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="text-sm text-indigo-600 font-medium mb-1">총 횟수</div>
                  <div className="text-lg font-bold text-indigo-800">{activeMembership.total_sessions}회</div>
                </div>
                
                <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                  <div className="text-sm text-pink-600 font-medium mb-1">사용 횟수</div>
                  <div className="text-lg font-bold text-pink-800">{activeMembership.used_sessions}회</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 만료된 회원권 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">📚 만료된 회원권</h2>
                        {(() => {
            const expiredMemberships = membershipHistory.filter(h => {
              const status = calculateMembershipStatus(h);
              return status === "만료";
            });
            
            if (expiredMemberships.length === 0) {
              return (
                <div className="text-center py-6">
                  <div className="text-gray-400 text-sm">만료된 회원권이 없습니다</div>
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {expiredMemberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-700">{membership.membership_type}</div>
                      <div className="text-xs text-gray-500">
                        {toDisplayDate(membership.start_date)} ~ {toDisplayDate(membership.end_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {membership.total_sessions}회 중 {membership.used_sessions}회 사용
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {toDisplayDate(membership.created_at)}
                    </div>
                  </div>
                ))}
              </div>
                          );
                        })()}
        </div>

        {/* 회원권 추가 모달 */}
        {showAddMembershipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
              <div className="text-lg font-medium mb-2">✨ 새로운 회원권 등록</div>
              <div className="text-sm text-gray-600 mb-4">
                회원에게 새로운 회원권을 등록합니다. 시작일을 설정하면 만료일이 자동으로 계산됩니다.
              </div>
              
              <div className="space-y-4">
                <label className="block text-sm">
                  회원권 종류 *
                  <div className="text-xs text-gray-500 mt-1 mb-1">
                    회원권의 유형을 선택하세요.
                  </div>
                  <select 
                    className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                    value={membershipForm.membership_type} 
                    onChange={(e) => {
                      const type = e.target.value;
                      let sessions = "";
                      if (type === "10회권") sessions = "10";
                      else if (type === "20회권") sessions = "20";
                      else if (type === "50회권") sessions = "50";
                      
                      setMembershipForm(prev => ({ 
                        ...prev, 
                        membership_type: type,
                        total_sessions: sessions
                      }));
                      
                      // 총 횟수가 변경되면 만료일도 자동 계산
                      if (sessions && membershipForm.start_date) {
                        const totalSessions = Number(sessions);
                        const weeklyRecommendedSessions = systemSettings.weeklyRecommendedSessions;
                        const weeksNeeded = Math.ceil(totalSessions / weeklyRecommendedSessions);
                        
                        // 시작일로부터 계산된 주 수만큼 더하기
                        const startDateObj = new Date(membershipForm.start_date);
                        const endDateObj = new Date(startDateObj);
                        endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
                        
                        // YYYY-MM-DD 형식으로 변환
                        const endDate = endDateObj.toISOString().split('T')[0];
                        
                        console.log('회원권 유형 변경 시 만료일 자동 계산:', {
                          type,
                          totalSessions,
                          weeklyRecommendedSessions,
                          weeksNeeded,
                          startDate: membershipForm.start_date,
                          endDate
                        });
                        
                        setMembershipForm(prev => ({
                          ...prev,
                          end_date: endDate
                        }));
                      }
                    }}
                  >
                    <option value="">선택해주세요</option>
                    <option value="10회권">10회권</option>
                    <option value="20회권">20회권</option>
                    <option value="50회권">50회권</option>
                  </select>
                </label>
                
                <label className="block text-sm">
                  총 횟수 *
                  <div className="text-xs text-gray-500 mt-1 mb-1">
                    설정된 주간 권장 횟수({systemSettings.weeklyRecommendedSessions}회)를 기반으로 만료일이 자동 계산됩니다.
                  </div>
                  <input 
                    type="number" 
                    className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                    placeholder="예: 10" 
                    value={membershipForm.total_sessions} 
                    onChange={(e) => setMembershipForm(prev => ({ ...prev, total_sessions: e.target.value }))} 
                  />
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    시작일 *
                    <div className="text-xs text-gray-500 mt-1 mb-1">
                      시작일을 선택하면 총 횟수에 따라 만료일이 자동으로 계산됩니다.
                    </div>
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={membershipForm.start_date} 
                      onChange={(e) => handleStartDateChange(e.target.value)} 
                    />
                  </label>
                  <label className="block text-sm">
                    만료일 *
                    <div className="text-xs text-gray-500 mt-1 mb-1">
                      {membershipForm.total_sessions && membershipForm.start_date ? 
                        `예상 기간: ${Math.ceil(Number(membershipForm.total_sessions) / systemSettings.weeklyRecommendedSessions)}주` : 
                        '1주간 권장 횟수에 따라 자동 계산됩니다.'
                      }
                    </div>
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={membershipForm.end_date} 
                      onChange={(e) => {
                        console.log('만료일 변경:', e.target.value);
                        setMembershipForm(prev => ({ ...prev, end_date: e.target.value }));
                      }} 
                    />
                  </label>
                </div>
                
                <label className="block text-sm">
                  메모 (선택사항)
                  <div className="text-xs text-gray-500 mt-1 mb-1">
                    회원권 관련 특이사항이나 메모를 입력하세요.
                  </div>
                  <textarea 
                    className="mt-1 w-full h-20 rounded border bg-background px-3 py-3 text-sm resize-none" 
                    placeholder="회원권 관련 메모를 입력하세요"
                    value={membershipForm.notes} 
                    onChange={(e) => setMembershipForm(prev => ({ ...prev, notes: e.target.value }))} 
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddMembershipModal(false)}
                  className="px-6"
                >
                  취소
                </Button>
                <Button 
                  onClick={handleAddMembership}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  회원권 등록
                </Button>
              </div>
            </div>
          </div>
          )}

        {/* 회원권 수정 모달 */}
        {showEditMembershipModal && editingMembership && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
              <div className="text-lg font-medium mb-4">✏️ 회원권 정보 수정</div>
              
              <div className="space-y-4">
                <label className="block text-sm">
                  회원권 종류 *
                  <select 
                    className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                    value={editMembershipForm.membership_type} 
                    onChange={(e) => {
                      console.log('회원권 종류 변경:', e.target.value);
                      setEditMembershipForm(prev => ({ ...prev, membership_type: e.target.value }));
                    }}
                  >
                    <option value="">선택해주세요</option>
                    <option value="10회권">10회권</option>
                    <option value="20회권">20회권</option>
                    <option value="50회권">50회권</option>
                  </select>
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    시작일 *
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={editMembershipForm.start_date} 
                      onChange={(e) => {
                        console.log('시작일 변경:', e.target.value);
                        setEditMembershipForm(prev => ({ ...prev, start_date: e.target.value }));
                      }} 
                    />
                  </label>
                  <label className="block text-sm">
                    만료일 *
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={editMembershipForm.end_date} 
                      onChange={(e) => {
                        console.log('만료일 변경:', e.target.value);
                        setEditMembershipForm(prev => ({ ...prev, end_date: e.target.value }));
                      }} 
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    총 횟수 *
                    <input 
                      type="number" 
                      min="1"
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      placeholder="예: 10" 
                      value={editMembershipForm.total_sessions} 
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('총 횟수 변경:', value);
                        setEditMembershipForm(prev => {
                          const newForm = { ...prev, total_sessions: value };
                          console.log('총 횟수 변경 후 폼 상태:', newForm);
                          return newForm;
                        });
                        
                        // 실시간 유효성 검사
                        const total = Number(value);
                        const remaining = Number(editMembershipForm.remaining_sessions);
                        console.log('총 횟수 유효성 검사:', { total, remaining });
                        if (total < remaining) {
                          e.target.classList.add('border-red-500');
                        } else {
                          e.target.classList.remove('border-red-500');
                        }
                      }} 
                    />
                  </label>
                  <label className="block text-sm">
                    사용된 횟수 *
                    <input 
                      type="number" 
                      min="0"
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      placeholder="예: 2" 
                      value={editMembershipForm.used_sessions || 0} 
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('사용된 횟수 변경:', value);
                        setEditMembershipForm(prev => {
                          const newForm = { ...prev, used_sessions: value };
                          console.log('사용된 횟수 변경 후 폼 상태:', newForm);
                          return newForm;
                        });
                      }} 
                    />
                  </label>
                  <label className="block text-sm">
                    잔여 횟수 (자동계산)
                    <input 
                      type="number" 
                      min="0"
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm bg-gray-100" 
                      placeholder="자동계산" 
                      value={(() => {
                        const total = Number(editMembershipForm.total_sessions) || 0;
                        const used = Number(editMembershipForm.used_sessions) || 0;
                        const remaining = Math.max(0, total - used);
                        return remaining;
                      })()}
                      readOnly
                      disabled
                    />
                  </label>
                </div>
                
                <label className="block text-sm">
                  메모 (선택사항)
                  <textarea 
                    className="mt-1 w-full h-20 rounded border bg-background px-3 py-2 text-sm resize-none" 
                    placeholder="회원권 관련 메모를 입력하세요"
                    value={editMembershipForm.notes} 
                    onChange={(e) => {
                      console.log('메모 변경:', e.target.value);
                      setEditMembershipForm(prev => {
                        const newForm = { ...prev, notes: e.target.value };
                        console.log('메모 변경 후 폼 상태:', newForm);
                        return newForm;
                      });
                    }} 
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditMembershipModal(false)}
                >
                  취소
                </Button>
                <Button 
                  onClick={() => {
                    console.log('수정 완료 버튼 클릭됨');
                    console.log('현재 editMembershipForm 상태:', editMembershipForm);
                    handleEditMembership();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  수정 완료
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 회원권 삭제 확인 모달 */}
        {showDeleteMembershipModal && deletingMembership && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
              <div className="text-lg font-medium mb-4 text-red-600">⚠️ 회원권 삭제 확인</div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  다음 회원권을 삭제하시겠습니까?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">회원권 종류:</span> {deletingMembership.membership_type}</div>
                    <div><span className="font-medium">시작일:</span> {toDisplayDate(deletingMembership.start_date)}</div>
                    <div><span className="font-medium">만료일:</span> {toDisplayDate(deletingMembership.end_date)}</div>
                    <div><span className="font-medium">총 횟수:</span> {deletingMembership.total_sessions}회</div>
                    <div><span className="font-medium">잔여 횟수:</span> {deletingMembership.remaining_sessions}회</div>
                    <div><span className="font-medium">사용 횟수:</span> {deletingMembership.used_sessions}회</div>
                  </div>
                </div>
                <p className="text-red-600 text-sm mt-3">
                  ⚠️ 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteMembershipModal(false);
                    setDeletingMembership(null);
                  }}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleDeleteMembership}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '🗑️ 삭제'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
