-- reservation 테이블에 출석 상태 컬럼 추가

-- 1. attendance_status 컬럼 추가 (기본값: 'pending')
ALTER TABLE public.reservation 
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'attended', 'absent'));

-- 2. attendance_checked_at 컬럼 추가 (출석 체크 시간)
ALTER TABLE public.reservation 
ADD COLUMN IF NOT EXISTS attendance_checked_at TIMESTAMP WITH TIME ZONE;

-- 3. attendance_checked_by 컬럼 추가 (출석 체크한 관리자)
ALTER TABLE public.reservation 
ADD COLUMN IF NOT EXISTS attendance_checked_by TEXT;

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reservation_attendance_status ON public.reservation(attendance_status);
CREATE INDEX IF NOT EXISTS idx_reservation_class_date ON public.reservation(class_id, attendance_status);

-- 5. RLS 정책 추가 (인증된 사용자는 출석 상태를 업데이트할 수 있음)
DROP POLICY IF EXISTS "인증된 사용자는 출석 상태를 업데이트할 수 있음" ON public.reservation;
CREATE POLICY "인증된 사용자는 출석 상태를 업데이트할 수 있음" ON public.reservation
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- 6. 기존 예약들의 출석 상태를 'pending'으로 설정
UPDATE public.reservation 
SET attendance_status = 'pending' 
WHERE attendance_status IS NULL;

-- 7. 테스트 데이터 확인
SELECT 
    id,
    name,
    class_id,
    attendance_status,
    attendance_checked_at,
    attendance_checked_by
FROM public.reservation 
LIMIT 5;

