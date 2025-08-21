import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * 회원권 정보 삭제 API
 * Service role key를 사용하여 RLS 정책을 우회하고 직접 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { membershipId } = body;

    console.log('[API] 회원권 삭제 요청:', { membershipId });

    // 입력 검증
    if (!membershipId) {
      return NextResponse.json(
        { error: 'membershipId가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[API] 삭제 대상 ID:', membershipId);

    // supabaseAdmin을 사용하여 RLS 우회
    const { data, error } = await supabaseAdmin
      .from('membership_history')
      .delete()
      .eq('id', membershipId)
      .select();

    console.log('[API] Supabase 응답:', { data, error });

    if (error) {
      console.error('[API] Supabase 오류:', error);
      return NextResponse.json(
        { error: '회원권 정보 삭제 중 오류가 발생했습니다.', details: error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn('[API] 삭제된 레코드가 없습니다.');
      return NextResponse.json(
        { error: '삭제할 회원권 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('[API] 회원권 삭제 성공:', data[0]);

    return NextResponse.json({
      success: true,
      data: data[0],
      message: '회원권 정보가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('[API] 예상치 못한 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error },
      { status: 500 }
    );
  }
}
