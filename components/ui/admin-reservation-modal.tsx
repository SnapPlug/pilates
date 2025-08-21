"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { supabase } from "@/lib/supabaseClient";
import { getAllMembersWithMembership, type MemberWithMembership } from "@/lib/membership";

interface Member {
  id: string;
  name: string;
  phone: string | null;
  membership_status: string;
}

interface AdminReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  classDate: string;
  classTime: string;
  currentReservations: number;
  capacity: number;
  onReservationSuccess: () => void;
}

export function AdminReservationModal({
  isOpen,
  onClose,
  classId,
  className,
  classDate,
  classTime,
  currentReservations,
  capacity,
  onReservationSuccess
}: AdminReservationModalProps) {
  const [members, setMembers] = useState<MemberWithMembership[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reservationType, setReservationType] = useState<'member' | 'guest'>('member');
  const [guestForm, setGuestForm] = useState({
    name: "",
    phone: ""
  });

  // 회원 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      
      // membership.ts의 getAllMembersWithMembership 함수 사용
      const membersData = await getAllMembersWithMembership();
      setMembers(membersData);
      
    } catch (error) {
      console.error('회원 목록 로드 오류:', error);
      alert('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // 활성 회원권을 가진 회원만 필터링 후 검색
  const activeMembers = members.filter(member => member.membership_status === '활성');
  
  const filteredMembers = activeMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.phone && member.phone.includes(searchTerm))
  );

  // 예약 처리
  const handleReservation = async () => {
    if (currentReservations >= capacity) {
      alert('수업 정원이 가득 찼습니다.');
      return;
    }

    // 회원 예약인 경우
    if (reservationType === 'member') {
      if (!selectedMemberId) {
        alert('회원을 선택해주세요.');
        return;
      }

      const selectedMember = members.find(m => m.id === selectedMemberId);
      if (!selectedMember) {
        alert('선택된 회원 정보를 찾을 수 없습니다.');
        return;
      }

      if (selectedMember.membership_status !== '활성') {
        alert('활성 회원권을 가진 회원만 예약할 수 있습니다.');
        return;
      }
    } else {
      // 비회원 예약인 경우
      if (!guestForm.name.trim()) {
        alert('체험자 이름을 입력해주세요.');
        return;
      }
      if (!guestForm.phone.trim()) {
        alert('체험자 전화번호를 입력해주세요.');
        return;
      }
    }

    try {
      setLoading(true);

      let reservationData;

      if (reservationType === 'member') {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        reservationData = {
          class_id: classId,
          member_id: selectedMemberId, // 회원 ID 추가
          name: selectedMember!.name,
          phone: selectedMember!.phone || '',
        };
      } else {
        reservationData = {
          class_id: classId,
          member_id: null, // 체험자는 null
          name: guestForm.name.trim(),
          phone: guestForm.phone.trim(),
        };
      }

      // 예약 생성
      const { data, error } = await supabase
        .from('reservation')
        .insert(reservationData)
        .select()
        .single();

      if (error) {
        console.error('예약 생성 오류:', error);
        throw error;
      }

      const successMessage = reservationType === 'member' 
        ? `${reservationData.name} 회원이 성공적으로 예약되었습니다.`
        : `${reservationData.name} 체험자가 성공적으로 예약되었습니다.`;
      
      alert(successMessage);
      onReservationSuccess();
      onClose();
      
    } catch (error) {
      console.error('예약 처리 오류:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableSlots = capacity - currentReservations;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">관리자 예약</h2>
        
        {/* 수업 정보 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-sm text-gray-600 mb-1">수업 정보</div>
          <div className="font-medium">{className}</div>
          <div className="text-sm text-gray-600">
            {classDate} {classTime} ({currentReservations}/{capacity})
          </div>
          <div className="text-sm text-blue-600 font-medium">
            남은 자리: {availableSlots}개
          </div>
        </div>

        {/* 예약 타입 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">예약 타입</label>
          <div className="flex gap-2">
            <button
              onClick={() => setReservationType('member')}
              className={`flex-1 p-2 rounded text-sm border ${
                reservationType === 'member' 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              회원 예약
            </button>
            <button
              onClick={() => setReservationType('guest')}
              className={`flex-1 p-2 rounded text-sm border ${
                reservationType === 'guest' 
                  ? 'bg-orange-100 border-orange-300 text-orange-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              체험 예약
            </button>
          </div>
        </div>

        {reservationType === 'member' ? (
          <>
            {/* 회원 검색 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">회원 검색 (활성 회원권만)</label>
              <input
                type="text"
                placeholder="이름 또는 전화번호로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </>
        ) : (
          <>
            {/* 체험자 정보 입력 */}
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">체험자 이름</label>
                <input
                  type="text"
                  placeholder="체험자 이름을 입력하세요"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">체험자 전화번호</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* 회원 목록 (회원 예약일 때만 표시) */}
        {reservationType === 'member' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">회원 선택</label>
            {loadingMembers ? (
              <div className="text-center py-4 text-gray-500">회원 목록을 불러오는 중...</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? '활성 회원권을 가진 회원이 없습니다.' : '활성 회원권을 가진 회원이 없습니다.'}
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <label
                      key={member.id}
                      className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedMemberId === member.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="member"
                        value={member.id}
                        checked={selectedMemberId === member.id}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-600">
                          {member.phone || '전화번호 없음'}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          회원권: {member.membership_status} (잔여: {member.remaining_sessions}회)
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            취소
          </Button>
          <Button
            onClick={handleReservation}
            disabled={
              loading || 
              availableSlots <= 0 || 
              (reservationType === 'member' && !selectedMemberId) ||
              (reservationType === 'guest' && (!guestForm.name.trim() || !guestForm.phone.trim()))
            }
            className={`${
              reservationType === 'member' 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-orange-500 hover:bg-orange-600'
            } text-white`}
          >
            {loading ? '예약 중...' : reservationType === 'member' ? '회원 예약' : '체험 예약'}
          </Button>
        </div>
      </div>
    </div>
  );
}
