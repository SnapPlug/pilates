# SnapPliates 프로젝트 작업지시서

## 📋 프로젝트 개요

**프로젝트명**: SnapPliates (필라테스 센터 관리 시스템)  
**버전**: 0.2.0  
**개발 기간**: 2025년 1월 27일 ~ 현재  
**개발 상태**: 프로덕션 배포 완료  
**배포 URL**: https://snappliates-bnxmx3lzz-jasonjeongs-projects.vercel.app  
**커스텀 도메인**: https://snappliates.vercel.app (설정 예정)

---

## 🎯 프로젝트 목표

### **1차 목표 (v0.1.0) - 기본 시스템 구축**
- [x] 회원 관리 시스템
- [x] 회원권 관리 시스템  
- [x] 예약 시스템
- [x] 출석 관리 시스템
- [x] 기본 대시보드

### **2차 목표 (v0.2.0) - 고급 기능 구현**
- [x] 시스템 설정 페이지
- [x] 동적 UI 표시 시스템
- [x] 자동 회원권 만료일 계산
- [x] 월별 통계 필터링
- [x] 실시간 설정 동기화

### **3차 목표 (v0.3.0) - 사용자 경험 개선**
- [ ] 알림 시스템
- [ ] 보고서 생성 기능
- [ ] 데이터 내보내기 기능

---

## 🏗️ 기술 스택

