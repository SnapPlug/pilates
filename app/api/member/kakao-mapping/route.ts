import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  createKakaoMapping, 
  completeKakaoMapping, 
  getMemberByKakaoUserId,
  getMemberMappingStatus 
} from '@/lib/kakaoMapping';

// 매핑 생성 (관리자가 회원 등록 후 호출)
export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 매핑 상태 확인
    const mappingStatus = await getMemberMappingStatus(memberId);
    
    if (mappingStatus.isMapped) {
      return NextResponse.json({
        success: true,
        message: '이미 매핑이 완료된 회원입니다.',
        kakaoUserId: mappingStatus.kakaoUserId
      });
    }

    // 새로운 매핑 생성
    const { mappingId, verificationCode } = await createKakaoMapping(memberId);

    return NextResponse.json({
      success: true,
      mappingId,
      verificationCode,
      message: '매핑이 생성되었습니다. 인증 코드를 회원에게 전달하세요.'
    });

  } catch (error) {
    console.error('카카오 매핑 생성 오류:', error);
    return NextResponse.json(
      { error: '매핑 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 매핑 완료 (카카오챗봇에서 사용자가 인증 코드 입력 시)
export async function PUT(request: NextRequest) {
  try {
    const { memberId, kakaoUserId, verificationCode } = await request.json();

    if (!memberId || !kakaoUserId || !verificationCode) {
      return NextResponse.json(
        { error: '회원 ID, 카카오 사용자 ID, 인증 코드가 모두 필요합니다.' },
        { status: 400 }
      );
    }

    // 매핑 완료
    const success = await completeKakaoMapping(memberId, kakaoUserId, verificationCode);

    if (!success) {
      return NextResponse.json(
        { error: '인증 코드가 올바르지 않거나 만료되었습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '카카오 계정이 성공적으로 연결되었습니다!'
    });

  } catch (error) {
    console.error('카카오 매핑 완료 오류:', error);
    return NextResponse.json(
      { error: '매핑 완료 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카카오 사용자 ID로 회원 조회 (웹훅에서 사용)
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

    // 카카오 사용자 ID로 회원 조회
    const member = await getMemberByKakaoUserId(kakaoUserId);

    if (!member) {
      return NextResponse.json(
        { error: '매핑된 회원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        kakao_user_id: member.kakao_user_id
      }
    });

  } catch (error) {
    console.error('카카오 사용자로 회원 조회 오류:', error);
    return NextResponse.json(
      { error: '회원 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
