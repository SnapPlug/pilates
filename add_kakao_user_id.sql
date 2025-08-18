-- member 테이블에 kakao_user_id 컬럼 추가
ALTER TABLE public.member 
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_kakao_user_id ON public.member(kakao_user_id);

-- 확인용 쿼리
SELECT 
    COUNT(*) as total_members,
    COUNT(kakao_user_id) as mapped_members,
    COUNT(*) - COUNT(kakao_user_id) as unmapped_members
FROM public.member;
