"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit, Save, X } from "lucide-react";
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
  status: "활성" | "만료" | "정지" | "취소";
  created_at: string;
  updated_at: string;
};

type Member = {
  id: string;
  name: string;
  gender: "남" | "여" | "기타";
  age: number;
  phone: string;
  membershipStatus: "활성" | "만료" | "정지" | "임시";
  registeredAt: string;
  lastVisitAt: string;
  remainingSessions: number;
  expiresAt: string;
  points: number;
  kakaoId?: string;
  isTemp?: boolean;
};

type MembershipEditData = {
  remainingSessions: number;
  expiresAt: string;
  totalSessions: number;
  usedSessions: number;
  status: "활성" | "만료" | "정지" | "임시";
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
function calculateMembershipStatus(history: any): "활성" | "만료" | "정지" | "임시" {
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<MembershipEditData>({
    remainingSessions: 0,
    expiresAt: "",
    totalSessions: 0,
    usedSessions: 0,
    status: "활성"
  });
  const [saving, setSaving] = useState(false);

  const fetchMemberData = async () => {
    const logCtx = createLogContext('MembershipPage', 'fetchMemberData');
    logDebug(logCtx, '회원 데이터 조회 시작', { memberId });
    
    try {
      setLoading(true);
      setError("");

      // 회원 정보 조회
      const { data: memberData, error: memberError } = await supabase
        .from("member")
        .select("*")
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;

      const mappedMember: Member = {
        id: memberData.id,
        name: memberData.name ?? "",
        gender: (memberData.gender ?? "") as Member["gender"],
        age: Number(memberData.age ?? 0),
        phone: memberData.phone ?? "",
        membershipStatus: (memberData.membership_status ?? "") as Member["membershipStatus"],
        registeredAt: toDisplayDate(memberData.registered_at),
        lastVisitAt: toDisplayDate(memberData.last_visit_at),
        remainingSessions: Number(memberData.remaining_sessions ?? 0),
        expiresAt: toDisplayDate(memberData.expires_at),
        points: Number(memberData.points ?? 0),
        kakaoId: memberData.kakao_id ?? "",
        isTemp: memberData.is_temp ?? false
      };

      setMember(mappedMember);

      // 회원권 히스토리 조회
      const { data: historyData, error: historyError } = await supabase
        .from("membership_history")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.warn("회원권 히스토리 조회 실패:", historyError);
        setMembershipHistory([]);
      } else {
        const history = historyData || [];
        setMembershipHistory(history);
        
        // 가장 최근 회원권을 기준으로 회원 상태 업데이트
        if (history.length > 0) {
          const latestMembership = history[0]; // 가장 최근 회원권
          const calculatedStatus = calculateMembershipStatus(latestMembership);
          
          // 회원 상태가 계산된 상태와 다르면 업데이트
          if (mappedMember.membershipStatus !== calculatedStatus) {
            console.log('회원 상태 자동 업데이트:', {
              memberId,
              oldStatus: mappedMember.membershipStatus,
              newStatus: calculatedStatus,
              endDate: latestMembership.end_date,
              remainingSessions: latestMembership.remaining_sessions
            });
            
            // 회원 상태 업데이트
            const { error: updateError } = await supabase
              .from("member")
              .update({ 
                membership_status: calculatedStatus,
                remaining_sessions: latestMembership.remaining_sessions,
                expires_at: latestMembership.end_date
              })
              .eq("id", memberId);
            
            if (!updateError) {
              // 로컬 상태도 업데이트
              setMember(prev => prev ? {
                ...prev,
                membershipStatus: calculatedStatus,
                remainingSessions: latestMembership.remaining_sessions,
                expiresAt: toDisplayDate(latestMembership.end_date)
              } : null);
            }
          }
        }
      }

      logDebug({ ...logCtx, state: 'success' }, '회원 데이터 조회 완료');

    } catch (e: unknown) {
      const error = e as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError("회원 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!member || membershipHistory.length === 0) return;
    
    const latestMembership = membershipHistory[0];
    setEditData({
      remainingSessions: latestMembership.remaining_sessions,
      expiresAt: latestMembership.end_date,
      totalSessions: latestMembership.total_sessions,
      usedSessions: latestMembership.used_sessions,
      status: member.membershipStatus
    });
    setShowEditModal(true);
  };

  const updateMembershipData = async () => {
    if (!member || membershipHistory.length === 0) return;

    const logCtx = createLogContext('MembershipPage', 'updateMembershipData');
    logDebug(logCtx, '회원권 데이터 업데이트 시작', { memberId, editData });

    setSaving(true);
    
    try {
      const latestMembership = membershipHistory[0];
      
      // 회원권 히스토리 업데이트
      const { error: historyError } = await supabase
        .from("membership_history")
        .update({
          remaining_sessions: editData.remainingSessions,
          end_date: editData.expiresAt,
          total_sessions: editData.totalSessions,
          used_sessions: editData.usedSessions,
          updated_at: new Date().toISOString()
        })
        .eq("id", latestMembership.id);

      if (historyError) throw historyError;

      // 회원 정보 업데이트
      const { error: memberError } = await supabase
        .from("member")
        .update({
          remaining_sessions: editData.remainingSessions,
          expires_at: editData.expiresAt,
          membership_status: editData.status
        })
        .eq("id", memberId);

      if (memberError) throw memberError;

      setShowEditModal(false);
      await fetchMemberData();
      alert("회원권 정보가 업데이트되었습니다.");
      
      logDebug({ ...logCtx, state: 'success' }, '회원권 데이터 업데이트 완료');
    } catch (error) {
      const err = error as Error;
      logError({ ...logCtx, error: err, state: 'error' });
      alert("회원권 정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
    }
  }, [memberId]);

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

        {/* 회원 기본 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-card border rounded-lg p-3">
            <h2 className="text-md font-semibold mb-4">기본 정보</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">이름:</span> {member.name}</div>
              <div><span className="font-medium">성별:</span> {member.gender}</div>
              <div><span className="font-medium">나이:</span> {member.age}세</div>
              <div><span className="font-medium">전화번호:</span> {member.phone}</div>
              <div><span className="font-medium">등록일:</span> {member.registeredAt}</div>
              <div><span className="font-medium">최근방문일:</span> {member.lastVisitAt}</div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-md font-semibold">회원권 현황</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openEditModal}
                disabled={membershipHistory.length === 0}
              >
                <Edit className="h-4 w-4 mr-1" />
                수정
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">상태:</span>
                <div className="flex items-center gap-2">
                  {member.membershipStatus === "활성" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">활성</span>
                  ) : member.membershipStatus === "정지" ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">정지</span>
                  ) : member.membershipStatus === "임시" ? (
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">임시</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">만료</span>
                  )}
                </div>
              </div>
              <div><span className="font-medium">잔여횟수:</span> {member.remainingSessions}회</div>
              <div><span className="font-medium">만료일:</span> {member.expiresAt}</div>
              <div><span className="font-medium">포인트:</span> {member.points.toLocaleString()}P</div>
              {member.kakaoId && (
                <div><span className="font-medium">카카오ID:</span> {member.kakaoId}</div>
              )}
              {member.isTemp && (
                <div className="text-orange-600 font-medium">임시 회원</div>
              )}
            </div>
          </div>
        </div>

        {/* 회원권 히스토리 */}
        <div className="bg-card border rounded-lg p-3 mb-4">
          <h2 className="text-md font-semibold mb-3">회원권 히스토리</h2>
          {membershipHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">회원권 종류</th>
                    <th className="px-3 py-2 text-left font-medium">시작일</th>
                    <th className="px-3 py-2 text-left font-medium">만료일</th>
                    <th className="px-3 py-2 text-left font-medium">총 횟수</th>
                    <th className="px-3 py-2 text-left font-medium">사용 횟수</th>
                    <th className="px-3 py-2 text-left font-medium">잔여 횟수</th>
                    <th className="px-3 py-2 text-left font-medium">상태</th>
                    <th className="px-3 py-2 text-left font-medium">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipHistory.map((history) => (
                    <tr key={history.id} className="border-t">
                      <td className="px-3 py-3">{history.membership_type}</td>
                      <td className="px-3 py-3">{toDisplayDate(history.start_date)}</td>
                      <td className="px-3 py-3">{toDisplayDate(history.end_date)}</td>
                      <td className="px-3 py-3">{history.total_sessions}</td>
                      <td className="px-3 py-3">{history.used_sessions}</td>
                      <td className="px-3 py-3">{history.remaining_sessions}</td>
                      <td className="px-3 py-3">
                        {(() => {
                          const calculatedStatus = calculateMembershipStatus(history);
                          return calculatedStatus === "활성" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">활성</span>
                          ) : calculatedStatus === "정지" ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">정지</span>
                          ) : calculatedStatus === "임시" ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">임시</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">만료</span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">{toDisplayDate(history.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">회원권 히스토리가 없습니다.</div>
          )}
        </div>

        {/* 회원권 정보 수정 모달 */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">회원권 정보 수정</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">회원권 상태</label>
                  <select 
                    className="w-full h-9 rounded border bg-background px-2 text-sm"
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      status: e.target.value as "활성" | "만료" | "정지" | "임시"
                    }))}
                  >
                    <option value="활성">활성</option>
                    <option value="정지">정지</option>
                    <option value="만료">만료</option>
                    <option value="임시">임시</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">총 횟수</label>
                  <Input
                    type="number"
                    value={editData.totalSessions}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      totalSessions: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">사용 횟수</label>
                  <Input
                    type="number"
                    value={editData.usedSessions}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      usedSessions: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    max={editData.totalSessions}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">잔여 횟수</label>
                  <Input
                    type="number"
                    value={editData.remainingSessions}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      remainingSessions: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    자동 계산: {editData.totalSessions - editData.usedSessions}회
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">만료일</label>
                  <Input
                    type="date"
                    value={editData.expiresAt}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      expiresAt: e.target.value
                    }))}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                >
                  취소
                </Button>
                <Button 
                  onClick={updateMembershipData}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
