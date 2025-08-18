-- kakao_user_id 매핑 상태 확인

-- 1. 전체 회원 중 매핑된 회원 수 확인
SELECT 
    COUNT(*) as total_members,
    COUNT(kakao_user_id) as mapped_members,
    COUNT(*) - COUNT(kakao_user_id) as unmapped_members,
    ROUND(COUNT(kakao_user_id) * 100.0 / COUNT(*), 2) as mapping_percentage
FROM public.member;

-- 2. 매핑된 회원 목록 (최근 10개)
SELECT 
    id,
    name,
    phone,
    kakao_user_id,
    membership_status,
    created_at
FROM public.member 
WHERE kakao_user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. 매핑되지 않은 회원 목록 (최근 10개)
SELECT 
    id,
    name,
    phone,
    membership_status,
    created_at
FROM public.member 
WHERE kakao_user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. 예약 테이블에서 kakao_user_id 확인
SELECT 
    COUNT(*) as total_reservations,
    COUNT(uid) as reservations_with_kakao_id,
    COUNT(*) - COUNT(uid) as reservations_without_kakao_id
FROM public.reservation;

-- 5. 예약과 회원 매핑 상태 확인
SELECT 
    r.id as reservation_id,
    r.name as reservation_name,
    r.phone as reservation_phone,
    r.uid as kakao_user_id,
    m.name as member_name,
    m.phone as member_phone,
    m.kakao_user_id as member_kakao_user_id,
    CASE 
        WHEN m.kakao_user_id = r.uid THEN '매핑 완료'
        WHEN m.kakao_user_id IS NULL THEN '회원 미매핑'
        WHEN r.uid IS NULL THEN '예약에 kakao_id 없음'
        ELSE '매핑 불일치'
    END as mapping_status
FROM public.reservation r
LEFT JOIN public.member m ON r.name = m.name AND r.phone = m.phone
ORDER BY r.created_at DESC
LIMIT 20;
