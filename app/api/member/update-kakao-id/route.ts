import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { member_id, kakao_user_id } = await request.json();

    if (!member_id || !kakao_user_id) {
      return NextResponse.json(
        { error: 'member_id와 kakao_user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('API: kakao_user_id 업데이트 시작', { member_id, kakao_user_id });

    // 직접 SQL 쿼리로 업데이트 (updated_at 필드 제외)
    const { data, error } = await supabaseClient
      .from('member')
      .update({ 
        kakao_user_id: kakao_user_id 
      })
      .eq('id', member_id)
      .select('id, kakao_user_id');

    if (error) {
      console.error('API: kakao_user_id 업데이트 오류', error);
      return NextResponse.json(
        { error: '업데이트 중 오류가 발생했습니다.', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: kakao_user_id 업데이트 성공', data);

    return NextResponse.json({
      success: true,
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
