-- member 테이블에 kakao_user_id 컬럼 추가 (기존 kakao_id 대체)
ALTER TABLE public.member 
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_kakao_user_id ON public.member(kakao_user_id);

-- 카카오 사용자 ID로 회원을 찾는 함수
CREATE OR REPLACE FUNCTION find_or_create_member_by_kakao_id(
    kakao_user_id_param TEXT,
    member_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    member_id UUID,
    name TEXT,
    phone TEXT,
    is_new_mapping BOOLEAN
) AS $$
BEGIN
    -- 이미 매핑된 회원이 있는지 확인
    IF EXISTS (SELECT 1 FROM public.member WHERE kakao_user_id = kakao_user_id_param) THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.name,
            m.phone,
            FALSE as is_new_mapping
        FROM public.member m
        WHERE m.kakao_user_id = kakao_user_id_param;
    ELSE
        -- member_id가 제공된 경우 해당 회원에 매핑
        IF member_id_param IS NOT NULL THEN
            UPDATE public.member 
            SET kakao_user_id = kakao_user_id_param
            WHERE id = member_id_param;
            
            RETURN QUERY
            SELECT 
                m.id,
                m.name,
                m.phone,
                TRUE as is_new_mapping
            FROM public.member m
            WHERE m.id = member_id_param;
        ELSE
            -- 매핑할 회원이 없는 경우 NULL 반환
            RETURN QUERY
            SELECT 
                NULL::UUID as member_id,
                NULL::TEXT as name,
                NULL::TEXT as phone,
                FALSE as is_new_mapping;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
