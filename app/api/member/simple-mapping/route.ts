import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

// 카카오 사용자 ID로 회원을 찾거나 매핑
export async function POST(request: NextRequest) {
  try {
    const { kakaoUserId, memberId } = await request.json();

    if (!kakaoUserId) {
      return NextResponse.json(
        { error: '카카오 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 데이터베이스 함수 호출
    const { data, error } = await supabaseClient
      .rpc('find_or_create_member_by_kakao_id', {
        kakao_user_id_param: kakaoUserId,
        member_id_param: memberId || null
      });

    if (error) {
      console.error('매핑 조회 오류:', error);
      return NextResponse.json(
        { error: '매핑 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const member = data?.[0];

    if (!member || !member.member_id) {
      return NextResponse.json({
        success: false,
        message: '매핑된 회원을 찾을 수 없습니다.',
        isNewMapping: false
      });
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.member_id,
        name: member.name,
        phone: member.phone
      },
      isNewMapping: member.is_new_mapping,
      message: member.is_new_mapping 
        ? '카카오 계정이 성공적으로 연결되었습니다!' 
        : '기존 회원으로 인식되었습니다.'
    });

  } catch (error) {
    console.error('카카오 매핑 오류:', error);
    return NextResponse.json(
      { error: '매핑 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카카오 사용자 ID로 회원 조회
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
      .select('id, name, phone, membership_status, remaining_sessions, expires_at, points')
      .eq('kakao_user_id', kakaoUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          message: '매핑된 회원을 찾을 수 없습니다.'
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
      member: data
    });

  } catch (error) {
    console.error('회원 조회 오류:', error);
    return NextResponse.json(
      { error: '회원 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
