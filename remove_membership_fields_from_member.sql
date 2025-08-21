-- member 테이블에서 회원권 관련 필드 제거
-- 이 스크립트는 member 테이블에서 중복되는 회원권 정보를 제거합니다.

-- 1. 기존 데이터 백업 (선택사항)
-- CREATE TABLE member_backup AS SELECT * FROM member;

-- 2. 회원권 관련 컬럼 제거
ALTER TABLE public.member 
DROP COLUMN IF EXISTS membership_status,
DROP COLUMN IF EXISTS remaining_sessions,
DROP COLUMN IF EXISTS expires_at;

-- 3. 제거된 컬럼에 대한 인덱스도 자동으로 제거됨
-- (membership_status 인덱스는 컬럼과 함께 제거됨)

-- 4. 변경사항 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'member' 
ORDER BY ordinal_position;

-- 5. 최종 member 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'member'
ORDER BY ordinal_position;
