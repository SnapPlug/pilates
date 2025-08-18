-- member 테이블에 is_temp 컬럼 추가
-- 이 스크립트는 idempotent하게 작성되어 여러 번 실행해도 안전합니다.

-- 1. is_temp 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'member' 
        AND column_name = 'is_temp'
    ) THEN
        ALTER TABLE public.member ADD COLUMN is_temp BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. is_temp 컬럼에 인덱스 추가 (없는 경우에만)
CREATE INDEX IF NOT EXISTS idx_member_is_temp ON public.member(is_temp);

-- 3. 결과 확인
SELECT 
    'is_temp 컬럼 추가 완료' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member' 
AND column_name = 'is_temp';
