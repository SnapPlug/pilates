-- kakao_user_id 컬럼 확인
-- 1. 컬럼 존재 여부 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'member' 
  AND column_name IN ('kakao_id', 'kakao_user_id')
ORDER BY column_name;

-- 2. member 테이블의 kakao_user_id 데이터 확인
SELECT 
  id,
  name,
  phone,
  kakao_id,
  kakao_user_id,
  created_at
FROM public.member 
ORDER BY created_at DESC;

-- 3. reservation 테이블의 uid 데이터 확인
SELECT 
  id,
  name,
  phone,
  uid,
  created_at
FROM public.reservation 
ORDER BY created_at DESC;

-- 4. 정해성 회원의 상세 정보
SELECT 
  id,
  name,
  phone,
  kakao_id,
  kakao_user_id,
  created_at
FROM public.member 
WHERE name = '정해성' OR phone = '01049419331';

-- 5. 정해성 회원의 예약 정보
SELECT 
  id,
  name,
  phone,
  uid,
  created_at
FROM public.reservation 
WHERE name = '정해성' OR phone = '01049419331';
