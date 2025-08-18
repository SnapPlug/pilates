import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

// kakao_user_id로 회원 조회
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

    // 회원 조회
    const { data, error } = await supabaseClient
      .from('member')
      .select(`
        id,
        name,
        phone,
        gender,
        age,
        membership_status,
        remaining_sessions,
        expires_at,
        points,
        registered_at,
        last_visit_at,
        kakao_user_id
      `)
      .eq('kakao_user_id', kakaoUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          message: '매핑된 회원을 찾을 수 없습니다.',
          data: null
        });
      }
      console.error('회원 조회 오류:', error);
      return NextResponse.json(
        { error: '회원 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('회원 조회 오류:', error);
    return NextResponse.json(
      { error: '회원 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