### **Frontend**
- **Framework**: Next.js 15.4.6 (Pages Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI, Lucide React
- **State Management**: React Context + useState

### **Backend**
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime

### **Deployment**
- **Platform**: Vercel
- **Environment**: Production
- **Domain**: snappliates.vercel.app (설정 예정)

---

## 📁 프로젝트 구조

```
snap_pliates/
├── app/                          # Next.js App Router
│   ├── api/                     # API 엔드포인트
│   │   ├── settings/           # 시스템 설정 API
│   │   ├── member/             # 회원 관리 API
│   │   ├── membership/         # 회원권 관리 API
│   │   └── reservation/        # 예약 관리 API
│   ├── dashboard/              # 대시보드 페이지
│   ├── member/                 # 회원 관리 페이지
│   ├── reservation/            # 예약 페이지
│   └── settings/               # 시스템 설정 페이지
├── components/                  # 재사용 가능한 컴포넌트
│   ├── ui/                     # UI 컴포넌트
│   └── blocks/                 # 블록 컴포넌트
├── lib/                        # 유틸리티 및 설정
├── types/                      # TypeScript 타입 정의
└── docs/                       # 프로젝트 문서
```

---

## 🔧 주요 기능 상세

### **1. 시스템 설정 시스템**

#### **구현된 기능**
- **iPhone 스타일 설정 UI**: 모던하고 직관적인 인터페이스
- **강사명 표시/숨김**: 예약 페이지에서 강사명 표시 여부 제어
- **수업명 표시/숨김**: 예약 페이지에서 수업명 표시 여부 제어
- **달력 보기 설정**: 1주/2주/1달 보기 모드 선택
- **1주간 권장 수업수**: 회원권 만료일 자동 계산 기준
- **회원권 잔여 기간 관리**: 3일/7일/14일 알림 설정

#### **기술적 특징**
- **실시간 동기화**: 2초 간격 폴링으로 설정 변경 즉시 반영
- **데이터베이스 연동**: `system_settings` 테이블과 완벽 연동
- **API 엔드포인트**: `/api/settings` GET/POST 메서드 지원

### **2. 회원권 등록 시스템**

#### **구현된 기능**
- **회원권 유형 선택**: 10회권, 20회권, 50회권
- **자동 만료일 계산**: 1주간 권장 수업수 기반 자동 계산
- **실시간 계산**: 설정 변경 시 즉시 만료일 재계산
- **사용자 친화적 UI**: 도움말 및 자동 완성 기능

#### **계산 로직**
```typescript
// 만료일 자동 계산 공식
const weeksNeeded = Math.ceil(totalSessions / weeklyRecommendedSessions);
const endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + (weeksNeeded * 7));
```

### **3. 대시보드 월별 필터링**

#### **구현된 기능**
- **월별 선택기**: 최근 12개월 선택 가능
- **통계 동기화**: 모든 데이터가 선택된 월에 맞춰 표시
- **동적 제목**: 선택된 월 정보를 제목에 표시
- **실시간 업데이트**: 월 변경 시 즉시 모든 통계 업데이트

#### **필터링 대상**
- **회원 통계**: 활동 회원수, 유효/만료 회원수
- **수업 통계**: 총 수업수, 예약수, 출석/결석/대기 수
- **잔여횟수별 회원수**: 설정된 임계값 기준 분류
- **잔여 기간별 회원수**: 설정된 버퍼 기준 분류

### **4. 예약 페이지 동적 표시**

#### **구현된 기능**
- **설정 기반 표시**: 시스템 설정에 따른 동적 UI
- **강사명/수업명 제어**: 설정에 따라 표시/숨김
- **달력 보기 모드**: 설정에 따른 기본 보기 모드
- **실시간 반영**: 설정 변경 시 즉시 UI 업데이트

---

## 🗄️ 데이터베이스 스키마

### **주요 테이블**

#### **1. system_settings**
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_instructor_name BOOLEAN DEFAULT true,
  show_class_name BOOLEAN DEFAULT true,
  calendar_view TEXT DEFAULT '1주',
  weekly_recommended_sessions INTEGER DEFAULT 2,
  membership_expiration_buffer INTEGER DEFAULT 3,
  remaining_sessions_threshold INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2. member**
```sql
CREATE TABLE member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  kakao_user_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **3. membership_history**
```sql
CREATE TABLE membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES member(id),
  membership_type TEXT CHECK (membership_type IN ('10회권', '20회권', '50회권')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER DEFAULT 0,
  remaining_sessions INTEGER NOT NULL,
  status TEXT DEFAULT '활성',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **4. reservation**
```sql
CREATE TABLE reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES member(id),
  class_id UUID REFERENCES class(id),
  attendance_status TEXT DEFAULT '대기',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 배포 및 운영

### **배포 환경**
- **플랫폼**: Vercel
- **빌드 도구**: Next.js Build System
- **환경변수**: Vercel Environment Variables
- **도메인**: snappliates.vercel.app (설정 예정)

### **커스텀 도메인 설정 방법**
1. **Vercel 대시보드 접속**: https://vercel.com/dashboard
2. **프로젝트 선택**: snappliates
3. **Settings → Domains** 메뉴 이동
4. **Add Domain** 클릭
5. **도메인 입력**: snappliates.vercel.app
6. **Add** 버튼 클릭하여 도메인 추가

### **현재 배포 상태**
- **최신 배포**: https://snappliates-bnxmx3lzz-jasonjeongs-projects.vercel.app
- **배포 시간**: 2025-08-23 20:16:46 UTC
- **빌드 상태**: ✅ 성공 (1분 소요)
- **환경변수**: 모든 Supabase 설정 정상

### **환경변수 설정**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **배포 명령어**
```bash
# 프로덕션 빌드
npm run build

# Vercel 배포
vercel --prod

# 로컬 테스트
npm run dev
```

---

## 🐛 해결된 주요 이슈

### **1. 회원권 추가 시스템 오류**
- **문제**: `membership_type` 제약 조건 위반
- **해결**: 데이터베이스 스키마 수정 및 제약 조건 최적화
- **결과**: 10회권, 20회권, 50회권 정상 저장

### **2. 대시보드 데이터 동기화**
- **문제**: 월별 필터 적용 시 일부 데이터 미업데이트
- **해결**: 모든 통계 데이터에 월별 필터 적용
- **결과**: 완벽한 월별 데이터 동기화

### **3. 설정 실시간 반영**
- **문제**: 설정 변경 시 다른 페이지에 즉시 반영되지 않음
- **해결**: 폴링 방식의 실시간 업데이트 시스템 구현
- **결과**: 2초 내 설정 변경 반영

---

## 📊 성능 및 최적화

### **빌드 성능**
- **컴파일 시간**: 4.0초 (로컬), 10.0초 (Vercel)
- **번들 크기**: 최적화된 JavaScript 번들
- **페이지 생성**: 39개 정적 페이지

### **런타임 성능**
- **데이터 로딩**: 단계별 로딩으로 초기 로딩 시간 단축
- **실시간 업데이트**: 효율적인 폴링 시스템
- **메모리 관리**: 메모리 누수 방지

---

## 🔒 보안 및 권한

### **인증 시스템**
- **Supabase Auth**: 사용자 인증 및 권한 관리
- **RLS (Row Level Security)**: 테이블별 접근 권한 제어
- **API 보안**: 서버 사이드 API 엔드포인트 보호

### **데이터 보호**
- **입력값 검증**: 클라이언트/서버 양쪽 검증
- **SQL 인젝션 방지**: Supabase 클라이언트 사용
- **에러 로깅**: 민감정보 제외한 상세 로깅

---

## 📱 사용자 인터페이스

### **디자인 시스템**
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **반응형 디자인**: 모바일과 데스크톱 모두 지원
- **접근성**: 키보드 네비게이션 및 ARIA 속성

### **컴포넌트 구조**
- **재사용성**: 모듈화된 컴포넌트 설계
- **일관성**: 통일된 디자인 패턴
- **확장성**: 새로운 기능 추가 용이

---

## 🧪 테스트 및 품질 관리

### **코드 품질**
- **TypeScript**: 타입 안전성 보장
- **ESLint**: 코드 스타일 및 품질 검사
- **에러 처리**: 포괄적인 에러 핸들링

### **테스트 방법**
- **기능 테스트**: 각 기능별 동작 확인
- **통합 테스트**: API 엔드포인트 연동 테스트
- **사용자 테스트**: 실제 사용 시나리오 테스트

---

## 📈 향후 개발 계획

### **단기 계획 (1-2개월)**
- [ ] **v0.3.0**: 알림 시스템 구현
- [ ] **v0.3.1**: 보고서 생성 기능
- [ ] **v0.3.2**: 데이터 내보내기 기능

### **중기 계획 (3-6개월)**
- [ ] **v0.4.0**: 모바일 앱 개발
- [ ] **v0.4.1**: 고급 분석 도구
- [ ] **v0.4.2**: 다국어 지원

### **장기 계획 (6개월 이상)**
- [ ] **v0.5.0**: AI 기반 예측 시스템
- [ ] **v0.5.1**: 고객 관리 시스템
- [ ] **v0.5.2**: 결제 시스템 연동

---

## 👥 개발팀 및 역할

### **프로젝트 관리**
- **프로젝트 매니저**: 전체 프로젝트 기획 및 관리
- **기술 리드**: 기술적 의사결정 및 아키텍처 설계

### **개발팀**
- **Frontend 개발자**: React/Next.js 기반 UI 개발
- **Backend 개발자**: API 및 데이터베이스 설계
- **DevOps 엔지니어**: 배포 및 인프라 관리

### **품질 관리**
- **QA 엔지니어**: 테스트 및 품질 검증
- **UX/UI 디자이너**: 사용자 경험 및 인터페이스 설계

---

## 📞 연락처 및 지원

### **기술 지원**
- **이슈 트래커**: GitHub Issues
- **문서**: 프로젝트 README 및 API 문서
- **개발 가이드**: 코딩 스타일 및 아키텍처 가이드

### **프로젝트 정보**
- **저장소**: GitHub - SnapPlug/pilates
- **배포 URL**: https://snappliates-bnxmx3lzz-jasonjeongs-projects.vercel.app
- **커스텀 도메인**: https://snappliates.vercel.app (설정 예정)
- **문서**: https://github.com/SnapPlug/pilates/blob/main/README.md

---

## 📝 변경 이력

### **v0.2.0 (2025-01-27)**
- ✅ 시스템 설정 페이지 완전 구현
- ✅ 회원권 등록 시스템 대폭 개선
- ✅ 대시보드 월별 필터링 완성
- ✅ 예약 페이지 동적 표시 시스템

### **v0.1.0 (2025-01-20)**
- ✅ 기본 회원 관리 시스템
- ✅ 기본 예약 시스템
- ✅ 기본 대시보드

---

**작성일**: 2025년 1월 27일  
**작성자**: SnapPliates Development Team  
**문서 버전**: 1.0  
**최종 업데이트**: 2025년 1월 27일
