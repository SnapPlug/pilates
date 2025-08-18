import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('받은 데이터:', body);
    
    // UUID 형식 검증
    function isValidUUID(uuid: string) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    }
    
    // 각 필드 검증
    const validationResults: Record<string, {
      value: string;
      isUUID: boolean;
      length: number;
      format: string;
    }> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.length > 20) {
        validationResults[key] = {
          value: value,
          isUUID: isValidUUID(value),
          length: value.length,
          format: value.includes('-') ? 'with-dashes' : 'no-dashes'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      validation: validationResults,
      message: 'UUID 검증 완료'
    });
    
  } catch (error) {
    console.error('UUID 디버그 오류:', error);
    return NextResponse.json(
      { error: '디버그 중 오류 발생' },
      { status: 500 }
    );
  }
}
