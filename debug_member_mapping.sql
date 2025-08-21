-- 이소미 회원 정보 확인
SELECT id, name, phone, kakao_user_id, created_at 
FROM member 
WHERE name = '이소미' OR name LIKE '%이소미%';

-- 이소미 관련 예약 데이터 확인
SELECT r.id, r.name, r.phone, r.uid, r.member_id, r.created_at,
       m.name as member_name, m.kakao_user_id
FROM reservation r
LEFT JOIN member m ON r.member_id = m.id
WHERE r.name = '이소미' OR r.name LIKE '%이소미%'
ORDER BY r.created_at DESC;

-- 전체 예약 데이터에서 member_id가 null인 것들 확인
SELECT r.id, r.name, r.phone, r.uid, r.member_id, r.created_at
FROM reservation r
WHERE r.member_id IS NULL
ORDER BY r.created_at DESC
LIMIT 10;

-- member_id가 설정되어야 하는데 null인 예약들 확인
SELECT r.id, r.name, r.phone, r.uid, r.member_id, r.created_at,
       m.id as matching_member_id, m.name as matching_member_name
FROM reservation r
LEFT JOIN member m ON (m.name = r.name AND m.phone = r.phone)
WHERE r.member_id IS NULL 
  AND m.id IS NOT NULL
ORDER BY r.created_at DESC;
