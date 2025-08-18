-- member 테이블에 사용자 식별키 컬럼 추가
-- 카카오챗봇 연동을 위한 필드들

-- 카카오톡 ID 컬럼 추가
ALTER TABLE member 
ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(100);

-- 사용자 식별키 컬럼 추가 (전화번호, 이메일 등)
ALTER TABLE member 
ADD COLUMN IF NOT EXISTS user_identifier VARCHAR(100);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_member_kakao_id ON member(kakao_id);
CREATE INDEX IF NOT EXISTS idx_member_user_identifier ON member(user_identifier);

-- 기존 데이터에 대한 샘플 식별키 설정 (선택사항)
-- UPDATE member 
-- SET kakao_id = CONCAT('kakao_', id),
--     user_identifier = phone
-- WHERE kakao_id IS NULL AND user_identifier IS NULL;

-- 유니크 제약조건 (선택사항 - 중복 방지)
-- ALTER TABLE member 
-- ADD CONSTRAINT unique_kakao_id UNIQUE (kakao_id);

-- ALTER TABLE member 
-- ADD CONSTRAINT unique_user_identifier UNIQUE (user_identifier);

-- RLS 정책 업데이트 (필요한 경우)
-- 기존 정책이 있다면 그대로 유지, 없다면 새로 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member' 
    AND policyname = '관리자는 모든 회원 정보에 접근 가능'
  ) THEN
    CREATE POLICY "관리자는 모든 회원 정보에 접근 가능" ON member
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'member' 
ORDER BY ordinal_position;
