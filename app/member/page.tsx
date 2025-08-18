"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Plus, Link, Link2Off } from "lucide-react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  name: string;
  gender: "남" | "여" | "기타";
  age: number;
  phone: string;
  membershipStatus: "활성" | "만료" | "정지" | "임시";
  registeredAt: string; // yyyy-MM-dd
  lastVisitAt: string; // yyyy-MM-dd
  remainingSessions: number;
  expiresAt: string; // yyyy-MM-dd
  points: number;
  kakaoId?: string;
  kakaoUserId?: string;
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

export default function Page() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Member[]>([]);
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
    membership_status: "활성" as Member["membershipStatus"],
    registered_at: "",
    last_visit_at: "",
    remaining_sessions: "",
    expires_at: "",
    points: "",
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

  const fetchMembers = React.useCallback(async () => {
      try {
        setLoading(true);
        setError("");
        

        
        const { data, error } = await supabase
          .from("member")
          .select(
            "id,name,gender,age,phone,membership_status,registered_at,last_visit_at,remaining_sessions,expires_at,points,kakao_id,kakao_user_id,is_temp"
          )
          .order("name", { ascending: true });
          
        if (error) {
          console.error("Supabase 오류:", error);
          throw error;
        }
        type MemberRow = {
          id: string;
          name: string | null;
          gender: Member["gender"] | null;
          age: number | null;
          phone: string | null;
          membership_status: Member["membershipStatus"] | null;
          registered_at: string | null;
          last_visit_at: string | null;
          remaining_sessions: number | null;
          expires_at: string | null;
          points: number | null;
          kakao_id: string | null;
          kakao_user_id: string | null;
          is_temp: boolean | null;
        };
        const mapped: Member[] = (data as MemberRow[] | null || []).map((r) => ({
          id: r.id,
          name: r.name ?? "",
          gender: (r.gender ?? "") as Member["gender"],
          age: Number(r.age ?? 0),
          phone: r.phone ?? "",
          membershipStatus: (r.membership_status ?? "") as Member["membershipStatus"],
          registeredAt: toDisplayDate(r.registered_at),
          lastVisitAt: toDisplayDate(r.last_visit_at),
          remainingSessions: Number(r.remaining_sessions ?? 0),
          expiresAt: toDisplayDate(r.expires_at),
          points: Number(r.points ?? 0),
          kakaoId: r.kakao_id ?? "",
          kakaoUserId: r.kakao_user_id ?? "",
          isTemp: r.is_temp ?? false
        }));
        setRows(mapped);
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
      [r.name, r.phone, r.gender, r.membershipStatus].some((v) => String(v ?? "").includes(t))
    );
  }, [rows, q]);

  const handleMembershipStatusClick = (member: Member) => {
    router.push(`/member/${member.id}/membership`);
  };

  const handleTempMemberRegistration = (member: Member) => {
    setSelectedTempMember(member);
    setTempMemberForm({
      name: member.name,
      gender: member.gender,
      age: member.age.toString(),
      phone: member.phone,
      membership_status: "활성",
      registered_at: member.registeredAt,
      last_visit_at: member.lastVisitAt,
      remaining_sessions: member.remainingSessions.toString(),
      expires_at: member.expiresAt,
      points: member.points.toString()
    });
    setShowTempMemberModal(true);
  };

  const handleTempMemberUpdate = async () => {
    if (!selectedTempMember) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("member")
        .update({
          name: tempMemberForm.name,
          gender: tempMemberForm.gender,
          age: Number(tempMemberForm.age),
          phone: tempMemberForm.phone,
          membership_status: tempMemberForm.membership_status,
          registered_at: tempMemberForm.registered_at,
          last_visit_at: tempMemberForm.last_visit_at,
          remaining_sessions: Number(tempMemberForm.remaining_sessions),
          expires_at: tempMemberForm.expires_at,
          points: Number(tempMemberForm.points),
          is_temp: false // 임시 회원 플래그 제거
        })
        .eq("id", selectedTempMember.id);

      if (error) throw error;

      setShowTempMemberModal(false);
      setSelectedTempMember(null);
      alert("임시 회원이 정식 회원으로 등록되었습니다.");
      await fetchMembers();
    } catch (error) {
      console.error("임시 회원 등록 오류:", error);
      alert("임시 회원 등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 카카오챗봇 링크 생성
  const generateKakaoLink = async (memberId: string, memberName: string, memberPhone: string) => {
    try {
      const response = await fetch(`/api/member/kakao-link?member_id=${memberId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.kakao_link;
      } else {
        throw new Error(result.error || '링크 생성 실패');
      }
    } catch (error) {
      console.error('카카오 링크 생성 오류:', error);
      // 기본 링크 생성
      const kakaoBotId = process.env.NEXT_PUBLIC_KAKAO_BOT_ID || 'YOUR_BOT_ID';
      return `https://pf.kakao.com/${kakaoBotId}/chat?member_id=${memberId}`;
    }
  };

  // 회원 등록 후 온보딩 처리
  const handleMemberOnboarding = async (memberId: string, memberName: string, memberPhone: string) => {
    try {
      const kakaoLink = await generateKakaoLink(memberId, memberName, memberPhone);
      
      setNewMemberData({
        name: memberName,
        phone: memberPhone,
        kakaoLink: kakaoLink
      });
      setShowOnboardingModal(true);
    } catch (error) {
      console.error('온보딩 처리 오류:', error);
      alert('온보딩 링크 생성 중 오류가 발생했습니다.');
    }
  };

  // 기존 회원의 온보딩 링크 보기
  const handleShowOnboarding = async (member: Member) => {
    try {
      const kakaoLink = await generateKakaoLink(member.id, member.name, member.phone);
      
      setNewMemberData({
        name: member.name,
        phone: member.phone,
        kakaoLink: kakaoLink
      });
      setShowOnboardingModal(true);
    } catch (error) {
      console.error('온보딩 링크 생성 오류:', error);
      alert('온보딩 링크 생성 중 오류가 발생했습니다.');
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
            <Button size="icon" className="rounded-full" onClick={() => setShowCreate(true)} aria-label="회원 추가">
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
                  <td className="px-3 py-3">{m.gender}</td>
                  <td className="px-3 py-3 tabular-nums">{m.age}</td>
                  <td className="px-3 py-3">{m.phone}</td>
                  <td className="px-3 py-3">
                    {m.membershipStatus === "활성" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">활성</span>
                    ) : m.membershipStatus === "정지" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">정지</span>
                    ) : m.membershipStatus === "임시" ? (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">임시</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">만료</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {m.kakaoUserId ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {m.kakaoUserId.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        미매핑
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{m.registeredAt}</td>
                  <td className="px-3 py-3 tabular-nums">{m.lastVisitAt}</td>
                  <td className="px-3 py-3 tabular-nums">{m.remainingSessions}</td>
                  <td className="px-3 py-3 tabular-nums">{m.expiresAt}</td>
                  <td className="px-3 py-3 tabular-nums">{m.points.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {m.membershipStatus === "임시" && (
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
                        onClick={() => handleMembershipStatusClick(m)}
                      >
                        상세보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowOnboarding(m)}
                        title="온보딩 링크 보기"
                      >
                        🔗
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
            <div className="w-full max-w-lg rounded-xl border bg-background p-4 shadow-lg">
              <div className="text-sm">회원 추가</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs">이름
                  <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.name} onChange={(e)=>setForm((f)=>({...f,name:e.target.value}))} />
                </label>
                <label className="text-xs">성별
                  <select className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.gender} onChange={(e)=>setForm((f)=>({...f,gender:e.target.value as Member["gender"]}))}>
                    <option value="">선택</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                    <option value="기타">기타</option>
                  </select>
                </label>
                <label className="text-xs">나이
                  <input type="number" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.age} onChange={(e)=>setForm((f)=>({...f,age:e.target.value}))} />
                </label>
                <label className="col-span-2 text-xs">전화번호
                  <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.phone} onChange={(e)=>setForm((f)=>({...f,phone:e.target.value}))} />
                </label>
                <label className="text-xs">회원권상태
                  <select className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.membership_status} onChange={(e)=>setForm((f)=>({...f,membership_status:e.target.value as Member["membershipStatus"]}))}>
                    <option value="활성">활성</option>
                    <option value="정지">정지</option>
                    <option value="만료">만료</option>
                  </select>
                </label>
                <label className="text-xs">등록일
                  <input type="date" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.registered_at} onChange={(e)=>setForm((f)=>({...f,registered_at:e.target.value}))} />
                </label>
                <label className="text-xs">최근방문일
                  <input type="date" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.last_visit_at} onChange={(e)=>setForm((f)=>({...f,last_visit_at:e.target.value}))} />
                </label>
                <label className="text-xs">잔여횟수
                  <input type="number" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.remaining_sessions} onChange={(e)=>setForm((f)=>({...f,remaining_sessions:e.target.value}))} />
                </label>
                <label className="text-xs">만료일
                  <input type="date" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.expires_at} onChange={(e)=>setForm((f)=>({...f,expires_at:e.target.value}))} />
                </label>
                <label className="text-xs">포인트
                  <input type="number" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.points} onChange={(e)=>setForm((f)=>({...f,points:e.target.value}))} />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={()=> setShowCreate(false)}>취소</Button>
                <Button size="sm" disabled={saving} onClick={async ()=>{
                  if(!form.name){ alert("이름을 입력해주세요."); return; }
                  try{
                    setSaving(true);
                    const payload = {
                      name: form.name,
                      gender: form.gender || null,
                      age: form.age ? Number(form.age) : null,
                      phone: form.phone || null,
                      membership_status: form.membership_status,
                      registered_at: form.registered_at || null,
                      last_visit_at: form.last_visit_at || null,
                      remaining_sessions: form.remaining_sessions ? Number(form.remaining_sessions) : 0,
                      expires_at: form.expires_at || null,
                      points: form.points ? Number(form.points) : 0,
                    };
                    const { data, error } = await supabase.from("member").insert(payload).select().single();
                    if(error) throw error;
                    setShowCreate(false);
                    setForm({name:"",gender:"" as Member["gender"],age:"",phone:"",membership_status:"활성",registered_at:"",last_visit_at:"",remaining_sessions:"",expires_at:"",points:""});
                    await fetchMembers();
                    
                    // 회원 등록 성공 후 온보딩 처리
                    if (data) {
                      await handleMemberOnboarding(data.id, data.name, data.phone || '');
                    }
                  }catch(e){
                    const msg = e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.";
                    alert(msg);
                  }finally{
                    setSaving(false);
                  }
                }}>{saving?"저장 중...":"저장"}</Button>
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
                      value={tempMemberForm.gender} 
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
                      onChange={(e) => setTempMemberForm(f => ({...f, membership_status: e.target.value as Member["membershipStatus"]}))}
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
      </div>
    </SidebarLayout>
  );
}

