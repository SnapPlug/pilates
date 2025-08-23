# 커스텀 도메인 설정 가이드

## 🎯 목표
`https://snappliates.vercel.app/` 링크에서 SnapPliates 프로젝트가 동작하도록 커스텀 도메인을 설정합니다.

---

## 📋 현재 상황

### **현재 배포 상태**
- **프로젝트명**: snappliates
- **최신 배포 URL**: https://snappliates-bnxmx3lzz-jasonjeongs-projects.vercel.app
- **배포 상태**: ✅ 성공
- **빌드 시간**: 1분

### **설정해야 할 도메인**
- **목표 도메인**: snappliates.vercel.app
- **현재 상태**: 미설정
- **설정 방법**: Vercel 대시보드에서 수동 설정

---

## 🚀 커스텀 도메인 설정 방법

### **1단계: Vercel 대시보드 접속**
1. **브라우저에서 접속**: https://vercel.com/dashboard
2. **로그인**: GitHub 계정으로 로그인
3. **프로젝트 선택**: `snappliates` 프로젝트 클릭

### **2단계: 도메인 설정 메뉴 이동**
1. **프로젝트 대시보드**에서 **Settings** 탭 클릭
2. **왼쪽 메뉴**에서 **Domains** 선택
3. **Domains** 페이지로 이동

### **3단계: 새 도메인 추가**
1. **Add Domain** 버튼 클릭
2. **도메인 입력 필드**에 `snappliates.vercel.app` 입력
3. **Add** 버튼 클릭하여 도메인 추가

### **4단계: 도메인 확인**
1. **도메인 상태** 확인: `Valid` 상태가 되어야 함
2. **DNS 설정** 자동으로 처리됨
3. **설정 완료** 메시지 확인

---

## 🔧 기술적 세부사항

### **Vercel 서브도메인 규칙**
- **형식**: `{project-name}.vercel.app`
- **프로젝트명**: snappliates
- **최종 도메인**: snappliates.vercel.app

### **자동 DNS 설정**
- **CNAME 레코드**: 자동 생성
- **SSL 인증서**: 자동 발급
- **CDN**: 전 세계 엣지 서버에 자동 배포

### **도메인 전파 시간**
- **일반적인 경우**: 즉시 (몇 분 내)
- **최대 대기 시간**: 24시간
- **권장사항**: 설정 후 1시간 대기 후 테스트

---

## ✅ 설정 완료 확인 방법

### **1. 도메인 접속 테스트**
```bash
# 브라우저에서 접속
https://snappliates.vercel.app

# 또는 curl 명령어로 테스트
curl -I "https://snappliates.vercel.app"
```

### **2. 응답 확인**
- **HTTP 상태**: 200 OK 또는 401 (인증 필요 - 정상)
- **SSL 인증서**: 유효한 인증서 표시
- **콘텐츠**: SnapPliates 메인 페이지 로드

### **3. 리다이렉트 확인**
- **기존 URL**: https://snappliates-bnxmx3lzz-jasonjeongs-projects.vercel.app
- **새 도메인**: https://snappliates.vercel.app
- **동작**: 두 URL 모두 동일한 사이트 표시

---

## 🐛 문제 해결

### **문제 1: 도메인 추가 실패**
- **원인**: 도메인명 중복 또는 잘못된 형식
- **해결**: 도메인명 확인 및 재시도

### **문제 2: 도메인 접속 불가**
- **원인**: DNS 전파 지연
- **해결**: 1-24시간 대기 후 재시도

### **문제 3: SSL 인증서 오류**
- **원인**: 인증서 발급 지연
- **해결**: 1시간 대기 후 재시도

---

## 📱 설정 완료 후 사용법

### **1. 메인 접속**
- **URL**: https://snappliates.vercel.app
- **기능**: 모든 SnapPliates 기능 사용 가능

### **2. 직접 링크 공유**
- **사용자**: 간단한 도메인으로 링크 공유
- **관리자**: 직관적인 URL로 시스템 관리

### **3. 브랜딩**
- **프로젝트**: 전문적인 도메인으로 브랜딩
- **사용자 경험**: 기억하기 쉬운 URL

---

## 🔄 향후 도메인 관리

### **도메인 변경**
1. **Vercel 대시보드** → **Settings** → **Domains**
2. **기존 도메인** 삭제
3. **새 도메인** 추가

### **도메인 모니터링**
- **상태 확인**: 정기적인 도메인 상태 점검
- **성능 모니터링**: Vercel Analytics로 성능 추적
- **사용자 피드백**: 도메인 관련 사용자 피드백 수집

---

## 📞 지원 및 문의

### **Vercel 지원**
- **공식 문서**: https://vercel.com/docs
- **도메인 가이드**: https://vercel.com/docs/concepts/projects/domains
- **지원팀**: Vercel 대시보드의 Help 섹션

### **프로젝트 지원**
- **GitHub Issues**: https://github.com/SnapPlug/pilates/issues
- **개발팀**: SnapPliates Development Team

---

## 📝 체크리스트

### **설정 전 확인사항**
- [ ] Vercel 계정 로그인 상태
- [ ] snappliates 프로젝트 접근 권한
- [ ] 도메인명 `snappliates.vercel.app` 확인

### **설정 과정**
- [ ] Vercel 대시보드 접속
- [ ] snappliates 프로젝트 선택
- [ ] Settings → Domains 메뉴 이동
- [ ] Add Domain 클릭
- [ ] `snappliates.vercel.app` 입력
- [ ] Add 버튼 클릭

### **설정 완료 확인**
- [ ] 도메인 상태 `Valid` 확인
- [ ] 브라우저에서 도메인 접속 테스트
- [ ] SSL 인증서 정상 작동 확인
- [ ] 모든 기능 정상 동작 확인

---

**작성일**: 2025년 1월 27일  
**작성자**: SnapPliates Development Team  
**문서 버전**: 1.0  
**최종 업데이트**: 2025년 1월 27일
