-- membership_history 테이블의 membership_type 제약 조건 수정
-- 1단계: 기존 데이터 수정 (기존 제약 조건이 있는 상태에서)

-- 먼저 기존 데이터 확인
SELECT DISTINCT membership_type FROM membership_history ORDER BY membership_type;

-- '횟수제'로 저장된 데이터를 '10회권'으로 변경
UPDATE membership_history 
SET membership_type = '10회권' 
WHERE membership_type = '횟수제';

-- 변경된 데이터 확인
SELECT DISTINCT membership_type FROM membership_history ORDER BY membership_type;

-- 2단계: 기존 제약 조건 삭제
ALTER TABLE membership_history 
DROP CONSTRAINT IF EXISTS membership_history_membership_type_check;

-- 3단계: 새로운 제약 조건 추가 (10회권, 20회권, 50회권 허용)
ALTER TABLE membership_history 
ADD CONSTRAINT membership_history_membership_type_check 
CHECK (membership_type IN ('10회권', '20회권', '50회권'));

-- 4단계: 제약 조건이 제대로 적용되었는지 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c'
    AND conname = 'membership_history_membership_type_check';

-- 5단계: 최종 데이터 상태 확인
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;
