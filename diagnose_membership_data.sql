-- membership_history 테이블의 현재 상태 진단
-- 1단계: 현재 저장된 모든 membership_type 값 확인
SELECT 
    membership_type,
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM membership_history 
GROUP BY membership_type 
ORDER BY membership_type;

-- 2단계: 제약 조건 상세 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c';

-- 3단계: 문제가 될 수 있는 데이터 샘플 확인
SELECT 
    id,
    member_id,
    membership_type,
    start_date,
    end_date,
    created_at
FROM membership_history 
ORDER BY created_at DESC 
LIMIT 10;

-- 4단계: membership_type이 NULL인 데이터 확인
SELECT 
    COUNT(*) as null_count
FROM membership_history 
WHERE membership_type IS NULL;

-- 5단계: 빈 문자열인 데이터 확인
SELECT 
    COUNT(*) as empty_count
FROM membership_history 
WHERE membership_type = '';

-- 6단계: 현재 제약 조건의 정확한 내용 확인
SELECT 
    cc.check_clause,
    tc.constraint_name,
    tc.table_name
FROM 
    information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc 
        ON cc.constraint_name = tc.constraint_name
WHERE 
    tc.table_name = 'membership_history' 
    AND tc.table_schema = 'public';
