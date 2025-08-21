-- membership_history 테이블 RLS 정책 수정

-- 1. 기존 RLS 정책 확인 및 제거 (필요시)
DROP POLICY IF EXISTS "Users can view their own membership history" ON membership_history;
DROP POLICY IF EXISTS "Users can insert their own membership history" ON membership_history;
DROP POLICY IF EXISTS "Users can update their own membership history" ON membership_history;
DROP POLICY IF EXISTS "Users can delete their own membership history" ON membership_history;

-- 2. 새로운 RLS 정책 생성 (모든 인증된 사용자에게 권한 부여)
-- SELECT 권한
CREATE POLICY "Allow authenticated users to view membership history" 
ON membership_history FOR SELECT 
TO authenticated 
USING (true);

-- INSERT 권한
CREATE POLICY "Allow authenticated users to insert membership history" 
ON membership_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE 권한
CREATE POLICY "Allow authenticated users to update membership history" 
ON membership_history FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- DELETE 권한
CREATE POLICY "Allow authenticated users to delete membership history" 
ON membership_history FOR DELETE 
TO authenticated 
USING (true);

-- 3. RLS 활성화 확인
ALTER TABLE membership_history ENABLE ROW LEVEL SECURITY;

-- 4. 테스트 쿼리 (권한 확인용)
SELECT 'RLS policies updated successfully' as status;

-- 5. 업데이트 테스트 (실제 레코드로)
-- 주의: 실제 ID를 사용하여 테스트
UPDATE membership_history 
SET notes = 'RLS 테스트 - ' || CURRENT_TIMESTAMP
WHERE id = '5d69fed2-2e00-4d14-8e49-8243c0cf9644';

-- 업데이트 결과 확인
SELECT 
  id,
  notes,
  updated_at
FROM membership_history 
WHERE id = '5d69fed2-2e00-4d14-8e49-8243c0cf9644';
