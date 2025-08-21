# 환경변수 설정 가이드

## 필요한 환경변수

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## 키 확인 방법

1. **Supabase Dashboard** 접속
2. **Settings** > **API** 메뉴로 이동
3. 다음 키들을 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 보안상 중요)

## 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 **절대 클라이언트에 노출하면 안됩니다**
- 이 키는 **서버사이드에서만 사용**됩니다
- RLS 정책을 우회할 수 있는 강력한 권한을 가집니다

## 설정 완료 후

환경변수 설정 후 개발 서버를 재시작하세요:
```bash
npm run dev
```
