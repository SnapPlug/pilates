-- 1. member 테이블의 현재 스키마 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'member' 
ORDER BY ordinal_position;

-- 2. updated_at 컬럼이 있는지 확인하고 없으면 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.member ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 3. updated_at 컬럼에 자동 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 트리거가 없으면 생성
DROP TRIGGER IF EXISTS update_member_updated_at ON public.member;
CREATE TRIGGER update_member_updated_at 
    BEFORE UPDATE ON public.member 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. kakao_user_id 컬럼이 있는지 확인하고 없으면 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member' AND column_name = 'kakao_user_id'
  ) THEN
    ALTER TABLE public.member ADD COLUMN kakao_user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_member_kakao_user_id ON public.member(kakao_user_id);
  END IF;
END $$;

-- 6. RLS 정책 확인 및 수정
-- member 테이블에 대한 UPDATE 권한 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'member';

-- 7. UPDATE 정책이 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member' AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Enable update for authenticated users" ON public.member
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 8. 테스트: 정해성 회원의 kakao_user_id 업데이트
UPDATE public.member 
SET kakao_user_id = 'test_kakao_user_id_123'
WHERE name = '정해성' AND phone = '01049419331';

-- 9. 업데이트 결과 확인
SELECT id, name, phone, kakao_user_id, updated_at
FROM public.member 
WHERE name = '정해성' AND phone = '01049419331';
