-- kakao_user_id 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_member_kakao_user_id(
    member_id UUID,
    kakao_user_id TEXT
)
RETURNS TABLE(
    id UUID,
    kakao_user_id TEXT
) AS $$
BEGIN
    -- member 테이블에서 kakao_user_id 업데이트
    UPDATE public.member 
    SET kakao_user_id = update_member_kakao_user_id.kakao_user_id
    WHERE id = update_member_kakao_user_id.member_id;
    
    -- 업데이트된 레코드 반환
    RETURN QUERY
    SELECT m.id, m.kakao_user_id
    FROM public.member m
    WHERE m.id = update_member_kakao_user_id.member_id;
    
    -- 업데이트된 행이 없으면 예외 발생
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member with id % not found', member_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수에 대한 RLS 정책 설정
GRANT EXECUTE ON FUNCTION update_member_kakao_user_id(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_member_kakao_user_id(UUID, TEXT) TO authenticated;
