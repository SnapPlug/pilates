-- membership_history 테이블에서 최신 회원권 정보를 조회하는 함수들

-- 1. 특정 회원의 최신 회원권 정보 조회 함수
CREATE OR REPLACE FUNCTION get_latest_membership_info(member_uuid UUID)
RETURNS TABLE (
    membership_status TEXT,
    remaining_sessions INTEGER,
    expires_at DATE,
    membership_type VARCHAR(100),
    start_date DATE,
    total_sessions INTEGER,
    used_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mh.status::TEXT,
        mh.remaining_sessions,
        mh.end_date,
        mh.membership_type,
        mh.start_date,
        mh.total_sessions,
        mh.used_sessions
    FROM membership_history mh
    WHERE mh.member_id = member_uuid
    ORDER BY mh.created_at DESC, mh.id DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. 모든 회원의 최신 회원권 정보 조회 함수
CREATE OR REPLACE FUNCTION get_all_members_latest_membership()
RETURNS TABLE (
    member_id UUID,
    membership_status TEXT,
    remaining_sessions INTEGER,
    expires_at DATE,
    membership_type VARCHAR(100),
    start_date DATE,
    total_sessions INTEGER,
    used_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (mh.member_id)
        mh.member_id,
        mh.status::TEXT,
        mh.remaining_sessions,
        mh.end_date,
        mh.membership_type,
        mh.start_date,
        mh.total_sessions,
        mh.used_sessions
    FROM membership_history mh
    ORDER BY mh.member_id, mh.created_at DESC, mh.id DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. 회원권 상태 자동 계산 함수 (만료일과 잔여횟수 기반)
CREATE OR REPLACE FUNCTION calculate_membership_status(
    p_expires_at DATE,
    p_remaining_sessions INTEGER
)
RETURNS TEXT AS $$
BEGIN
    -- 만료일이 지났거나 잔여횟수가 0이면 '만료'
    IF p_expires_at < CURRENT_DATE OR p_remaining_sessions <= 0 THEN
        RETURN '만료';
    -- 잔여횟수가 있고 만료일이 지나지 않았으면 '활성'
    ELSIF p_remaining_sessions > 0 AND p_expires_at >= CURRENT_DATE THEN
        RETURN '활성';
    -- 그 외의 경우
    ELSE
        RETURN '미입력';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. 함수 권한 설정
GRANT EXECUTE ON FUNCTION get_latest_membership_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_members_latest_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_membership_status(DATE, INTEGER) TO authenticated;
