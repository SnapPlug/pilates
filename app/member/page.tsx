"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Plus, Link, Link2Off, Edit, CreditCard, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { createLogContext, logDebug, logError } from "@/lib/logger";
import { getAllMembersWithMembership, calculateMembershipStatus, type MemberWithMembership } from "@/lib/membership";

// Member 타입을 MemberWithMembership으로 교체
type Member = MemberWithMembership;

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

export default function Page() {
  const router = useRouter();
  const [rows, setRows] = React.useState<MemberWithMembership[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [q, setQ] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    gender: "" as Member["gender"],
    age: "",
    phone: "",
    registered_at: "",
    points: "",
    memo: "",
    // 회원권 정보 추가
    membership_type: "",
    membership_start_date: "",
    total_sessions: "",
    membership_expires_at: ""
  });
  const [showTempMemberModal, setShowTempMemberModal] = useState(false);
  const [selectedTempMember, setSelectedTempMember] = useState<Member | null>(null);
  const [tempMemberForm, setTempMemberForm] = useState({
    name: "",
    gender: "" as Member["gender"],
    age: "",
    phone: "",
    membership_status: "활성",
    registered_at: "",
    last_visit_at: "",
    remaining_sessions: "",
    expires_at: "",
    points: ""
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [newMemberData, setNewMemberData] = useState<{
    name: string;
    phone: string;
    kakaoLink: string;
  } | null>(null);
  
  // 회원 삭제 관련 상태
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [memberToDelete, setMemberToDelete] = React.useState<MemberWithMembership | null>(null);

  
  // 회원 정보 수정 관련 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    gender: "" as Member["gender"],
    age: "",
    phone: "",
    registered_at: "",
    points: ""
  });
  const [editing, setEditing] = useState(false);

  // 폼 필드 변경 시 자동 계산 처리
  const handleFormChange = (field: string, value: string) => {
    console.log('DEBUG: handleFormChange 호출됨:', { field, value });
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      console.log('DEBUG: 업데이트된 form 상태:', newForm);
      return newForm;
    });
  };

  // 폼 초기화 시 오늘 날짜로 기본값 설정
  const handleShowCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setForm({
      name: "",
      gender: "" as Member["gender"],
      age: "",
      phone: "",
      registered_at: today,
      points: "",
      memo: "",
      membership_type: "",
      membership_start_date: today,
      total_sessions: "",
      membership_expires_at: ""
    });
    setShowCreate(true);
  };

  const fetchMembers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const members = await getAllMembersWithMembership();
      setRows(members);
    } catch (e: unknown) {
      console.error("fetchMembers 오류:", e);
      let errorMessage = "데이터를 불러오지 못했습니다.";
      
      if (e instanceof Error) {
        if (e.message.includes("relation") && e.message.includes("does not exist")) {
          errorMessage = "member 테이블이 존재하지 않습니다. Supabase에서 테이블을 생성해주세요.";
        } else if (e.message.includes("permission")) {
          errorMessage = "데이터베이스 접근 권한이 없습니다. RLS 정책을 확인해주세요.";
        } else {
          errorMessage = e.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = React.useMemo(() => {
    const t = q.trim();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.phone, r.gender, r.membership_status].some((v) => String(v ?? "").includes(t))
    );
  }, [rows, q]);

  const handleMembershipStatusClick = (member: MemberWithMembership) => {
    router.push(`/member/${member.id}/membership`);
  };

  const handleTempMemberRegistration = (member: MemberWithMembership) => {
    setSelectedTempMember(member);
    setTempMemberForm({
      name: member.name,
      gender: member.gender || "",
      age: (member.age || 0).toString(),
      phone: member.phone || "",
      membership_status: "활성",
      registered_at: member.registered_at || "",
      last_visit_at: member.last_visit_at || "",
      remaining_sessions: (member.remaining_sessions || 0).toString(),
      expires_at: member.expires_at || "",
      points: (member.points || 0).toString()
    });
    setShowTempMemberModal(true);
  };



  // 회원 정보 수정 모달 열기
  const handleEditMember = (member: MemberWithMembership) => {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      gender: member.gender || "",
      age: (member.age || 0).toString(),
      phone: member.phone || "",
      registered_at: member.registered_at ? toDisplayDate(member.registered_at) !== "-" ? member.registered_at : "" : "",
      points: (member.points || 0).toString()
    });
    setShowEditModal(true);
  };

  // 회원 정보 수정 저장
  const handleEditSave = async () => {
    if (!editingMember) return;

    const logCtx = createLogContext('MemberPage', 'handleEditSave');
    logDebug(logCtx, '회원 정보 수정 시작', { memberId: editingMember.id, editForm });

    try {
      setEditing(true);
      
      const payload = {
        name: editForm.name,
        gender: editForm.gender || null,
        age: editForm.age ? Number(editForm.age) : null,
        phone: editForm.phone || null,
        registered_at: editForm.registered_at || null,
        points: editForm.points ? Number(editForm.points) : 0,
      };

      logDebug(logCtx, 'Supabase 업데이트 시도', { payload });

      const { error } = await supabase
        .from("member")
        .update(payload)
        .eq("id", editingMember.id);

      if (error) {
        logError({ ...logCtx, error, state: 'supabase_error' });
        throw error;
      }

      logDebug({ ...logCtx, state: 'success' }, '회원 정보 수정 완료');
      
      setShowEditModal(false);
      setEditingMember(null);
      await fetchMembers(); // 목록 새로고침
      alert("회원 정보가 수정되었습니다.");
      
    } catch (e: unknown) {
      const error = e as Error;
      logError({ ...logCtx, error, state: 'error' });
      const msg = error.message || "수정 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setEditing(false);
    }
  };

  const handleTempMemberUpdate = async () => {
    if (!selectedTempMember) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("member")
        .update({
          name: tempMemberForm.name,
          gender: tempMemberForm.gender || null,
          age: tempMemberForm.age ? Number(tempMemberForm.age) : null,
          phone: tempMemberForm.phone || null,
          membership_status: tempMemberForm.membership_status,
          registered_at: tempMemberForm.registered_at || null,
          last_visit_at: tempMemberForm.last_visit_at || null,
          remaining_sessions: tempMemberForm.remaining_sessions ? Number(tempMemberForm.remaining_sessions) : 0,
          expires_at: tempMemberForm.expires_at || null,
          points: tempMemberForm.points ? Number(tempMemberForm.points) : 0,
          is_temp: false
        })
        .eq("id", selectedTempMember.id);

      if (error) throw error;

      setShowTempMemberModal(false);
      setSelectedTempMember(null);
      await fetchMembers();
      alert("임시 회원이 정식 회원으로 등록되었습니다.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const generateKakaoLink = async (memberId: string, memberName: string, memberPhone: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("kakao_mapping")
        .select("kakao_bot_id, kakao_channel_id")
        .eq("member_id", memberId)
        .single();

      if (error || !data) {
        throw new Error("카카오 매핑 정보를 찾을 수 없습니다.");
      }

      const baseUrl = window.location.origin;
      const onboardingUrl = `${baseUrl}/member/${memberId}/onboarding`;
      
      return `https://pf.kakao.com/_${data.kakao_channel_id}/chat?prechat=true&member_id=${memberId}&member_name=${encodeURIComponent(memberName)}&member_phone=${encodeURIComponent(memberPhone)}&onboarding_url=${encodeURIComponent(onboardingUrl)}`;
    } catch (error) {
      console.error("카카오 링크 생성 실패:", error);
      throw error;
    }
  };

  const handleMemberOnboarding = async (memberId: string, memberName: string, memberPhone: string) => {
    try {
      const kakaoLink = await generateKakaoLink(memberId, memberName, memberPhone);
      setNewMemberData({
        name: memberName,
        phone: memberPhone,
        kakaoLink
      });
      setShowOnboardingModal(true);
    } catch (error) {
      console.error("온보딩 링크 생성 실패:", error);
    }
  };

  const handleShowOnboarding = async (member: MemberWithMembership) => {
    try {
      const kakaoLink = await generateKakaoLink(member.id, member.name, member.phone || "");
      setNewMemberData({
        name: member.name,
        phone: member.phone || "",
        kakaoLink
      });
      setShowOnboardingModal(true);
    } catch (error) {
      console.error("온보딩 링크 생성 실패:", error);
      alert("온보딩 링크를 생성할 수 없습니다.");
    }
  };

  // 회원 삭제 모달 열기
  const handleDeleteMember = (member: MemberWithMembership) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  // 회원 삭제 실행
  const executeDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const { error } = await supabase
        .from('member')
        .delete()
        .eq('id', memberToDelete.id);
      
      if (error) {
        throw error;
      }
      
      // 성공적으로 삭제된 경우
      setShowDeleteModal(false);
      setMemberToDelete(null);
      await fetchMembers(); // 회원 목록 새로고침
      alert(`${memberToDelete.name} 회원이 삭제되었습니다.`);
    } catch (error) {
      console.error('회원 삭제 오류:', error);
      alert('회원 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 링크 복사
  const copyToClipboard = async (text: string, type: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type === 'link' ? '링크' : '메시지'}가 클립보드에 복사되었습니다.`);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
      alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
    }
  };

  const handleCreateMember = async () => {
    if (!form.name) {
      alert("이름을 입력해주세요.");
      return;
    }

    const logCtx = createLogContext('MemberPage', 'handleCreateMember');
    logDebug(logCtx, '회원 등록 시작', { form });
    console.log('DEBUG: form.memo 값:', form.memo);
    console.log('DEBUG: 전체 form 상태:', form);

    try {
      setSaving(true);

      // 1. 회원 정보 저장
      const memberPayload = {
        name: form.name,
        gender: form.gender || null,
        age: form.age ? Number(form.age) : null,
        phone: form.phone || null,
        registered_at: form.registered_at || null,
        last_visit_at: form.registered_at || null, // 등록일과 동일하게 설정
        points: form.points ? Number(form.points) : 0,
        memo: form.memo.trim() || null, // 메모 필드 추가 (공백 제거 후 저장)
      };

      console.log('DEBUG: memberPayload.memo 값:', memberPayload.memo);
      console.log('DEBUG: 전체 memberPayload:', memberPayload);
      logDebug(logCtx, '회원 정보 저장 시도', { memberPayload, formMemo: form.memo });

      const { data: memberData, error: memberError } = await supabase
        .from("member")
        .insert(memberPayload)
        .select()
        .single();

      if (memberError) {
        logError({ ...logCtx, error: memberError, state: 'member_insert_error' });
        throw memberError;
      }

      console.log('DEBUG: 저장된 memberData:', memberData);
      console.log('DEBUG: 저장된 memberData.memo:', memberData.memo);
      logDebug(logCtx, '회원 정보 저장 완료', { memberData });

      // 2. 회원권 정보가 입력된 경우 membership_history에 저장
      if (form.membership_type && form.total_sessions && form.membership_start_date && form.membership_expires_at) {
        // 회원권 상태 자동 계산
        const calculatedStatus = calculateMembershipStatus(form.membership_expires_at, Number(form.total_sessions));
        
        const membershipPayload = {
          member_id: memberData.id,
          membership_type: form.membership_type,
          start_date: form.membership_start_date,
          end_date: form.membership_expires_at,
          total_sessions: Number(form.total_sessions),
          used_sessions: 0, // 신규 등록이므로 사용 횟수 0
          remaining_sessions: Number(form.total_sessions), // 총 횟수와 동일
          status: calculatedStatus, // 자동 계산된 상태
          notes: "신규 회원 등록 시 생성된 회원권"
        };

        logDebug(logCtx, '회원권 정보 저장 시도', { membershipPayload });

        const { error: membershipError } = await supabase
          .from("membership_history")
          .insert(membershipPayload);

        if (membershipError) {
          logError({ ...logCtx, error: membershipError, state: 'membership_insert_error' });
          console.warn("회원권 정보 저장 실패:", membershipError);
          // 회원권 정보 저장 실패해도 회원 등록은 성공으로 처리
        } else {
          logDebug(logCtx, '회원권 정보 저장 완료');
        }
      }

      // 3. 폼 초기화 및 모달 닫기
      setShowCreate(false);
      setForm({
        name: "",
        gender: "" as Member["gender"],
        age: "",
        phone: "",
        registered_at: "",
        points: "",
        memo: "",
        membership_type: "",
        membership_start_date: "",
        total_sessions: "",
        membership_expires_at: ""
      });

      // 3. 회원 목록 새로고침
      await fetchMembers();

      // 4. 회원 등록 성공 후 온보딩 처리
      if (memberData) {
        await handleMemberOnboarding(memberData.id as string, memberData.name as string, (memberData.phone as string) || '');
      }

      logDebug({ ...logCtx, state: 'success' }, '회원 등록 완료');

    } catch (e: unknown) {
      const error = e as Error;
      logError({ ...logCtx, error, state: 'error' });
      const msg = error.message || "저장 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">회원 정보</h1>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="검색 (이름/전화/상태)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 rounded border px-3 text-sm bg-background"
            />
            <Button size="icon" className="rounded-full" onClick={handleShowCreate} aria-label="회원 추가">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && <div className="text-sm">불러오는 중...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="overflow-auto rounded-lg border">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">회원명</th>
                <th className="px-3 py-2 text-left font-medium">성별</th>
                <th className="px-3 py-2 text-left font-medium">나이</th>
                <th className="px-3 py-2 text-left font-medium">전화번호</th>
                <th className="px-3 py-2 text-left font-medium">회원권상태</th>
                <th className="px-3 py-2 text-left font-medium">카카오 ID</th>
                <th className="px-3 py-2 text-left font-medium">등록일</th>
                <th className="px-3 py-2 text-left font-medium">최근방문일</th>
                <th className="px-3 py-2 text-left font-medium">잔여횟수</th>
                <th className="px-3 py-2 text-left font-medium">만료일</th>
                <th className="px-3 py-2 text-left font-medium">포인트</th>
                <th className="px-3 py-2 text-left font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-3 font-medium">{m.name}</td>
                  <td className="px-3 py-3">{m.gender || "-"}</td>
                  <td className="px-3 py-3 tabular-nums">{m.age || 0}</td>
                  <td className="px-3 py-3">{m.phone || "-"}</td>
                  <td className="px-3 py-3">
                    {m.membership_status === "활성" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">활성</span>
                    ) : m.membership_status === "정지" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">정지</span>
                    ) : m.membership_status === "임시" ? (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">임시</span>
                    ) : m.membership_status === "미등록" ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">미등록</span>
                    ) : m.membership_status === "만료" ? (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">만료</span>
                    ) : m.membership_status === "미입력" ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">미입력</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">미입력</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {m.kakao_user_id ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        연동완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        미연동
                      </span>
                      )}
                  </td>
                  <td className="px-3 py-3">{toDisplayDate(m.registered_at)}</td>
                  <td className="px-3 py-3">{toDisplayDate(m.last_visit_at)}</td>
                  <td className="px-3 py-3 tabular-nums">{m.remaining_sessions}</td>
                  <td className="px-3 py-3">{toDisplayDate(m.expires_at)}</td>
                  <td className="px-3 py-3 tabular-nums">{m.points || 0}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {m.membership_status === "임시" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTempMemberRegistration(m)}
                        >
                          정식등록
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMember(m)}
                        title="회원정보수정"
                        className="tooltip"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMembershipStatusClick(m)}
                        title="회원권정보"
                        className="tooltip"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowOnboarding(m)}
                        title="링크"
                        className="tooltip"
                      >
                        🔗
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(m)}
                        title="회원삭제"
                        className="tooltip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr className="border-t">
                  <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={12}>데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
              <div className="text-lg font-medium mb-4">회원 추가</div>
              
              <div className="space-y-4">
                {/* 기본 정보 섹션 */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-3 text-gray-700">기본 정보</h3>
                  <div className="space-y-3">
                    <label className="block text-xs">
                      이름
                      <input 
                        className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                        value={form.name} 
                        onChange={(e) => handleFormChange('name', e.target.value)} 
                      />
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs">
                        성별
                        <select 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.gender || ""} 
                          onChange={(e) => handleFormChange('gender', e.target.value)}
                        >
                          <option value="">선택</option>
                          <option value="남">남</option>
                          <option value="여">여</option>
                          <option value="기타">기타</option>
                        </select>
                      </label>
                      <label className="text-xs">
                        나이
                        <input 
                          type="number" 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.age} 
                          onChange={(e) => handleFormChange('age', e.target.value)} 
                        />
                      </label>
                    </div>
                    
                    <label className="block text-xs">
                      전화번호
                      <input 
                        className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                        value={form.phone} 
                        onChange={(e) => handleFormChange('phone', e.target.value)} 
                      />
                    </label>
                    
                    <label className="block text-xs">
                      메모
                      <input 
                        className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm border-blue-300 focus:border-blue-500" 
                        placeholder="회원 관련 메모를 입력하세요"
                        value={form.memo} 
                        onChange={(e) => {
                          console.log('DEBUG: [회원 메모] onChange 호출됨:', e.target.value);
                          handleFormChange('memo', e.target.value);
                        }} 
                      />
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs">
                        등록일
                        <input 
                          type="date" 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.registered_at} 
                          onChange={(e) => handleFormChange('registered_at', e.target.value)} 
                        />
                      </label>
                      <label className="text-xs">
                        포인트
                        <input 
                          type="number" 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.points} 
                          onChange={(e) => handleFormChange('points', e.target.value)} 
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 회원권 정보 섹션 */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-3 text-gray-700">회원권 정보 (선택사항)</h3>
                  <div className="space-y-3">
                    <label className="block text-xs">
                      회원권 종류
                      <input 
                        className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                        placeholder="예: 10회권, 20회권, 월권 등"
                        value={form.membership_type} 
                        onChange={(e) => handleFormChange('membership_type', e.target.value)} 
                      />
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs">
                        총 횟수
                        <input 
                          type="number" 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.total_sessions} 
                          onChange={(e) => handleFormChange('total_sessions', e.target.value)} 
                        />
                      </label>
                      <label className="text-xs">
                        회원권 시작일
                        <input 
                          type="date" 
                          className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                          value={form.membership_start_date} 
                          onChange={(e) => handleFormChange('membership_start_date', e.target.value)} 
                        />
                      </label>
                    </div>
                    
                    <label className="block text-xs">
                      회원권 만료일
                      <input 
                        type="date" 
                        className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                        value={form.membership_expires_at} 
                        onChange={(e) => handleFormChange('membership_expires_at', e.target.value)} 
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateMember} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 임시 회원 정식 등록 모달 */}
        {showTempMemberModal && selectedTempMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-4 shadow-lg">
              <div className="text-sm font-medium">임시 회원 정식 등록</div>
              <div className="mt-3 space-y-3">
                <label className="block text-xs">
                  이름
                  <input 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={tempMemberForm.name} 
                    onChange={(e) => setTempMemberForm(f => ({...f, name: e.target.value}))} 
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    성별
                    <select 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.gender || ""} 
                      onChange={(e) => setTempMemberForm(f => ({...f, gender: e.target.value as Member["gender"]}))}
                    >
                      <option value="">선택</option>
                      <option value="남">남</option>
                      <option value="여">여</option>
                      <option value="기타">기타</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    나이
                    <input 
                      type="number" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.age} 
                      onChange={(e) => setTempMemberForm(f => ({...f, age: e.target.value}))} 
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  전화번호
                  <input 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={tempMemberForm.phone} 
                    onChange={(e) => setTempMemberForm(f => ({...f, phone: e.target.value}))} 
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    회원권 상태
                    <select 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.membership_status} 
                      onChange={(e) => setTempMemberForm(f => ({...f, membership_status: e.target.value as MemberWithMembership["membership_status"]}))}
                    >
                      <option value="활성">활성</option>
                      <option value="정지">정지</option>
                      <option value="만료">만료</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    잔여 횟수
                    <input 
                      type="number" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.remaining_sessions} 
                      onChange={(e) => setTempMemberForm(f => ({...f, remaining_sessions: e.target.value}))} 
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    등록일
                    <input 
                      type="date" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.registered_at} 
                      onChange={(e) => setTempMemberForm(f => ({...f, registered_at: e.target.value}))} 
                    />
                  </label>
                  <label className="text-xs">
                    만료일
                    <input 
                      type="date" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={tempMemberForm.expires_at} 
                      onChange={(e) => setTempMemberForm(f => ({...f, expires_at: e.target.value}))} 
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  포인트
                  <input 
                    type="number" 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={tempMemberForm.points} 
                    onChange={(e) => setTempMemberForm(f => ({...f, points: e.target.value}))} 
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTempMemberModal(false)}>
                  취소
                </Button>
                <Button onClick={handleTempMemberUpdate} disabled={saving}>
                  {saving ? "저장 중..." : "정식 등록"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 회원 정보 수정 모달 */}
        {showEditModal && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-4 shadow-lg">
              <div className="text-sm font-medium">회원 정보 수정</div>
              <div className="mt-3 space-y-3">
                <label className="block text-xs">
                  이름
                  <input 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm(f => ({...f, name: e.target.value}))} 
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    성별
                    <select 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={editForm.gender || ""} 
                      onChange={(e) => setEditForm(f => ({...f, gender: e.target.value as Member["gender"]}))}
                    >
                      <option value="">선택</option>
                      <option value="남">남</option>
                      <option value="여">여</option>
                      <option value="기타">기타</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    나이
                    <input 
                      type="number" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={editForm.age} 
                      onChange={(e) => setEditForm(f => ({...f, age: e.target.value}))} 
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  전화번호
                  <input 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm(f => ({...f, phone: e.target.value}))} 
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    등록일
                    <input 
                      type="date" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={editForm.registered_at} 
                      onChange={(e) => setEditForm(f => ({...f, registered_at: e.target.value}))} 
                    />
                  </label>
                  <label className="text-xs">
                    포인트
                    <input 
                      type="number" 
                      className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                      value={editForm.points} 
                      onChange={(e) => setEditForm(f => ({...f, points: e.target.value}))} 
                    />
                  </label>
                </div>

              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  취소
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditModal(false);
                    // 회원권 수정 페이지로 이동
                    router.push(`/member/${editingMember?.id}/membership`);
                  }}
                >
                  회원권 수정
                </Button>
                <Button onClick={handleEditSave} disabled={editing}>
                  {editing ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 회원 온보딩 모달 */}
                {showOnboardingModal && newMemberData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl h-[90vh] rounded-xl border bg-background shadow-lg flex flex-col">
              {/* 헤더 */}
              <div className="p-6 border-b flex-shrink-0">
                <div className="text-lg font-semibold">🔗 카카오챗봇 온보딩 링크</div>
              </div>
              
              {/* 스크롤 가능한 콘텐츠 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {/* 회원 정보 */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="font-medium mb-2">📋 등록된 회원 정보</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">이름:</span> {newMemberData.name}</div>
                      <div><span className="font-medium">전화번호:</span> {newMemberData.phone}</div>
                    </div>
                  </div>

                  {/* 카카오챗봇 링크 */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">🔗 카카오챗봇 링크</h3>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newMemberData.kakaoLink} 
                        readOnly 
                        className="flex-1 h-10 rounded border bg-white px-3 text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => copyToClipboard(newMemberData.kakaoLink, 'link')}
                      >
                        복사
                      </Button>
                    </div>
                  </div>

                  {/* 전달 방법 안내 */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">📱 전달 방법</h3>
                    <div className="space-y-2 text-sm">
                      <div>1. <strong>카카오톡</strong>: 링크를 복사하여 카카오톡으로 전송</div>
                      <div>2. <strong>문자메시지</strong>: 링크를 포함한 안내 메시지 전송</div>
                      <div>3. <strong>QR코드</strong>: 링크를 QR코드로 변환하여 제공</div>
                    </div>
                  </div>

                  {/* 예시 메시지 */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">💬 예시 안내 메시지</h3>
                    <div className="bg-white rounded border p-3 text-sm">
                      안녕하세요, {newMemberData.name}님! 🎉<br/><br/>
                      SnapPilates 회원으로 등록되었습니다.<br/>
                      아래 링크를 클릭하여 카카오챗봇에 접속하시면<br/>
                      예약, 회원권 조회 등 모든 서비스를 이용하실 수 있습니다.<br/><br/>
                      👉 {newMemberData.kakaoLink}<br/><br/>
                      문의사항이 있으시면 언제든 연락주세요! 📞
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        const message = `안녕하세요, ${newMemberData.name}님! 🎉\n\nSnapPilates 회원으로 등록되었습니다.\n아래 링크를 클릭하여 카카오챗봇에 접속하시면\n예약, 회원권 조회 등 모든 서비스를 이용하실 수 있습니다.\n\n👉 ${newMemberData.kakaoLink}\n\n문의사항이 있으시면 언제든 연락주세요! 📞`;
                        copyToClipboard(message, 'message');
                      }}
                    >
                      메시지 복사
                    </Button>
                  </div>

                  {/* QR 코드 생성 버튼 */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">📱 QR 코드 생성</h3>
                    <div className="text-sm mb-2">
                      링크를 QR 코드로 변환하여 회원에게 제공할 수 있습니다.
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newMemberData.kakaoLink)}`;
                        window.open(qrUrl, '_blank');
                      }}
                    >
                      QR 코드 생성
                    </Button>
                  </div>
                </div>
              </div>

              {/* 푸터 */}
              <div className="p-6 border-t flex-shrink-0">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowOnboardingModal(false);
                      setNewMemberData(null);
                    }}
                  >
                    완료
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 회원 삭제 확인 모달 */}
        {showDeleteModal && memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
              <div className="text-lg font-medium mb-4 text-red-600">⚠️ 회원 삭제 확인</div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  다음 회원을 삭제하시겠습니까?
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div><span className="font-medium">이름:</span> {memberToDelete.name}</div>
                  <div><span className="font-medium">전화번호:</span> {memberToDelete.phone || '-'}</div>
                  <div><span className="font-medium">회원권상태:</span> {memberToDelete.membership_status}</div>
                </div>
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ 삭제된 회원 정보는 복구할 수 없습니다.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setMemberToDelete(null);
                  }}
                >
                  취소
                </Button>
                <Button 
                  variant="destructive"
                  onClick={executeDeleteMember}
                >
                  삭제
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}

