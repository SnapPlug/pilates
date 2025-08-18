-- Member 테이블에 kakao_id 컬럼 추가
-- 이 스크립트는 idempotent하게 작성되어 여러 번 실행해도 안전합니다.

-- 1. kakao_id 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'member' 
        AND column_name = 'kakao_id'
    ) THEN
        ALTER TABLE public.member ADD COLUMN kakao_id TEXT;
    END IF;
END $$;

-- 2. kakao_id 컬럼에 인덱스 추가 (없는 경우에만)
CREATE INDEX IF NOT EXISTS idx_member_kakao_id ON public.member(kakao_id);

-- 3. 결과 확인
SELECT 
    'kakao_id 컬럼 추가 완료' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member' 
AND column_name = 'kakao_id';
