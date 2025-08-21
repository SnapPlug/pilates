-- member 테이블 스키마 확인

-- 1. member 테이블의 모든 컬럼 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'member' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. member 테이블의 제약조건 확인
SELECT 
  constraint_name,
  constraint_type,
  column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'member' 
  AND tc.table_schema = 'public';

-- 3. member 테이블의 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'member' 
  AND schemaname = 'public';

-- 4. 샘플 데이터 확인 (최근 5개)
SELECT *
FROM member 
ORDER BY created_at DESC 
LIMIT 5;
