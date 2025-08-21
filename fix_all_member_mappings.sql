-- 모든 예약에 대해 이름과 전화번호로 member_id 매칭
UPDATE reservation 
SET member_id = (
  SELECT id 
  FROM member 
  WHERE member.name = reservation.name 
    AND member.phone = reservation.phone
)
WHERE member_id IS NULL 
  AND EXISTS (
    SELECT 1 
    FROM member 
    WHERE member.name = reservation.name 
      AND member.phone = reservation.phone
  );

-- 매칭 결과 확인
SELECT 
  COUNT(*) as total_reservations,
  COUNT(member_id) as member_reservations,
  COUNT(*) - COUNT(member_id) as guest_reservations
FROM reservation;

-- member_id가 설정된 예약들 확인
SELECT r.name, r.phone, r.member_id, m.name as member_name
FROM reservation r
JOIN member m ON r.member_id = m.id
ORDER BY r.created_at DESC
LIMIT 10;
