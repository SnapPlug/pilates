-- membership_history 테이블의 제약 조건 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type,
    cc.check_clause
FROM 
    information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
WHERE 
    tc.table_name = 'membership_history'
    AND tc.table_schema = 'public';

-- status 필드의 현재 값들 확인
SELECT DISTINCT status FROM membership_history ORDER BY status;

-- 테이블 구조 상세 확인 (표준 SQL 사용)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'membership_history' 
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- CHECK 제약 조건 상세 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'membership_history'::regclass 
    AND contype = 'c';
