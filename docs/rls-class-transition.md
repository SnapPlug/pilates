# RLS transition guide for `public.class`

본 문서는 개발 단계(인증 없이 쓰기 허용) → 운영 단계(인증/권한 적용)로 전환하기 위한 스크립트와 체크리스트를 제공합니다.

## 현재 개발 상태 표시 (as-is)
- 테이블: `public.class`
  - 컬럼: `created_by uuid` 가 NULL 허용(개발 편의용)
  - 일부/또는 기본값이 제거되어 있을 수 있음 (ex. `default auth.uid()` 제거)
- RLS 정책:
  - INSERT: 퍼블릭 허용 정책(예시명 `class_insert_public`)으로 누구나 삽입 가능
  - SELECT/UPDATE: 필요에 따라 퍼블릭 혹은 authenticated로 구성되어 있을 수 있음
- 프론트엔드:
  - `app/class/new/page.tsx`
    - 마운트 시 익명 로그인(`supabase.auth.signInAnonymously()`)을 시도 (개발 편의)
    - INSERT 시 `created_by`를 세션이 있으면 채우도록 구성(운영 전환 시 사용)
  - `.env.local` 필요 키: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 운영 전환(보안 강화) 스크립트 (to Production)
1) 퍼블릭 INSERT 정책 제거 후, 인증 사용자 전용 정책으로 교체
```sql
-- 퍼블릭 INSERT 정책 제거 (존재 시)
DROP POLICY IF EXISTS class_insert_public ON public.class;

-- 읽기: 인증 사용자 허용
DROP POLICY IF EXISTS class_select_auth_users ON public.class;
CREATE POLICY class_select_auth_users
ON public.class
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

-- 쓰기(INSERT): 본인만 생성 가능
DROP POLICY IF EXISTS class_insert_owner ON public.class;
CREATE POLICY class_insert_owner
ON public.class
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- 수정(UPDATE): 본인만 수정 가능
DROP POLICY IF EXISTS class_update_owner ON public.class;
CREATE POLICY class_update_owner
ON public.class
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
```

2) 스키마 되돌리기: `created_by`를 필수 + 기본값 설정
```sql
ALTER TABLE public.class
  ALTER COLUMN created_by SET DEFAULT auth.uid(),
  ALTER COLUMN created_by SET NOT NULL;

-- (선택) FK 복구: auth.users(id) 에 대한 참조
-- ALTER TABLE public.class
--   ADD CONSTRAINT class_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES auth.users(id);
```

3) 애플리케이션 체크리스트
- 로그인/세션 필수. 익명 로그인 제거 또는 제한
- `app/class/new/page.tsx`에서 INSERT 시 `created_by`는 기본값으로 자동 채워지므로 명시적 전달 불필요
- 실패 시 콘솔 로그의 `code/message/details`로 RLS 미스매치 확인

4) 검증 쿼리
```sql
-- 본인 생성 행만 업데이트 가능한지
EXPLAIN ANALYZE UPDATE public.class SET capacity = capacity WHERE id = '...';

-- 다른 사용자의 행 업데이트가 막히는지
```

---

## 개발 모드로 되돌리기(퍼블릭 쓰기) 스크립트 (to Development)
> 데모/로컬에서만 사용하세요.
```sql
-- 읽기: 퍼블릭 허용 (필요 시)
DROP POLICY IF EXISTS class_select_auth_users ON public.class;
CREATE POLICY class_select_public
ON public.class
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

-- 쓰기: 퍼블릭 허용
DROP POLICY IF EXISTS class_insert_owner ON public.class;
CREATE POLICY class_insert_public
ON public.class
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- (선택) UPDATE도 퍼블릭 허용하고 싶다면
DROP POLICY IF EXISTS class_update_owner ON public.class;
CREATE POLICY class_update_public
ON public.class
AS PERMISSIVE
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

스키마 완화(옵션)
```sql
ALTER TABLE public.class
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN created_by DROP DEFAULT;
```

---

## 운영/개발 간 전환 시 주의사항
- 데이터 정합성: 개발 기간에 생성된 `created_by IS NULL` 행이 있으면 운영 전환 전 정리 필요
  - 한 번에 특정 사용자로 채우거나 삭제
- 정책/스키마 변경은 트랜잭션 단위로 적용 권장
- 운영 키/URL은 `.env.local`에서 올바르게 설정하고 절대 공개 저장소에 커밋하지 말 것

---

## 관련 파일 레퍼런스
- 테이블: `public.class`
- 정책: Supabase Dashboard → Authentication → Policies 또는 SQL Editor
- 프론트엔드: `app/class/new/page.tsx`
- 환경: `.env.local` (예: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
