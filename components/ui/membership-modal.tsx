"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { supabaseClient } from "@/lib/supabaseClient";

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

interface SystemSettings {
  weeklyRecommendedSessions: number;
  membershipExpirationBuffer: number;
}

export function MembershipModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onSuccess
}: MembershipModalProps) {
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    weeklyRecommendedSessions: 2,
    membershipExpirationBuffer: 3 // 기본값 설정
  });
  const [form, setForm] = useState({
    membership_type: "",
    total_sessions: "",
    remaining_sessions: "",
    start_date: "",
    end_date: "",
    price: "",
    notes: ""
  });

  // 시스템 설정 로드
  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSystemSettings({
            weeklyRecommendedSessions: data.weeklyRecommendedSessions || 2,
            membershipExpirationBuffer: data.membershipExpirationBuffer || 3 // 설정에서 로드
          });
        }
      } catch (error) {
        console.error('시스템 설정 로드 실패:', error);
      }
    };

    if (isOpen) {
      loadSystemSettings();
    }
  }, [isOpen]);

  // 총 횟수 변경 시 자동으로 만료일 계산
  const handleTotalSessionsChange = (value: string) => {
    const totalSessions = Number(value);
    const startDate = form.start_date;
    
    if (totalSessions && startDate && systemSettings.weeklyRecommendedSessions) {
      // 주간 권장 횟수로 나누어 필요한 주 수 계산
      const weeksNeeded = Math.ceil(totalSessions / systemSettings.weeklyRecommendedSessions);
      
      // 시작일로부터 계산된 주 수만큼 더하기
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
      
      // 버퍼 일수 추가 (설정에서 가져온 값)
      endDateObj.setDate(endDateObj.getDate() + systemSettings.membershipExpirationBuffer);
      
      // YYYY-MM-DD 형식으로 변환
      const endDate = endDateObj.toISOString().split('T')[0];
      
      setForm(prev => ({
        ...prev,
        total_sessions: value,
        end_date: endDate
      }));
    } else {
      setForm(prev => ({ ...prev, total_sessions: value }));
    }
  };

  // 시작일 변경 시 자동으로 만료일 계산
  const handleStartDateChange = (value: string) => {
    const totalSessions = Number(form.total_sessions);
    
    if (totalSessions && value && systemSettings.weeklyRecommendedSessions) {
      // 주간 권장 횟수로 나누어 필요한 주 수 계산
      const weeksNeeded = Math.ceil(totalSessions / systemSettings.weeklyRecommendedSessions);
      
      // 시작일로부터 계산된 주 수만큼 더하기
      const startDateObj = new Date(value);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (weeksNeeded * 7));
      
      // 버퍼 일수 추가 (설정에서 가져온 값)
      endDateObj.setDate(endDateObj.getDate() + systemSettings.membershipExpirationBuffer);
      
      // YYYY-MM-DD 형식으로 변환
      const endDate = endDateObj.toISOString().split('T')[0];
      
      setForm(prev => ({
        ...prev,
        start_date: value,
        end_date: endDate
      }));
    } else {
      setForm(prev => ({ ...prev, start_date: value }));
    }
  };

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
          membership_type: form.membership_type,
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
        membership_type: form.membership_type,
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
        membership_type: "",
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
          {/* 회원권 유형 */}
          <div>
            <label className="block text-sm font-medium mb-1">회원권 유형 *</label>
            <select
              value={form.membership_type}
              onChange={(e) => {
                const type = e.target.value;
                let sessions = "";
                if (type === "10회권") sessions = "10";
                else if (type === "20회권") sessions = "20";
                else if (type === "50회권") sessions = "50";
                
                setForm(prev => ({ 
                  ...prev, 
                  membership_type: type,
                  total_sessions: sessions
                }));
                
                // 총 횟수가 변경되면 만료일도 자동 계산
                if (sessions && form.start_date) {
                  handleTotalSessionsChange(sessions);
                }
              }}
              className="w-full p-2 border rounded text-sm"
              required
            >
              <option value="">선택하세요</option>
              <option value="10회권">10회권</option>
              <option value="20회권">20회권</option>
              <option value="50회권">50회권</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              회원권의 유형을 선택하세요.
            </p>
          </div>

          {/* 총 횟수 */}
          <div>
            <label className="block text-sm font-medium mb-1">총 횟수 *</label>
            <input
              type="number"
              value={form.total_sessions}
              onChange={(e) => handleTotalSessionsChange(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              min="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              설정된 주간 권장 횟수({systemSettings.weeklyRecommendedSessions}회)를 기반으로 만료일이 자동 계산됩니다.
              추가로 {systemSettings.membershipExpirationBuffer}일의 여유 기간이 포함됩니다.
            </p>
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
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              시작일을 선택하면 총 횟수에 따라 만료일이 자동으로 계산됩니다.
            </p>
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
            <p className="text-xs text-gray-500 mt-1">
              {form.total_sessions && form.start_date ? 
                `예상 기간: ${Math.ceil(Number(form.total_sessions) / systemSettings.weeklyRecommendedSessions)}주 + ${systemSettings.membershipExpirationBuffer}일 여유` : 
                '1주간 권장 횟수에 따라 자동 계산됩니다.'
              }
            </p>
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
