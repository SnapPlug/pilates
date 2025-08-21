import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * 회원권 정보 수정 API
 * Service role key를 사용하여 RLS 정책을 우회하고 직접 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      membershipId, 
      membership_type, 
      start_date, 
      end_date, 
      total_sessions, 
      remaining_sessions, 
      notes 
    } = body;

    console.log('[API] 회원권 수정 요청:', {
      membershipId,
      membership_type,
      start_date,
      end_date,
      total_sessions,
      remaining_sessions,
      notes
    });

    // 입력 검증
    if (!membershipId) {
      return NextResponse.json(
        { error: 'membershipId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 준비
    const updatePayload: any = {};
    
    if (membership_type) updatePayload.membership_type = membership_type;
    if (start_date) updatePayload.start_date = start_date;
    if (end_date) updatePayload.end_date = end_date;
    if (total_sessions !== undefined) updatePayload.total_sessions = total_sessions;
    if (remaining_sessions !== undefined) updatePayload.remaining_sessions = remaining_sessions;
    if (notes !== undefined) updatePayload.notes = notes;
    
    // updated_at 자동 업데이트
    updatePayload.updated_at = new Date().toISOString();

    console.log('[API] 업데이트 payload:', updatePayload);

    // supabaseAdmin을 사용하여 RLS 우회
    if (!supabaseAdmin) {
      throw new Error('Supabase Admin 클라이언트를 초기화할 수 없습니다.');
    }
    
    const { data, error } = await supabaseAdmin
      .from('membership_history')
      .update(updatePayload)
      .eq('id', membershipId)
      .select();

    console.log('[API] Supabase 응답:', { data, error });

    if (error) {
      console.error('[API] Supabase 오류:', error);
      return NextResponse.json(
        { error: '회원권 정보 업데이트 중 오류가 발생했습니다.', details: error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn('[API] 업데이트된 레코드가 없습니다.');
      return NextResponse.json(
        { error: '업데이트할 회원권 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('[API] 회원권 수정 성공:', data[0]);

    return NextResponse.json({
      success: true,
      data: data[0],
      message: '회원권 정보가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('[API] 예상치 못한 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error },
      { status: 500 }
    );
  }
}
