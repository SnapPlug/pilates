-- kakao_id 컬럼을 완전히 삭제하고 TEXT 타입으로 다시 생성
-- 이 스크립트는 기존 kakao_id 컬럼을 제거하고 새로 생성합니다.

-- 1. 기존 kakao_id 컬럼 삭제
ALTER TABLE public.member DROP COLUMN IF EXISTS kakao_id;

-- 2. kakao_id 컬럼을 TEXT 타입으로 새로 생성
ALTER TABLE public.member ADD COLUMN kakao_id TEXT;

-- 3. kakao_id 컬럼에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_kakao_id ON public.member(kakao_id);

-- 4. 결과 확인
SELECT 
    'kakao_id 컬럼 재생성 완료' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member' 
AND column_name = 'kakao_id';
