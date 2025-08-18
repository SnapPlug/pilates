-- kakao_id 컬럼 타입을 UUID에서 TEXT로 변경
-- 이 스크립트는 kakao_id 컬럼이 UUID 타입일 때 TEXT로 변경합니다.

-- 1. kakao_id 컬럼 타입 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member' 
AND column_name = 'kakao_id';

-- 2. kakao_id 컬럼 타입을 TEXT로 변경
ALTER TABLE public.member 
ALTER COLUMN kakao_id TYPE TEXT;

-- 3. 변경 후 확인
SELECT 
    'kakao_id 컬럼 타입 변경 완료' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member' 
AND column_name = 'kakao_id';
