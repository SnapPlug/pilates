import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { reservation_id, attendance_status, checked_by } = await request.json();

    if (!reservation_id || !attendance_status) {
      return NextResponse.json(
        { error: 'reservation_id와 attendance_status가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!['pending', 'attended', 'absent'].includes(attendance_status)) {
      return NextResponse.json(
        { error: '유효하지 않은 출석 상태입니다.' },
        { status: 400 }
      );
    }

    console.log('출석 상태 업데이트 시작:', { reservation_id, attendance_status, checked_by });

    // 예약 정보 조회 (존재 여부 확인)
    const { data: reservationData, error: checkError } = await supabaseClient
      .from('reservation')
      .select('id, name, class_id')
      .eq('id', reservation_id)
      .single();

    if (checkError || !reservationData) {
      console.error('예약 조회 오류:', checkError);
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 출석 상태 업데이트
    const { data, error } = await supabaseClient
      .from('reservation')
      .update({
        attendance_status: attendance_status,
        attendance_checked_at: new Date().toISOString(),
        attendance_checked_by: checked_by || 'admin'
      })
      .eq('id', reservation_id)
      .select('id, name, attendance_status, attendance_checked_at, attendance_checked_by');

    if (error) {
      console.error('출석 상태 업데이트 오류:', error);
      return NextResponse.json(
        { error: '출석 상태 업데이트 중 오류가 발생했습니다.', details: error.message },
        { status: 500 }
      );
    }

    console.log('출석 상태 업데이트 성공:', data);

    return NextResponse.json({
      success: true,
      message: '출석 상태가 성공적으로 업데이트되었습니다.',
      data: data[0]
    });

  } catch (error) {
    console.error('API: 예상치 못한 오류', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

