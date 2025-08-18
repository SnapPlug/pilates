import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

// kakao_user_id로 예약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kakaoUserId = searchParams.get('kakao_user_id');

    if (!kakaoUserId) {
      return NextResponse.json(
        { error: '카카오 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 먼저 회원 조회
    const { data: memberData, error: memberError } = await supabaseClient
      .from('member')
      .select('id, name')
      .eq('kakao_user_id', kakaoUserId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({
        success: false,
        message: '매핑된 회원을 찾을 수 없습니다.',
        data: null
      });
    }

    // 회원의 예약 조회
    const { data: reservations, error: reservationError } = await supabaseClient
      .from('reservation')
      .select(`
        id,
        class_id,
        name,
        phone,
        created_at,
        class:class_id(
          id,
          name,
          date,
          time,
          instructor:instructor_id(
            id,
            name
          )
        )
      `)
      .eq('uid', kakaoUserId)
      .order('created_at', { ascending: false });

    if (reservationError) {
      console.error('예약 조회 오류:', reservationError);
      return NextResponse.json(
        { error: '예약 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        member: memberData,
        reservations: reservations || []
      }
    });

  } catch (error) {
    console.error('예약 조회 오류:', error);
    return NextResponse.json(
      { error: '예약 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
