import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { reservation_id } = await request.json();

    if (!reservation_id) {
      return NextResponse.json(
        { error: 'reservation_id가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('API: 예약 취소 시작', { reservation_id });

    // 먼저 예약이 존재하는지 확인
    const { data: existingReservation, error: checkError } = await supabaseClient
      .from('reservation')
      .select('id, name, phone')
      .eq('id', reservation_id)
      .single();

    if (checkError) {
      console.error('예약 존재 확인 오류:', checkError);
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('삭제할 예약 정보:', existingReservation);

    // 예약 삭제
    const { data, error } = await supabaseClient
      .from('reservation')
      .delete()
      .eq('id', reservation_id)
      .select('id, name, phone');

    if (error) {
      console.error('예약 취소 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: '예약 취소 중 오류가 발생했습니다.', details: error.message },
        { status: 500 }
      );
    }

    console.log('예약 취소 성공:', data);
    console.log('삭제된 예약 수:', data?.length || 0);

    return NextResponse.json({
      success: true,
      message: '예약이 성공적으로 취소되었습니다.',
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
