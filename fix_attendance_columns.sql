-- reservation 테이블에 출석 관련 컬럼 추가

-- 1. attendance_status 컬럼 추가 (기본값: 'pending')
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservation' 
        AND column_name = 'attendance_status'
    ) THEN
        ALTER TABLE public.reservation 
        ADD COLUMN attendance_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 2. attendance_checked_at 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservation' 
        AND column_name = 'attendance_checked_at'
    ) THEN
        ALTER TABLE public.reservation 
        ADD COLUMN attendance_checked_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. attendance_checked_by 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservation' 
        AND column_name = 'attendance_checked_by'
    ) THEN
        ALTER TABLE public.reservation 
        ADD COLUMN attendance_checked_by TEXT;
    END IF;
END $$;

-- 4. attendance_status에 대한 체크 제약 조건 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reservation_attendance_status_check'
    ) THEN
        ALTER TABLE public.reservation 
        ADD CONSTRAINT reservation_attendance_status_check 
        CHECK (attendance_status IN ('pending', 'attended', 'absent'));
    END IF;
END $$;

-- 5. RLS 정책 추가 (UPDATE 권한)
DROP POLICY IF EXISTS "인증된 사용자는 예약 출석을 업데이트할 수 있음" ON public.reservation;
CREATE POLICY "인증된 사용자는 예약 출석을 업데이트할 수 있음" ON public.reservation
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- anon 사용자도 업데이트할 수 있도록 정책 추가
DROP POLICY IF EXISTS "익명 사용자는 예약 출석을 업데이트할 수 있음" ON public.reservation;
CREATE POLICY "익명 사용자는 예약 출석을 업데이트할 수 있음" ON public.reservation
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- 6. 현재 컬럼 상태 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservation' 
AND column_name IN ('attendance_status', 'attendance_checked_at', 'attendance_checked_by')
ORDER BY column_name;

-- 7. 테스트 데이터 업데이트 (기존 예약들의 attendance_status를 'pending'으로 설정)
UPDATE public.reservation 
SET attendance_status = 'pending' 
WHERE attendance_status IS NULL;

-- 8. 테스트 쿼리
SELECT 
    id, 
    name, 
    attendance_status, 
    attendance_checked_at, 
    attendance_checked_by
FROM public.reservation 
LIMIT 5;

