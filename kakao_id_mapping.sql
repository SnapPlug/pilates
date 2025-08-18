-- kakao_id 매핑을 위한 SQL 스크립트

-- 1. member 테이블에 kakao_user_id 컬럼 추가 (기존 kakao_id 대체)
ALTER TABLE public.member 
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- 2. reservation 테이블에 kakao_user_id 컬럼 추가
ALTER TABLE public.reservation 
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_kakao_user_id ON public.member(kakao_user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_kakao_user_id ON public.reservation(kakao_user_id);

-- 4. kakao_user_id로 회원을 찾는 함수
CREATE OR REPLACE FUNCTION find_member_by_kakao_id(kakao_user_id_param TEXT)
RETURNS TABLE(
    member_id UUID,
    name TEXT,
    phone TEXT,
    membership_status TEXT,
    remaining_sessions INTEGER,
    expires_at DATE,
    points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.phone,
        m.membership_status,
        m.remaining_sessions,
        m.expires_at,
        m.points
    FROM public.member m
    WHERE m.kakao_user_id = kakao_user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 5. kakao_user_id로 예약을 찾는 함수
CREATE OR REPLACE FUNCTION find_reservations_by_kakao_id(kakao_user_id_param TEXT)
RETURNS TABLE(
    reservation_id UUID,
    member_id UUID,
    member_name TEXT,
    class_id UUID,
    class_name TEXT,
    class_date DATE,
    class_time TIME,
    instructor_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.member_id,
        m.name as member_name,
        r.class_id,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        i.name as instructor_name,
        r.status,
        r.created_at
    FROM public.reservation r
    LEFT JOIN public.member m ON r.member_id = m.id
    LEFT JOIN public.class c ON r.class_id = c.id
    LEFT JOIN public.instructor i ON c.instructor_id = i.id
    WHERE r.kakao_user_id = kakao_user_id_param
    ORDER BY c.date DESC, c.time DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 회원의 kakao_user_id를 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_member_kakao_id(
    member_id_param UUID,
    kakao_user_id_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.member 
    SET kakao_user_id = kakao_user_id_param
    WHERE id = member_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. 예약의 kakao_user_id를 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_reservation_kakao_id(
    reservation_id_param UUID,
    kakao_user_id_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.reservation 
    SET kakao_user_id = kakao_user_id_param
    WHERE id = reservation_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. kakao_user_id로 회원과 예약을 함께 조회하는 함수
CREATE OR REPLACE FUNCTION get_member_with_reservations(kakao_user_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'member', (
            SELECT json_build_object(
                'id', m.id,
                'name', m.name,
                'phone', m.phone,
                'membership_status', m.membership_status,
                'remaining_sessions', m.remaining_sessions,
                'expires_at', m.expires_at,
                'points', m.points,
                'kakao_user_id', m.kakao_user_id
            )
            FROM public.member m
            WHERE m.kakao_user_id = kakao_user_id_param
        ),
        'reservations', (
            SELECT json_agg(
                json_build_object(
                    'id', r.id,
                    'class_name', c.name,
                    'class_date', c.date,
                    'class_time', c.time,
                    'instructor_name', i.name,
                    'status', r.status,
                    'created_at', r.created_at
                )
            )
            FROM public.reservation r
            LEFT JOIN public.class c ON r.class_id = c.id
            LEFT JOIN public.instructor i ON c.instructor_id = i.id
            WHERE r.kakao_user_id = kakao_user_id_param
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. 예약 생성 시 자동으로 kakao_user_id를 설정하는 트리거 함수
CREATE OR REPLACE FUNCTION set_reservation_kakao_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- member_id가 있고 kakao_user_id가 없는 경우, member 테이블에서 가져옴
    IF NEW.member_id IS NOT NULL AND NEW.kakao_user_id IS NULL THEN
        SELECT kakao_user_id INTO NEW.kakao_user_id
        FROM public.member
        WHERE id = NEW.member_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_reservation_kakao_user_id ON public.reservation;
CREATE TRIGGER trigger_set_reservation_kakao_user_id
    BEFORE INSERT ON public.reservation
    FOR EACH ROW
    EXECUTE FUNCTION set_reservation_kakao_user_id();

-- 11. 기존 데이터 마이그레이션 (선택사항)
-- 기존 예약 데이터에 kakao_user_id 설정
UPDATE public.reservation r
SET kakao_user_id = m.kakao_user_id
FROM public.member m
WHERE r.member_id = m.id 
  AND r.kakao_user_id IS NULL 
  AND m.kakao_user_id IS NOT NULL;

-- 12. 확인용 쿼리들
-- kakao_user_id가 설정된 회원 수 확인
SELECT 
    COUNT(*) as total_members,
    COUNT(kakao_user_id) as mapped_members,
    COUNT(*) - COUNT(kakao_user_id) as unmapped_members
FROM public.member;

-- kakao_user_id가 설정된 예약 수 확인
SELECT 
    COUNT(*) as total_reservations,
    COUNT(kakao_user_id) as mapped_reservations,
    COUNT(*) - COUNT(kakao_user_id) as unmapped_reservations
FROM public.reservation;

-- 매핑된 회원과 예약 샘플 조회
SELECT 
    m.name as member_name,
    m.kakao_user_id,
    COUNT(r.id) as reservation_count
FROM public.member m
LEFT JOIN public.reservation r ON m.id = r.member_id
WHERE m.kakao_user_id IS NOT NULL
GROUP BY m.id, m.name, m.kakao_user_id
ORDER BY reservation_count DESC
LIMIT 10;
