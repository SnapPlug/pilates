-- reservation 테이블에 DELETE 권한을 위한 RLS 정책 추가

-- 1. 기존 DELETE 정책이 있다면 삭제
DROP POLICY IF EXISTS "인증된 사용자는 예약을 삭제할 수 있음" ON public.reservation;

-- 2. 새로운 DELETE 정책 생성
CREATE POLICY "인증된 사용자는 예약을 삭제할 수 있음" ON public.reservation
FOR DELETE TO authenticated
USING (true);

-- 3. anon 사용자도 예약을 삭제할 수 있도록 정책 추가 (필요한 경우)
DROP POLICY IF EXISTS "익명 사용자는 예약을 삭제할 수 있음" ON public.reservation;

CREATE POLICY "익명 사용자는 예약을 삭제할 수 있음" ON public.reservation
FOR DELETE TO anon
USING (true);

-- 4. 현재 reservation 테이블의 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reservation';

-- 5. 테스트: 예약 삭제 권한 확인
-- (실제 삭제는 하지 않고 권한만 확인)
SELECT has_table_privilege('anon', 'reservation', 'DELETE') as anon_delete_privilege,
       has_table_privilege('authenticated', 'reservation', 'DELETE') as auth_delete_privilege;
