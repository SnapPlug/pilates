-- member_id 컬럼이 이미 존재하므로 컬럼 추가는 건너뜀
-- ALTER TABLE reservation ADD COLUMN member_id UUID REFERENCES member(id);

-- 기존 예약 데이터에서 uid를 기반으로 member_id 설정
UPDATE reservation 
SET member_id = (
  SELECT id 
  FROM member 
  WHERE member.kakao_user_id = reservation.uid
)
WHERE uid IS NOT NULL AND member_id IS NULL;

-- member_id가 설정된 예약들의 uid를 NULL로 설정 (중복 방지)
UPDATE reservation 
SET uid = NULL 
WHERE member_id IS NOT NULL;

-- 인덱스 추가 (성능 향상) - 이미 존재하면 무시됨
CREATE INDEX IF NOT EXISTS idx_reservation_member_id ON reservation(member_id);
CREATE INDEX IF NOT EXISTS idx_reservation_guest ON reservation(member_id) WHERE member_id IS NULL;
