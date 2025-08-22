-- 안전한 방법으로 membership_history 테이블 제약 조건 수정
-- 이 스크립트는 단계별로 실행하여 문제를 정확히 파악합니다.

-- 1단계: 현재 상태 확인 (실행 후 결과 확인)
SELECT '=== 1단계: 현재 membership_type 값들 ===' as step;
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- 2단계: 현재 제약 조건 확인 (실행 후 결과 확인)
SELECT '=== 2단계: 현재 제약 조건 ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c';

-- 3단계: 문제가 될 수 있는 데이터 확인 (실행 후 결과 확인)
SELECT '=== 3단계: 문제가 될 수 있는 데이터 ===' as step;
SELECT 
    id,
    membership_type,
    created_at
FROM membership_history 
WHERE membership_type NOT IN ('10회권', '20회권', '50회권', '횟수제')
   OR membership_type IS NULL
   OR membership_type = '';

-- 4단계: 임시로 제약 조건 비활성화 (주의: 이 단계는 신중하게 실행)
-- SELECT '=== 4단계: 제약 조건 비활성화 ===' as step;
-- ALTER TABLE membership_history DISABLE TRIGGER ALL;

-- 5단계: 데이터 정리 (실행 후 결과 확인)
SELECT '=== 5단계: 데이터 정리 시작 ===' as step;

-- '횟수제'를 '10회권'으로 변경
UPDATE membership_history 
SET membership_type = '10회권' 
WHERE membership_type = '횟수제';

-- NULL 값을 '10회권'으로 변경
UPDATE membership_history 
SET membership_type = '10회권' 
WHERE membership_type IS NULL;

-- 빈 문자열을 '10회권'으로 변경
UPDATE membership_history 
SET membership_type = '10회권' 
WHERE membership_type = '';

-- 6단계: 정리된 데이터 확인 (실행 후 결과 확인)
SELECT '=== 6단계: 정리된 데이터 확인 ===' as step;
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- 7단계: 제약 조건 재활성화 (4단계를 실행했다면)
-- SELECT '=== 7단계: 제약 조건 재활성화 ===' as step;
-- ALTER TABLE membership_history ENABLE TRIGGER ALL;

-- 8단계: 기존 제약 조건 삭제 (이제 안전하게 실행 가능)
SELECT '=== 8단계: 기존 제약 조건 삭제 ===' as step;
ALTER TABLE membership_history 
DROP CONSTRAINT IF EXISTS membership_history_membership_type_check;

-- 9단계: 새로운 제약 조건 추가
SELECT '=== 9단계: 새로운 제약 조건 추가 ===' as step;
ALTER TABLE membership_history 
ADD CONSTRAINT membership_history_membership_type_check 
CHECK (membership_type IN ('10회권', '20회권', '50회권'));

-- 10단계: 최종 확인
SELECT '=== 10단계: 최종 확인 ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c'
    AND conname = 'membership_history_membership_type_check';

SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;
