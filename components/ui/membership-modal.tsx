"use client";

import { useState } from "react";
import { Button } from "./button";
import { supabaseClient } from "@/lib/supabaseClient";

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

export function MembershipModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onSuccess
}: MembershipModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    total_sessions: "",
    remaining_sessions: "",
    start_date: "",
    end_date: "",
    price: "",
    notes: ""
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.total_sessions || !form.start_date || !form.end_date) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // 1. membership_history 테이블에 회원권 기록 추가
      const { data: membershipData, error: membershipError } = await supabaseClient
        .from('membership_history')
        .insert({
          member_id: memberId,
          membership_type: '통합제',
          total_sessions: Number(form.total_sessions),
          remaining_sessions: Number(form.remaining_sessions || form.total_sessions),
          start_date: form.start_date,
          end_date: form.end_date,
          price: form.price ? Number(form.price) : null,
          notes: form.notes || null,
          status: 'active'
        })
        .select()
        .single();

      console.log('회원권 등록 시도:', {
        member_id: memberId,
        membership_type: '통합제',
        total_sessions: Number(form.total_sessions),
        remaining_sessions: Number(form.remaining_sessions || form.total_sessions),
        start_date: form.start_date,
        end_date: form.end_date,
        price: form.price ? Number(form.price) : null,
        notes: form.notes || null,
        status: 'active'
      });

      if (membershipError) {
        console.error('회원권 등록 오류:', membershipError);
        throw new Error('회원권 등록에 실패했습니다.');
      }

      // 2. member 테이블 업데이트 (회원권 상태 동기화)
      const { error: memberError } = await supabaseClient
        .from('member')
        .update({
          membership_status: '활성',
          remaining_sessions: Number(form.remaining_sessions || form.total_sessions),
          expires_at: form.end_date || null,
          last_visit_at: new Date().toISOString().split('T')[0]
        })
        .eq('id', memberId);

      if (memberError) {
        console.error('회원 정보 업데이트 오류:', memberError);
        throw new Error('회원 정보 업데이트에 실패했습니다.');
      }

      console.log('회원권 등록 성공:', membershipData);
      alert('회원권이 성공적으로 등록되었습니다.');
      
      // 폼 초기화
      setForm({
        total_sessions: "",
        remaining_sessions: "",
        start_date: "",
        end_date: "",
        price: "",
        notes: ""
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('회원권 등록 오류:', error);
      alert('회원권 등록에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  // handleMembershipTypeChange 함수 제거 (더 이상 필요하지 않음)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">회원권 등록</h2>
        <p className="text-sm text-gray-600 mb-4">회원: {memberName}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 총 횟수 */}
          <div>
            <label className="block text-sm font-medium mb-1">총 횟수 *</label>
            <input
              type="number"
              value={form.total_sessions}
              onChange={(e) => setForm(prev => ({ ...prev, total_sessions: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              min="1"
              required
            />
          </div>

          {/* 잔여 횟수 */}
          <div>
            <label className="block text-sm font-medium mb-1">잔여 횟수</label>
            <input
              type="number"
              value={form.remaining_sessions}
              onChange={(e) => setForm(prev => ({ ...prev, remaining_sessions: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              min="0"
              max={form.total_sessions}
              placeholder="비워두면 총 횟수와 동일"
            />
          </div>

          {/* 시작일 */}
          <div>
            <label className="block text-sm font-medium mb-1">시작일 *</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              required
            />
          </div>

          {/* 종료일 */}
          <div>
            <label className="block text-sm font-medium mb-1">종료일 *</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              min={form.start_date}
              required
            />
          </div>

          {/* 가격 */}
          <div>
            <label className="block text-sm font-medium mb-1">가격 (원)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              min="0"
              placeholder="선택사항"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium mb-1">메모</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              rows={3}
              placeholder="추가 정보를 입력하세요"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
