"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getLatestMembershipInfo } from "@/lib/membership";

interface MemberInfo {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  registered_at: string | null;
  last_visit_at: string | null;
  points: number | null;
  membership_status: string;
  remaining_sessions: number;
  expires_at: string | null;
}

interface MemberPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  position: { x: number; y: number };
}

export function MemberPopover({
  isOpen,
  onClose,
  memberId,
  memberName,
  position
}: MemberPopoverProps) {
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('MemberPopover useEffect:', { isOpen, memberId });
    if (isOpen && memberId) {
      console.log('회원 정보 로드 시작:', memberId);
      loadMemberInfo();
    }
  }, [isOpen, memberId]);

  const loadMemberInfo = async () => {
    try {
      setLoading(true);
      
      // 회원 기본 정보 조회
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
          points
        `)
        .eq('id', memberId)
        .single();

      if (memberError) {
        console.error('회원 정보 조회 오류:', memberError);
        return;
      }

      // 회원권 정보 조회 (membership.ts 함수 사용)
      const membershipInfo = await getLatestMembershipInfo(memberId);

      setMemberInfo({
        ...(memberData as any),
        membership_status: membershipInfo?.membership_status || '미등록',
        remaining_sessions: membershipInfo?.remaining_sessions || 0,
        expires_at: membershipInfo?.expires_at || null
      });

    } catch (error) {
      console.error('회원 정보 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case '활성':
        return 'text-green-600 bg-green-100';
      case '만료':
        return 'text-red-600 bg-red-100';
      case '정지':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleViewDetails = () => {
    router.push(`/member/${memberId}`);
    onClose();
  };

  console.log('MemberPopover 렌더링:', { isOpen, memberId, memberName, position });
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div 
        className="absolute bg-white rounded-lg shadow-lg border p-4 w-80 max-h-96 overflow-y-auto"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 384)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <h3 className="font-semibold text-lg">회원정보 - {memberName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            회원 정보를 불러오는 중...
          </div>
        ) : memberInfo ? (
          <div className="space-y-4">
            {/* 회원권 정보만 표시 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">회원권 정보</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">상태</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getMembershipStatusColor(memberInfo.membership_status)}`}>
                    {memberInfo.membership_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">잔여횟수</span>
                  <span className="text-sm font-medium">{memberInfo.remaining_sessions}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">만료일</span>
                  <span className="text-sm font-medium">{formatDate(memberInfo.expires_at)}</span>
                </div>
              </div>
            </div>

            {/* 상세보기 버튼 */}
            <div className="pt-3 border-t">
              <Button
                onClick={handleViewDetails}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                size="sm"
              >
                상세보기
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            회원 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
