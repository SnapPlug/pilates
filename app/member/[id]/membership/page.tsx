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
    try {
      const { data, error } = await supabase
        .from('membership_history')
        .select('id')
        .limit(1);
      
      console.log('연결 테스트 결과:', { data, error });
      
      if (error) {
        console.error('Supabase 연결 오류:', error);
        return false;
      }
      
      console.log('Supabase 연결 성공');
      return true;
    } catch (error) {
      console.error('Supabase 연결 예외:', error);
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
    setMembershipForm({
      membership_type: "",
      start_date: today,
      end_date: "",
      total_sessions: "",
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

    try {
      const { error } = await supabase
        .from('membership_history')
        .insert({
          member_id: memberId,
          membership_type: membershipForm.membership_type,
          start_date: membershipForm.start_date,
          end_date: membershipForm.end_date,
          total_sessions: Number(membershipForm.total_sessions),
          used_sessions: 0,
          remaining_sessions: Number(membershipForm.total_sessions),
          status: "활성",
          notes: membershipForm.notes || null
        });

      if (error) throw error;

      // 성공적으로 추가된 경우
      setShowAddMembershipModal(false);
      setMembershipForm({
        membership_type: "",
        start_date: "",
        end_date: "",
        total_sessions: "",
        notes: ""
      });
      
      // 회원권 목록 새로고침
      await fetchMemberData();
      alert("회원권이 성공적으로 추가되었습니다.");
    } catch (error) {
      console.error('회원권 추가 오류:', error);
      alert('회원권 추가에 실패했습니다. 다시 시도해주세요.');
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
              <div className="text-lg font-medium mb-4">✨ 새로운 회원권 등록</div>
              
              <div className="space-y-4">
                <label className="block text-sm">
                  회원권 종류 *
                  <select 
                    className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                    value={membershipForm.membership_type} 
                    onChange={(e) => setMembershipForm(prev => ({ ...prev, membership_type: e.target.value }))}
                  >
                    <option value="">선택해주세요</option>
                    <option value="횟수제">횟수제</option>
                    <option value="기간제">기간제</option>
                    <option value="통합제">통합제</option>
                  </select>
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    시작일 *
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={membershipForm.start_date} 
                      onChange={(e) => setMembershipForm(prev => ({ ...prev, start_date: e.target.value }))} 
                    />
                  </label>
                  <label className="block text-sm">
                    만료일 *
                    <input 
                      type="date" 
                      className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                      value={membershipForm.end_date} 
                      onChange={(e) => setMembershipForm(prev => ({ ...prev, end_date: e.target.value }))} 
                    />
                  </label>
                </div>
                
                <label className="block text-sm">
                  총 횟수 *
                  <input 
                    type="number" 
                    className="mt-1 w-full h-10 rounded border bg-background px-3 text-sm" 
                    placeholder="예: 10" 
                    value={membershipForm.total_sessions} 
                    onChange={(e) => setMembershipForm(prev => ({ ...prev, total_sessions: e.target.value }))} 
                  />
                </label>
                
                <label className="block text-sm">
                  메모 (선택사항)
                  <textarea 
                    className="mt-1 w-full h-20 rounded border bg-background px-3 py-2 text-sm resize-none" 
                    placeholder="회원권 관련 메모를 입력하세요"
                    value={membershipForm.notes} 
                    onChange={(e) => setMembershipForm(prev => ({ ...prev, notes: e.target.value }))} 
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddMembershipModal(false)}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleAddMembership}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                    <option value="횟수제">횟수제</option>
                    <option value="기간제">기간제</option>
                    <option value="통합제">통합제</option>
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
