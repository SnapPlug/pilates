import { createClient } from "@supabase/supabase-js";

// 환경변수 가져오기 (NEXT_PUBLIC_ 접두사가 있는 변수만 클라이언트에서 접근 가능)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// SUPABASE_SERVICE_ROLE_KEY는 서버에서만 사용 (클라이언트에서는 접근 불가)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('환경변수 로딩 시점 확인:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceRoleKey,
  urlLength: supabaseUrl?.length || 0,
  anonKeyLength: supabaseAnonKey?.length || 0
});

// 환경변수 디버그 로그
console.log('=== Supabase 환경변수 디버그 ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '설정되지 않음');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '설정되지 않음');
console.log('SUPABASE_SERVICE_ROLE_KEY:', typeof window === 'undefined' ? (supabaseServiceRoleKey ? '설정됨' : '설정되지 않음') : '클라이언트에서는 숨김');
console.log('================================');

// 환경변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
  console.error('supabaseUrl:', supabaseUrl);
  console.error('supabaseAnonKey:', supabaseAnonKey);
}

// 전역 변수로 싱글톤 패턴 구현 (Next.js HMR 문제 해결)
declare global {
  var supabaseInstance: ReturnType<typeof createClient> | null;
  var supabaseAdminInstance: ReturnType<typeof createClient> | null;
}

// 클라이언트용 (anon key) - 전역 변수 사용
export const supabase = (() => {
  if (!global.supabaseInstance) {
    console.log('Supabase 클라이언트 생성 중...');
    console.log('생성 시 사용되는 값들:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
      supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined',
      supabaseUrlLength: supabaseUrl?.length || 0,
      supabaseAnonKeyLength: supabaseAnonKey?.length || 0
    });
    
    // 값 검증 추가
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase 클라이언트 생성 실패: 필수 값이 없습니다');
      console.error('supabaseUrl:', supabaseUrl);
      console.error('supabaseAnonKey:', supabaseAnonKey);
      throw new Error('Supabase 환경변수가 설정되지 않았습니다');
    }
    
    try {
      global.supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      console.log('Supabase 클라이언트 생성 완료');
    } catch (error) {
      console.error('Supabase 클라이언트 생성 실패:', error);
      global.supabaseInstance = null;
      throw error;
    }
  }
  return global.supabaseInstance;
})();

// 서버용 (service role key) - RLS 우회 가능
export const supabaseAdmin = (() => {
  if (typeof window === 'undefined' && !global.supabaseAdminInstance) {
    console.log('Supabase Admin 클라이언트 생성 중...');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase Admin 클라이언트 생성 실패: 필수 값이 없습니다');
      throw new Error('Supabase Admin 환경변수가 설정되지 않았습니다');
    }
    
    try {
      global.supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      console.log('Supabase Admin 클라이언트 생성 완료');
    } catch (error) {
      console.error('Supabase Admin 클라이언트 생성 실패:', error);
      global.supabaseAdminInstance = null;
      throw error;
    }
  }
  return global.supabaseAdminInstance;
})();

export const supabaseClient = supabase;






