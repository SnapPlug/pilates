-- member 테이블 RLS 정책 수정

-- 1. 기존 RLS 정책 확인 및 제거 (필요시)
DROP POLICY IF EXISTS "Users can view their own member data" ON member;
DROP POLICY IF EXISTS "Users can insert their own member data" ON member;
DROP POLICY IF EXISTS "Users can update their own member data" ON member;
DROP POLICY IF EXISTS "Users can delete their own member data" ON member;

-- 2. 새로운 RLS 정책 생성 (모든 인증된 사용자에게 권한 부여)
-- SELECT 권한
CREATE POLICY "Allow authenticated users to view member data" 
ON member FOR SELECT 
TO authenticated 
USING (true);

-- INSERT 권한
CREATE POLICY "Allow authenticated users to insert member data" 
ON member FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE 권한
CREATE POLICY "Allow authenticated users to update member data" 
ON member FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- DELETE 권한
CREATE POLICY "Allow authenticated users to delete member data" 
ON member FOR DELETE 
TO authenticated 
USING (true);

-- 3. RLS 활성화 확인
ALTER TABLE member ENABLE ROW LEVEL SECURITY;

-- 4. 테스트 쿼리 (권한 확인용)
SELECT 'Member table RLS policies updated successfully' as status;

-- 5. 현재 member 테이블 상태 확인
SELECT 
  id,
  name,
  gender,
  age,
  phone,
  registered_at,
  points,
  memo,
  kakao_user_id,
  updated_at
FROM member 
WHERE id = '59f073d1-48bf-462e-a144-a879693b9013';
