-- 시스템 트리거를 비활성화하지 않고 안전하게 제약 조건 수정
-- 각 단계를 실행한 후 결과를 확인하고 다음 단계로 진행하세요.

-- ========================================
-- 1단계: 현재 데이터 상태 확인
-- ========================================
SELECT '=== 1단계: 현재 membership_type 값들 ===' as step;
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- ========================================
-- 2단계: 문제가 될 수 있는 데이터 상세 확인
-- ========================================
SELECT '=== 2단계: 문제가 될 수 있는 데이터 상세 확인 ===' as step;
SELECT 
    id,
    member_id,
    membership_type,
    start_date,
    created_at
FROM membership_history 
WHERE membership_type NOT IN ('횟수제')
ORDER BY created_at DESC;

-- ========================================
-- 3단계: 기존 제약 조건 삭제 (데이터가 제약 조건을 만족할 때까지)
-- ========================================
SELECT '=== 3단계: 기존 제약 조건 삭제 시도 ===' as step;

-- 먼저 제약 조건 삭제 시도
DO $$
BEGIN
    BEGIN
        ALTER TABLE membership_history 
        DROP CONSTRAINT IF EXISTS membership_history_membership_type_check;
        RAISE NOTICE '제약 조건 삭제 성공';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '제약 조건 삭제 실패: %', SQLERRM;
    END;
END $$;

-- ========================================
-- 4단계: 데이터 정리 (제약 조건이 없는 상태에서)
-- ========================================
SELECT '=== 4단계: 데이터 정리 시작 ===' as step;

-- '10회권'을 '횟수제'로 변경
UPDATE membership_history 
SET membership_type = '횟수제' 
WHERE membership_type = '10회권';

-- '20회권'을 '횟수제'로 변경  
UPDATE membership_history 
SET membership_type = '횟수제' 
WHERE membership_type = '20회권';

-- '50회권'을 '횟수제'로 변경
UPDATE membership_history 
SET membership_type = '횟수제' 
WHERE membership_type = '50회권';

-- 기타 예상치 못한 값들을 '횟수제'로 변경
UPDATE membership_history 
SET membership_type = '횟수제' 
WHERE membership_type NOT IN ('횟수제');

-- ========================================
-- 5단계: 정리된 데이터 확인
-- ========================================
SELECT '=== 5단계: 정리된 데이터 확인 ===' as step;
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- ========================================
-- 6단계: 새로운 제약 조건 추가
-- ========================================
SELECT '=== 6단계: 새로운 제약 조건 추가 ===' as step;

-- 새로운 제약 조건 추가 시도
DO $$
BEGIN
    BEGIN
        ALTER TABLE membership_history 
        ADD CONSTRAINT membership_history_membership_type_check 
        CHECK (membership_type IN ('10회권', '20회권', '50회권'));
        RAISE NOTICE '새로운 제약 조건 추가 성공';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '새로운 제약 조건 추가 실패: %', SQLERRM;
    END;
END $$;

-- ========================================
-- 7단계: 최종 확인
-- ========================================
SELECT '=== 7단계: 최종 확인 ===' as step;

-- 현재 제약 조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c'
    AND conname = 'membership_history_membership_type_check';

-- 최종 데이터 상태 확인
SELECT 
    membership_type,
    COUNT(*) as count
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- ========================================
-- 8단계: 대안 방법 (제약 조건 추가가 실패한 경우)
-- ========================================
SELECT '=== 8단계: 대안 방법 ===' as step;

-- 만약 새로운 제약 조건 추가가 실패했다면, 
-- 기존 제약 조건을 유지하고 데이터만 정리하는 방법
SELECT 
    '현재 제약 조건 상태' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'membership_history'::regclass 
            AND conname = 'membership_history_membership_type_check'
        ) THEN '기존 제약 조건 유지됨'
        ELSE '제약 조건 없음'
    END as status;
