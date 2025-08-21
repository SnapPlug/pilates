"use client";

import { useState } from "react";
import { Button } from "./button";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Array<{
    id: string;
    name: string;
    attendance_status: string;
  }>;
  onAttendanceUpdate: (reservationId: string, status: string) => Promise<void>;
  onReservationCancel?: (reservationId: string) => Promise<void>;
}

export function AttendanceModal({
  isOpen,
  onClose,
  reservations,
  onAttendanceUpdate,
  onReservationCancel
}: AttendanceModalProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAttendanceUpdate = async (reservationId: string, status: string) => {
    try {
      setUpdating(reservationId);
      await onAttendanceUpdate(reservationId, status);
    } catch (error) {
      console.error('출석 업데이트 오류:', error);
      alert('출석 상태 업데이트에 실패했습니다.');
    } finally {
      setUpdating(null);
    }
  };

  const handleReservationCancel = async (reservationId: string) => {
    if (!onReservationCancel) return;
    
    if (!confirm('정말로 이 예약을 취소하시겠습니까? 취소된 예약은 복구할 수 없습니다.')) {
      return;
    }

    try {
      setCanceling(reservationId);
      await onReservationCancel(reservationId);
    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert('예약 취소에 실패했습니다.');
    } finally {
      setCanceling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attended':
        return '출석';
      case 'absent':
        return '결석';
      default:
        return '미확인';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">출석 체크</h2>
        
        <div className="space-y-3 mb-6">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{reservation.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(reservation.attendance_status)}`}>
                  {getStatusText(reservation.attendance_status)}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAttendanceUpdate(reservation.id, 'attended')}
                  disabled={updating === reservation.id || canceling === reservation.id}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  {updating === reservation.id ? '처리 중...' : '출석'}
                </Button>
                <Button
                  onClick={() => handleAttendanceUpdate(reservation.id, 'absent')}
                  disabled={updating === reservation.id || canceling === reservation.id}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {updating === reservation.id ? '처리 중...' : '결석'}
                </Button>
                {onReservationCancel && (
                  <Button
                    onClick={() => handleReservationCancel(reservation.id)}
                    disabled={updating === reservation.id || canceling === reservation.id}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {canceling === reservation.id ? '취소 중...' : '예약취소'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

