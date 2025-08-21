-- class 테이블에 수업명 컬럼 추가
ALTER TABLE class ADD COLUMN class_name VARCHAR(100) DEFAULT '필라테스';

-- 기존 데이터에 기본 수업명 설정 (필요시 수정)
UPDATE class SET class_name = '필라테스' WHERE class_name IS NULL;

-- 강사명 컬럼도 추가 (없다면)
ALTER TABLE class ADD COLUMN instructor_name VARCHAR(50) DEFAULT '강사';

-- 기존 데이터에 기본 강사명 설정 (필요시 수정)
UPDATE class SET instructor_name = '강사' WHERE instructor_name IS NULL;
