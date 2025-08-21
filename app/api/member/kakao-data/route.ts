import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

// kakao_user_id로 회원과 예약 데이터 조회
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

    // 데이터베이스 함수 호출
    const { data, error } = await supabaseClient
      .rpc('get_member_with_reservations', {
        kakao_user_id_param: kakaoUserId
      });

    if (error) {
      console.error('회원 데이터 조회 오류:', error);
      return NextResponse.json(
        { error: '회원 데이터 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!data || !(data as any).member) {
      return NextResponse.json({
        success: false,
        message: '매핑된 회원을 찾을 수 없습니다.',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('회원 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '회원 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// kakao_user_id 매핑 업데이트
export async function POST(request: NextRequest) {
  try {
    const { memberId, kakaoUserId, reservationId } = await request.json();

    if (!kakaoUserId) {
      return NextResponse.json(
        { error: '카카오 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 회원 매핑 업데이트
    if (memberId) {
      const { data: memberResult, error: memberError } = await supabaseClient
        .rpc('update_member_kakao_id', {
          member_id_param: memberId,
          kakao_user_id_param: kakaoUserId
        });

      if (memberError) {
        console.error('회원 매핑 업데이트 오류:', memberError);
        return NextResponse.json(
          { error: '회원 매핑 업데이트 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }

    // 예약 매핑 업데이트
    if (reservationId) {
      const { data: reservationResult, error: reservationError } = await supabaseClient
        .rpc('update_reservation_kakao_id', {
          reservation_id_param: reservationId,
          kakao_user_id_param: kakaoUserId
        });

      if (reservationError) {
        console.error('예약 매핑 업데이트 오류:', reservationError);
        return NextResponse.json(
          { error: '예약 매핑 업데이트 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '카카오 사용자 ID 매핑이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('매핑 업데이트 오류:', error);
    return NextResponse.json(
      { error: '매핑 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
