-- 회원권 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS membership_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  membership_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_sessions INTEGER DEFAULT 0,
  used_sessions INTEGER DEFAULT 0,
  remaining_sessions INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT '활성' CHECK (status IN ('활성', '만료', '정지', '취소', '대기')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (이미 존재하는 경우 무시)
CREATE INDEX IF NOT EXISTS idx_membership_history_member_id ON membership_history(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_status ON membership_history(status);
CREATE INDEX IF NOT EXISTS idx_membership_history_created_at ON membership_history(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE membership_history ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "관리자는 모든 회원권 히스토리에 접근 가능" ON membership_history;

-- 관리자만 모든 데이터에 접근 가능하도록 정책 설정
CREATE POLICY "관리자는 모든 회원권 히스토리에 접근 가능" ON membership_history
  FOR ALL USING (auth.role() = 'authenticated');

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 기존 트리거 삭제 (이미 존재하는 경우)
DROP TRIGGER IF EXISTS update_membership_history_updated_at ON membership_history;

-- 트리거 생성
CREATE TRIGGER update_membership_history_updated_at
  BEFORE UPDATE ON membership_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 기존 회원 데이터를 membership_history에 연동
-- 각 회원의 현재 상태를 기반으로 기본 회원권 정보 생성
-- 이미 존재하는 데이터는 건너뛰기
DO $$
BEGIN
  -- membership_history 테이블이 존재하는지 확인
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'membership_history') THEN
    INSERT INTO membership_history (
      member_id, 
      membership_type, 
      start_date, 
      end_date, 
      total_sessions, 
      used_sessions, 
      remaining_sessions, 
      status, 
      notes
    )
    SELECT 
      m.id as member_id,
      CASE 
        WHEN m.membership_status = '활성' THEN '기존 활성 회원권'
        WHEN m.membership_status = '정지' THEN '기존 정지 회원권'
        WHEN m.membership_status = '만료' THEN '기존 만료 회원권'
        ELSE '기존 회원권'
      END as membership_type,
      COALESCE(m.registered_at, CURRENT_DATE) as start_date,
      m.expires_at as end_date,
      COALESCE(m.remaining_sessions, 0) as total_sessions,
      0 as used_sessions,
      COALESCE(m.remaining_sessions, 0) as remaining_sessions,
      CASE 
        WHEN m.expires_at IS NOT NULL AND m.expires_at < CURRENT_DATE THEN '만료'
        ELSE COALESCE(m.membership_status, '만료')
      END as status,
      '기존 회원 데이터에서 자동 생성' as notes
    FROM member m
    WHERE NOT EXISTS (
      SELECT 1 FROM membership_history mh WHERE mh.member_id = m.id
    );
    
    RAISE NOTICE '기존 회원 데이터를 membership_history에 연동 완료';
  ELSE
    RAISE NOTICE 'membership_history 테이블이 존재하지 않습니다. 테이블을 먼저 생성해주세요.';
  END IF;
END $$;

-- 만료일이 지난 회원들의 상태를 자동으로 '만료'로 업데이트
DO $$
BEGIN
  -- member 테이블 업데이트
  UPDATE member 
  SET membership_status = '만료'
  WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_DATE 
    AND membership_status != '만료';
  
  -- membership_history 테이블 업데이트
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'membership_history') THEN
    UPDATE membership_history 
    SET status = '만료'
    WHERE end_date IS NOT NULL 
      AND end_date < CURRENT_DATE 
      AND status = '활성';
    
    RAISE NOTICE '만료된 회원권 상태 업데이트 완료';
  END IF;
END $$;

-- 샘플 데이터 삽입 (선택사항 - 실제 회원 ID로 교체 필요)
-- INSERT INTO membership_history (member_id, membership_type, start_date, end_date, total_sessions, used_sessions, remaining_sessions, status, notes)
-- VALUES 
--   ('여기에_실제_회원_ID를_넣으세요', '10회권', '2024-01-01', '2024-12-31', 10, 3, 7, '활성', '샘플 회원권'),
--   ('여기에_실제_회원_ID를_넣으세요', '월회원권', '2024-02-01', '2024-02-29', 0, 0, 0, '만료', '만료된 월회원권');
