-- Member 테이블 생성 및 RLS 정책 설정
-- 이 스크립트는 idempotent하게 작성되어 여러 번 실행해도 안전합니다.

-- 1. Member 테이블 생성
CREATE TABLE IF NOT EXISTS public.member (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('남', '여', '기타')),
    age INTEGER CHECK (age > 0 AND age < 150),
    phone TEXT,
    membership_status TEXT NOT NULL DEFAULT '활성' CHECK (membership_status IN ('활성', '만료', '정지', '임시')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit_at TIMESTAMP WITH TIME ZONE,
    remaining_sessions INTEGER DEFAULT 0 CHECK (remaining_sessions >= 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    kakao_id TEXT,
    is_temp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_name ON public.member(name);
CREATE INDEX IF NOT EXISTS idx_member_phone ON public.member(phone);
CREATE INDEX IF NOT EXISTS idx_member_membership_status ON public.member(membership_status);
CREATE INDEX IF NOT EXISTS idx_member_kakao_id ON public.member(kakao_id);
CREATE INDEX IF NOT EXISTS idx_member_is_temp ON public.member(is_temp);

-- 3. RLS 활성화
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "모든 사용자가 member 테이블에 접근 가능" ON public.member;
DROP POLICY IF EXISTS "인증된 사용자만 member 테이블에 접근 가능" ON public.member;
DROP POLICY IF EXISTS "관리자만 member 테이블에 접근 가능" ON public.member;

-- 5. 새로운 RLS 정책 생성
-- 모든 사용자가 읽기 가능 (개발 환경용)
CREATE POLICY "모든 사용자가 member 테이블에 접근 가능" ON public.member
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. updated_at 자동 업데이트를 위한 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_member_updated_at ON public.member;
CREATE TRIGGER update_member_updated_at
    BEFORE UPDATE ON public.member
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 테스트 데이터 삽입 (선택사항)
DO $$
BEGIN
    -- 테스트 데이터가 없을 때만 삽입
    IF NOT EXISTS (SELECT 1 FROM public.member LIMIT 1) THEN
        INSERT INTO public.member (
            name, gender, age, phone, membership_status, 
            registered_at, last_visit_at, remaining_sessions, 
            expires_at, points, is_temp
        ) VALUES 
        ('김필라테스', '여', 28, '010-1234-5678', '활성', 
         NOW(), NOW(), 10, 
         NOW() + INTERVAL '30 days', 100, false),
        
        ('이요가', '여', 32, '010-2345-6789', '활성', 
         NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days', 5, 
         NOW() + INTERVAL '15 days', 50, false),
        
        ('박피트니스', '남', 35, '010-3456-7890', '활성', 
         NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day', 8, 
         NOW() + INTERVAL '45 days', 200, false),
        
        ('최헬스', '남', 29, '010-4567-8901', '정지', 
         NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', 0, 
         NOW() - INTERVAL '5 days', 0, false),
        
        ('정웰빙', '여', 41, '010-5678-9012', '만료', 
         NOW() - INTERVAL '60 days', NOW() - INTERVAL '20 days', 0, 
         NOW() - INTERVAL '15 days', 0, false);
    END IF;
END $$;

-- 9. 결과 확인
SELECT 
    'Member 테이블 생성 완료' as status,
    COUNT(*) as total_members
FROM public.member;
