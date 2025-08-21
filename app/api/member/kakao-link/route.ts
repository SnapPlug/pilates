import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getDefaultKakaoBotId, generateCenterKakaoLink } from '@/lib/centerConfig';

// 카카오챗봇 링크 생성
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const member_id = searchParams.get('member_id');
    const phone = searchParams.get('phone');
    
    if (!member_id && !phone) {
      return NextResponse.json(
        { error: 'member_id 또는 phone이 필요합니다.' },
        { status: 400 }
      );
    }

    let memberData;
    
    if (member_id) {
      const { data, error } = await supabase
        .from('member')
        .select('id, name, phone')
        .eq('id', member_id)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: '회원을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      memberData = data;
    } else {
      const { data, error } = await supabase
        .from('member')
        .select('id, name, phone')
        .eq('phone', phone || '')
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: '회원을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      memberData = data;
    }

    // 센터별 카카오봇 ID 사용 (기본값 fallback)
    const kakaoBotId = await getDefaultKakaoBotId();
    const kakaoLink = `https://pf.kakao.com/${kakaoBotId}/chat?member_id=${memberData.id}&action=first_access`;

    return NextResponse.json({
      success: true,
      member: memberData,
      kakao_link: kakaoLink
    });

  } catch (error) {
    console.error('카카오 링크 생성 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카카오챗봇 설정 업데이트
export async function POST(request: NextRequest) {
  try {
    const { kakao_chatbot_id, custom_domain } = await request.json();
    
    // 여기서는 간단한 응답만 반환
    // 실제로는 설정을 저장하는 로직을 구현할 수 있습니다
    return NextResponse.json({
      success: true,
      config: {
        kakao_chatbot_id: kakao_chatbot_id || process.env.NEXT_PUBLIC_KAKAO_BOT_ID,
        custom_domain: custom_domain || null,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('카카오 설정 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
