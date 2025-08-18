"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

export default function MembershipPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  
  const [member, setMember] = useState<Member | null>(null);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<Member["membershipStatus"]>("활성");

  const fetchMemberData = async () => {
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
        setMembershipHistory(historyData || []);
      }

    } catch (e: unknown) {
      console.error("회원 데이터 조회 오류:", e);
      setError("회원 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateMembershipStatus = async () => {
    if (!member) return;

    try {
      const { error } = await supabase
        .from("member")
        .update({ membership_status: newStatus })
        .eq("id", memberId);

      if (error) throw error;

      setShowStatusModal(false);
      await fetchMemberData();
      alert("회원권 상태가 업데이트되었습니다.");
    } catch (error) {
      console.error("회원권 상태 업데이트 오류:", error);
      alert("회원권 상태 업데이트 중 오류가 발생했습니다.");
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
            <h2 className="text-md font-semibold mb-3">회원권 현황</h2>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setNewStatus(member.membershipStatus);
                      setShowStatusModal(true);
                    }}
                  >
                    변경
                  </Button>
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
                        {history.status === "활성" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">활성</span>
                        ) : history.status === "정지" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">정지</span>
                        ) : history.status === "취소" ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">취소</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">만료</span>
                        )}
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

        {/* 회원권 상태 변경 모달 */}
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="text-sm font-medium mb-4">회원권 상태 변경</div>
              <div className="space-y-4">
                <label className="block text-sm">
                  상태
                  <select 
                    className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value as Member["membershipStatus"])}
                  >
                    <option value="활성">활성</option>
                    <option value="정지">정지</option>
                    <option value="만료">만료</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                  취소
                </Button>
                <Button onClick={updateMembershipStatus}>
                  변경
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
