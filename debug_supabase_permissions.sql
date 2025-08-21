-- Supabase 권한 및 RLS 정책 디버깅 스크립트

-- 1. 현재 사용자 및 역할 확인
SELECT 
  current_user as current_user,
  session_user as session_user,
  current_role as current_role;

-- 2. membership_history 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'membership_history';

-- 3. membership_history 테이블 권한 확인
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'membership_history';

-- 4. RLS 활성화 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'membership_history';

-- 5. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'membership_history'
ORDER BY ordinal_position;

-- 6. 특정 레코드 존재 확인 (로그에서 본 ID)
SELECT 
  id,
  member_id,
  membership_type,
  start_date,
  end_date,
  total_sessions,
  remaining_sessions,
  status,
  notes,
  created_at,
  updated_at
FROM membership_history 
WHERE id = '5d69fed2-2e00-4d14-8e49-8243c0cf9644';

-- 7. 해당 member_id의 모든 membership_history 확인
SELECT 
  id,
  membership_type,
  start_date,
  end_date,
  total_sessions,
  remaining_sessions,
  status,
  created_at,
  updated_at
FROM membership_history 
WHERE member_id = '59f073d1-48bf-462e-a144-a879693b9013'
ORDER BY created_at DESC;
