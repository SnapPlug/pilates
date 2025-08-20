-- membership_history 테이블의 status 컬럼 제약 조건 수정

-- 1. 현재 제약 조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.membership_history'::regclass 
AND conname = 'membership_history_status_check';

-- 2. 기존 제약 조건 삭제
ALTER TABLE public.membership_history 
DROP CONSTRAINT IF EXISTS membership_history_status_check;

-- 3. 새로운 제약 조건 생성 (active, expired, cancelled, pending 포함)
ALTER TABLE public.membership_history 
ADD CONSTRAINT membership_history_status_check 
CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'suspended'));

-- 4. membership_type 컬럼 제약 조건도 확인 및 수정
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.membership_history'::regclass 
AND conname LIKE '%membership_type%';

-- 5. membership_type 제약 조건 삭제 (있다면)
ALTER TABLE public.membership_history 
DROP CONSTRAINT IF EXISTS membership_history_membership_type_check;

-- 6. membership_type에 대한 새로운 제약 조건 생성 (통합제 포함)
ALTER TABLE public.membership_history 
ADD CONSTRAINT membership_history_membership_type_check 
CHECK (membership_type IN ('횟수제', '기간제', '통합제', 'session', 'period', 'combined'));

-- 7. 현재 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'membership_history' 
ORDER BY ordinal_position;

-- 8. 테스트 데이터 삽입 (제약 조건 확인용)
-- INSERT INTO public.membership_history (
--     member_id,
--     membership_type,
--     total_sessions,
--     remaining_sessions,
--     start_date,
--     end_date,
--     price,
--     notes,
--     status
-- ) VALUES (
--     'test-member-id',
--     '통합제',
--     10,
--     10,
--     '2025-08-19',
--     '2025-12-31',
--     100000,
--     '테스트 회원권',
--     'active'
-- );

-- 9. 제약 조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.membership_history'::regclass;
