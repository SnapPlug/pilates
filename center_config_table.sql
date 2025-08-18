-- 센터별 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.center_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_name TEXT NOT NULL UNIQUE,
    kakao_bot_id TEXT NOT NULL,
    kakao_channel_id TEXT,
    center_address TEXT,
    center_phone TEXT,
    center_email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정 (개발용 - 모든 접근 허용)
DROP POLICY IF EXISTS "센터 설정은 모든 사용자가 읽기 가능" ON public.center_config;
CREATE POLICY "센터 설정은 모든 사용자가 읽기 가능" ON public.center_config
    FOR SELECT USING (true);

-- 샘플 데이터 삽입
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.center_config WHERE center_name = 'SnapPilates 강남점') THEN
        INSERT INTO public.center_config (center_name, kakao_bot_id, kakao_channel_id, center_address, center_phone, center_email)
        VALUES ('SnapPilates 강남점', '_xkzxiNn', '_ZeUTxl', '서울시 강남구 테헤란로 123', '02-1234-5678', 'gangnam@snappilates.com');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.center_config WHERE center_name = 'SnapPilates 홍대점') THEN
        INSERT INTO public.center_config (center_name, kakao_bot_id, kakao_channel_id, center_address, center_phone, center_email)
        VALUES ('SnapPilates 홍대점', '_hongdae_bot_id', '_hongdae_channel_id', '서울시 마포구 홍대로 456', '02-9876-5432', 'hongdae@snappilates.com');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.center_config WHERE center_name = 'SnapPilates 부산점') THEN
        INSERT INTO public.center_config (center_name, kakao_bot_id, kakao_channel_id, center_address, center_phone, center_email)
        VALUES ('SnapPilates 부산점', '_busan_bot_id', '_busan_channel_id', '부산시 해운대구 해운대로 789', '051-111-2222', 'busan@snappilates.com');
    END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_center_config_center_name ON public.center_config(center_name);
CREATE INDEX IF NOT EXISTS idx_center_config_is_active ON public.center_config(is_active);

-- 확인용 쿼리
SELECT center_name, kakao_bot_id, kakao_channel_id, is_active 
FROM public.center_config 
WHERE is_active = true;
