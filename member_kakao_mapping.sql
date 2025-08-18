-- 카카오 사용자 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS public.kakao_user_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
    kakao_user_id TEXT NOT NULL UNIQUE,
    mapping_status TEXT DEFAULT 'pending' CHECK (mapping_status IN ('pending', 'verified', 'expired')),
    verification_code TEXT, -- 4자리 인증 코드
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- member 테이블에 kakao_user_id 컬럼 추가 (기존 kakao_id 대체)
ALTER TABLE public.member 
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kakao_user_mapping_kakao_user_id ON public.kakao_user_mapping(kakao_user_id);
CREATE INDEX IF NOT EXISTS idx_kakao_user_mapping_member_id ON public.kakao_user_mapping(member_id);
CREATE INDEX IF NOT EXISTS idx_kakao_user_mapping_status ON public.kakao_user_mapping(mapping_status);
CREATE INDEX IF NOT EXISTS idx_member_kakao_user_id ON public.member(kakao_user_id);

-- RLS 정책 설정
DROP POLICY IF EXISTS "카카오 사용자 매핑은 모든 사용자가 읽기 가능" ON public.kakao_user_mapping;
CREATE POLICY "카카오 사용자 매핑은 모든 사용자가 읽기 가능" ON public.kakao_user_mapping
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "카카오 사용자 매핑은 인증된 사용자가 수정 가능" ON public.kakao_user_mapping;
CREATE POLICY "카카오 사용자 매핑은 인증된 사용자가 수정 가능" ON public.kakao_user_mapping
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "카카오 사용자 매핑은 인증된 사용자가 삽입 가능" ON public.kakao_user_mapping;
CREATE POLICY "카카오 사용자 매핑은 인증된 사용자가 삽입 가능" ON public.kakao_user_mapping
    FOR INSERT WITH CHECK (true);

-- 매핑 상태 업데이트 함수
CREATE OR REPLACE FUNCTION update_member_kakao_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- kakao_user_mapping이 verified 상태로 변경되면 member 테이블도 업데이트
    IF NEW.mapping_status = 'verified' AND OLD.mapping_status != 'verified' THEN
        UPDATE public.member 
        SET kakao_user_id = NEW.kakao_user_id
        WHERE id = NEW.member_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_member_kakao_user_id ON public.kakao_user_mapping;
CREATE TRIGGER trigger_update_member_kakao_user_id
    AFTER UPDATE ON public.kakao_user_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_member_kakao_user_id();

-- 인증 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 매핑 생성 함수
CREATE OR REPLACE FUNCTION create_kakao_mapping(member_uuid UUID)
RETURNS TABLE(mapping_id UUID, verification_code TEXT) AS $$
DECLARE
    new_mapping_id UUID;
    new_verification_code TEXT;
BEGIN
    -- 기존 pending 상태의 매핑이 있으면 삭제
    DELETE FROM public.kakao_user_mapping 
    WHERE member_id = member_uuid AND mapping_status = 'pending';
    
    -- 새로운 매핑 생성
    new_verification_code := generate_verification_code();
    
    INSERT INTO public.kakao_user_mapping (
        member_id, 
        verification_code, 
        verification_expires_at
    ) VALUES (
        member_uuid,
        new_verification_code,
        NOW() + INTERVAL '10 minutes'
    ) RETURNING id INTO new_mapping_id;
    
    RETURN QUERY SELECT new_mapping_id, new_verification_code;
END;
$$ LANGUAGE plpgsql;
