-- 시스템 설정 테이블 생성
-- 기존 테이블이 존재하는 경우 새로운 컬럼들 추가
ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS weekly_recommended_sessions INTEGER DEFAULT 2;

ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS membership_expiration_buffer INTEGER DEFAULT 3;

ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS remaining_sessions_threshold INTEGER DEFAULT 3;

-- 기존 데이터가 있는 경우 기본값 업데이트
UPDATE public.system_settings 
SET weekly_recommended_sessions = 2 
WHERE weekly_recommended_sessions IS NULL;

UPDATE public.system_settings 
SET membership_expiration_buffer = 3 
WHERE membership_expiration_buffer IS NULL;

UPDATE public.system_settings 
SET remaining_sessions_threshold = 3 
WHERE remaining_sessions_threshold IS NULL;

-- 테이블이 존재하지 않는 경우에만 새로 생성
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    show_instructor_name BOOLEAN DEFAULT true,
    show_class_name BOOLEAN DEFAULT true,
    calendar_view TEXT DEFAULT '1주' CHECK (calendar_view IN ('1주', '2주', '1달')),
    weekly_recommended_sessions INTEGER DEFAULT 2,
    membership_expiration_buffer INTEGER DEFAULT 3,
    remaining_sessions_threshold INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 데이터 삽입 (테이블이 비어있는 경우에만)
INSERT INTO public.system_settings (
    id, 
    show_instructor_name, 
    show_class_name, 
    calendar_view,
    weekly_recommended_sessions,
    membership_expiration_buffer,
    remaining_sessions_threshold
)
VALUES (
    1, 
    true, 
    true, 
    '1주',
    2,
    3,
    3
)
ON CONFLICT (id) DO NOTHING;

-- RLS 정책 설정 (필요한 경우)
-- ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_system_settings_id ON public.system_settings(id);

-- updated_at 자동 업데이트를 위한 트리거 함수 (이미 존재하는 경우 재사용)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- 트리거 생성
-- DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
-- CREATE TRIGGER update_system_settings_updated_at
--     BEFORE UPDATE ON public.system_settings
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- 권한 설정
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;

-- 확인용 쿼리
SELECT * FROM public.system_settings;
