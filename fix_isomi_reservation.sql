-- 이소미 회원의 예약을 올바르게 수정
UPDATE reservation 
SET member_id = (
  SELECT id 
  FROM member 
  WHERE name = '이소미' AND phone = reservation.phone
)
WHERE name = '이소미' 
  AND member_id IS NULL;

-- 수정 결과 확인
SELECT r.id, r.name, r.phone, r.uid, r.member_id, r.created_at,
       m.name as member_name, m.kakao_user_id
FROM reservation r
LEFT JOIN member m ON r.member_id = m.id
WHERE r.name = '이소미'
ORDER BY r.created_at DESC;
