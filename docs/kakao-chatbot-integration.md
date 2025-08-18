# 카카오챗봇 연동 가이드

## 📋 개요

이 문서는 SnapPilates 시스템과 카카오챗봇을 연동하여 사용자 식별 및 서비스 제공을 위한 가이드입니다.

## 🔄 사용자 식별 플로우

### 시나리오 1: 관리자가 먼저 회원 등록

```
1. 관리자가 member 페이지에서 회원 등록
   - 이름, 전화번호, 기타 정보 입력
   - 카카오 ID는 아직 모름

2. 회원 등록 완료 후 자동 온보딩
   - 카카오챗봇 링크 자동 생성
   - 링크 복사, 메시지 템플릿, QR코드 제공
   - 관리자가 회원에게 전달

3. 사용자가 카카오챗봇 접속
   - 링크에 포함된 member_id로 자동 매핑
   - userRequest.user.id와 member_id 연결
   - 즉시 서비스 이용 가능
```

### 시나리오 2: 신규 사용자가 카카오챗봇으로 먼저 접속

```
1. 신규 사용자가 카카오챗봇 접속
   - DB에 회원 정보 없음
   - userRequest.user.id만 존재

2. 인증 프로세스 시작
   - 전화번호 끝 4자리 + 이름 입력
   - 또는 전체 전화번호 입력

3. 결과에 따른 처리:
   a) 기존 회원 발견 → 카카오 ID 매핑
   b) 신규 사용자 → 임시 회원 생성
   c) 여러 후보 → 추가 정보 요청

4. 서비스 이용 시작
```

## 🎯 userRequest.user.id 받아오기 과정

### 1. 카카오챗봇에서 제공하는 사용자 식별값

```javascript
// 카카오챗봇 스킬에서 받는 userRequest 구조
{
  "version": "2.0",
  "userRequest": {
    "user": {
      "id": "1234567890",        // 🎯 핵심 식별값!
      "type": "botUserKey",
      "properties": {
        "botUserKey": "1234567890",
        "bot_user_key": "1234567890"
      }
    },
    "utterance": "사용자 입력 메시지",
    "sessionId": "session_1234567890"
  }
}
```

### 2. 사용자 식별값 활용 방법

#### **기본 인증 스킬**
```javascript
// 카카오챗봇 스킬에서 실행
function authenticateUser(userRequest) {
  const kakaoUserId = userRequest.user.id;  // 🎯 핵심!
  const userMessage = userRequest.utterance;
  
  // API 호출하여 사용자 인증
  const response = await fetch('https://snappilates.vercel.app/api/kakao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'authenticate',
      kakao_user_id: kakaoUserId,  // 여기에 사용
      phone_last4: '1234',
      name: '홍길동'
    })
  });
}
```

#### **직접 링크로 접속한 경우**
```javascript
// URL에서 member_id를 받아와서 직접 매핑
function handleDirectLink(userRequest) {
  const kakaoUserId = userRequest.user.id;
  const urlParams = new URLSearchParams(window.location.search);
  const memberId = urlParams.get('member_id');
  
  if (memberId) {
    // 직접 매핑 API 호출
    const response = await fetch('https://snappilates.vercel.app/api/member/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kakao_user_id: kakaoUserId,
        member_id: memberId  // URL에서 받은 member_id
      })
    });
  }
}
```

## 🛠 API 엔드포인트

### 1. 사용자 인증 (`POST /api/kakao`)

```json
{
  "action": "authenticate",
  "kakao_user_id": "user123",
  "phone_last4": "1234",
  "name": "홍길동"
}
```

**응답 예시:**
```json
{
  "success": true,
  "type": "mapped_member",
  "member": {
    "id": "uuid",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "membership_status": "활성"
  },
  "message": "기존 회원과 성공적으로 연결되었습니다."
}
```

### 2. 직접 매핑 (`POST /api/member/auth`)

```json
{
  "kakao_user_id": "user123",
  "member_id": "member_uuid"
}
```

**응답 예시:**
```json
{
  "success": true,
  "type": "direct_mapping",
  "member": {
    "id": "member_uuid",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "kakao_id": "user123"
  },
  "message": "회원과 성공적으로 연결되었습니다."
}
```

### 3. 회원권 정보 조회 (`POST /api/kakao`)

```json
{
  "action": "get_membership_info",
  "kakao_user_id": "user123"
}
```

### 4. 예약 정보 조회 (`POST /api/kakao`)

```json
{
  "action": "get_reservations",
  "kakao_user_id": "user123"
}
```

### 5. 예약 생성 (`POST /api/kakao`)

```json
{
  "action": "make_reservation",
  "kakao_user_id": "user123",
  "class_id": "class-uuid",
  "reservation_date": "2024-01-15"
}
```

### 6. 예약 취소 (`POST /api/kakao`)

```json
{
  "action": "cancel_reservation",
  "kakao_user_id": "user123",
  "class_id": "class-uuid",
  "reservation_date": "2024-01-15"
}
```

### 7. 이용 가능한 수업 조회 (`POST /api/kakao`)

```json
{
  "action": "get_available_classes"
}
```

## 📱 카카오챗봇 스킬 설정

### 1. 기본 인증 스킬

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "안녕하세요! SnapPilates입니다.\n\n서비스를 이용하시려면 인증이 필요합니다.\n\n전화번호 끝 4자리와 이름을 입력해주세요.\n\n예시: 1234 홍길동"
        }
      }
    ],
    "quickReplies": [
      {
        "label": "인증하기",
        "action": "message",
        "messageText": "인증하기"
      }
    ]
  }
}
```

### 2. 인증 처리 스킬

```javascript
// 카카오챗봇 스킬에서 실행할 JavaScript
function authenticateUser(userRequest) {
  const kakaoUserId = userRequest.user.id;  // 🎯 핵심!
  const userMessage = userRequest.utterance;
  
  // 전화번호 끝 4자리와 이름 파싱
  const match = userMessage.match(/(\d{4})\s+(.+)/);
  if (!match) {
    return {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": "올바른 형식으로 입력해주세요.\n\n예시: 1234 홍길동"
            }
          }
        ]
      }
    };
  }
  
  const phoneLast4 = match[1];
  const name = match[2];
  
  // API 호출
  const response = await fetch('https://snappilates.vercel.app/api/kakao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'authenticate',
      kakao_user_id: kakaoUserId,
      phone_last4: phoneLast4,
      name: name
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    if (result.type === 'mapped_member') {
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": `안녕하세요, ${result.member.name}님!\n\n인증이 완료되었습니다.`
              }
            }
          ],
          "quickReplies": [
            {
              "label": "회원권 정보",
              "action": "message",
              "messageText": "회원권 정보"
            },
            {
              "label": "예약 확인",
              "action": "message",
              "messageText": "예약 확인"
            },
            {
              "label": "수업 예약",
              "action": "message",
              "messageText": "수업 예약"
            }
          ]
        }
      };
    } else if (result.type === 'new_temp_member') {
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": "신규 사용자로 임시 등록되었습니다.\n\n관리자에게 연락하여 정식 등록을 완료해주세요.\n\n전화: 02-1234-5678"
              }
            }
          ]
        }
      };
    }
  } else {
    return {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": result.message || "인증 중 오류가 발생했습니다."
            }
          }
        ]
      }
    };
  }
}
```

### 3. 직접 링크 처리 스킬

```javascript
// URL 파라미터에서 member_id를 받아와서 직접 매핑
function handleDirectLink(userRequest) {
  const kakaoUserId = userRequest.user.id;
  
  // URL에서 member_id 추출 (카카오챗봇에서는 다른 방법 필요)
  // 실제로는 카카오챗봇에서 URL 파라미터를 직접 받을 수 없으므로
  // 별도의 처리 로직이 필요할 수 있습니다.
  
  const response = await fetch('https://snappilates.vercel.app/api/member/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kakao_user_id: kakaoUserId,
      member_id: 'member_id_from_url'  // URL에서 추출한 member_id
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    return {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": `안녕하세요, ${result.member.name}님!\n\n자동으로 연결되었습니다.`
            }
          }
        ],
        "quickReplies": [
          {
            "label": "회원권 정보",
            "action": "message",
            "messageText": "회원권 정보"
          },
          {
            "label": "예약 확인",
            "action": "message",
            "messageText": "예약 확인"
          }
        ]
      }
    };
  }
}
```

### 4. 회원권 정보 조회 스킬

```javascript
async function getMembershipInfo(userRequest) {
  const kakaoUserId = userRequest.user.id;
  
  const response = await fetch('https://snappilates.vercel.app/api/kakao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'get_membership_info',
      kakao_user_id: kakaoUserId
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    const member = result.member;
    const membershipHistory = result.membership_history;
    
    let message = `📋 회원 정보\n\n`;
    message += `이름: ${member.name}\n`;
    message += `상태: ${member.membership_status}\n`;
    message += `잔여 횟수: ${member.remaining_sessions}회\n`;
    message += `포인트: ${member.points}P\n`;
    
    if (membershipHistory.length > 0) {
      message += `\n📅 최근 회원권 내역\n`;
      membershipHistory.slice(0, 3).forEach(h => {
        message += `• ${h.membership_type} (${h.start_date} ~ ${h.end_date})\n`;
      });
    }
    
    return {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": message
            }
          }
        ],
        "quickReplies": [
          {
            "label": "예약 확인",
            "action": "message",
            "messageText": "예약 확인"
          },
          {
            "label": "수업 예약",
            "action": "message",
            "messageText": "수업 예약"
          }
        ]
      }
    };
  }
}
```

### 5. 예약 확인 스킬

```javascript
async function getReservations(userRequest) {
  const kakaoUserId = userRequest.user.id;
  
  const response = await fetch('https://snappilates.vercel.app/api/kakao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'get_reservations',
      kakao_user_id: kakaoUserId
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    const reservations = result.reservations;
    
    if (reservations.length === 0) {
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": "현재 예약된 수업이 없습니다."
              }
            }
          ],
          "quickReplies": [
            {
              "label": "수업 예약",
              "action": "message",
              "messageText": "수업 예약"
            }
          ]
        }
      };
    }
    
    let message = `📅 예약 내역\n\n`;
    reservations.forEach(r => {
      const classInfo = r.class;
      const instructorName = classInfo.instructor?.name || '미정';
      message += `📅 ${classInfo.date} ${classInfo.time}\n`;
      message += `👨‍🏫 ${instructorName}\n`;
      message += `📊 상태: ${r.status}\n\n`;
    });
    
    return {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": message
            }
          }
        ],
        "quickReplies": [
          {
            "label": "예약 취소",
            "action": "message",
            "messageText": "예약 취소"
          },
          {
            "label": "수업 예약",
            "action": "message",
            "messageText": "수업 예약"
          }
        ]
      }
    };
  }
}
```

## 🔧 환경 변수 설정

```bash
# .env.local
NEXT_PUBLIC_KAKAO_BOT_ID=your_kakao_bot_id
KAKAO_CHATBOT_ID=your_kakao_bot_id
```

## 📊 관리자 기능

### 1. 회원 등록 후 자동 온보딩

- **위치**: `/member` 페이지
- **기능**: 
  - 회원 등록 완료 후 자동으로 온보딩 모달 표시
  - 카카오챗봇 링크 자동 생성
  - 링크 복사, 메시지 템플릿, QR코드 제공
  - 전달 방법 안내

### 2. 임시 회원 관리

- **위치**: `/member` 페이지
- **기능**: 
  - 임시 회원 목록 조회
  - 정식 회원으로 전환
  - 회원 정보 수정

### 3. 회원 매핑 상태 확인

- **위치**: 데이터베이스 뷰 `member_mapping_status`
- **정보**:
  - 매핑된 회원
  - 임시 회원
  - 미매핑 회원

### 4. 통계 정보

```sql
SELECT * FROM get_member_stats();
```

## 🚀 배포 후 설정

1. **Supabase 데이터베이스 업데이트**
   ```bash
   # supabase_member_updates.sql 실행
   ```

2. **환경 변수 설정**
   - Vercel 대시보드에서 환경 변수 추가

3. **카카오챗봇 스킬 설정**
   - 위의 스킬 코드를 카카오챗봇 빌더에 적용

4. **테스트**
   - 관리자 회원 등록 → 자동 온보딩 → 카카오챗봇 링크 전달 → 사용자 인증 테스트
   - 신규 사용자 카카오챗봇 접속 → 임시 회원 생성 테스트

## 🔍 문제 해결

### 1. 인증 실패
- 전화번호 형식 확인
- 이름 정확성 확인
- 데이터베이스 연결 상태 확인

### 2. 임시 회원 생성 실패
- Supabase 권한 설정 확인
- `is_temp` 컬럼 존재 여부 확인

### 3. API 호출 실패
- CORS 설정 확인
- API 엔드포인트 URL 확인
- 네트워크 연결 상태 확인

### 4. userRequest.user.id 관련 문제
- 카카오챗봇 스킬에서 올바른 변수명 사용 확인
- API 호출 시 kakao_user_id 파라미터 전달 확인

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. 브라우저 개발자 도구의 네트워크 탭
2. Vercel 로그
3. Supabase 로그
4. 카카오챗봇 빌더 로그
