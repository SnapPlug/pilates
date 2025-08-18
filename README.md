This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

4. 환경 변수 설정:
   - `.env.local` 파일에 카카오챗봇 ID 추가:
   ```
   KAKAO_CHATBOT_ID=your_chatbot_id_here
   KAKAO_CUSTOM_DOMAIN=your_custom_domain_here (선택사항)
   NEXT_PUBLIC_KAKAO_BOT_ID=your_chatbot_id_here
   ```

### 카카오톡 챗봇 연동
- **사용자 식별 시스템**: 회원 등록 시 카카오톡 ID와 사용자 식별키를 설정하여 카카오챗봇에서 사용자 인식 가능
- **API 엔드포인트**: `/api/member/identify` - 카카오챗봇에서 사용자 정보 조회
- **식별 방법**: 카카오 ID, 사용자 식별키, 전화번호 중 하나로 사용자 식별
- **응답 데이터**: 회원 정보, 회원권 상태, 잔여 횟수, 포인트, 회원권 히스토리

#### 외부 링크 돌아오기 처리
예약 페이지에서 완료 후 카카오톡으로 돌아올 때 자동으로 완료 메시지를 보여주는 기능:

**1. 예약 페이지 설정**
- 예약 완료 시: `https://pf.kakao.com/_YOUR_BOT_ID/chat?return=completed&uid=사용자ID`
- 예약 취소 시: `https://pf.kakao.com/_YOUR_BOT_ID/chat?return=cancelled&uid=사용자ID`
- 예약 변경 시: `https://pf.kakao.com/_YOUR_BOT_ID/chat?return=changed&uid=사용자ID`

**2. 카카오톡 챗봇 스킬 설정**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "🎉 예약이 완료되었습니다!\n\n예약일시: 2024년 1월 15일 오후 2시\n예약자: 홍길동\n예약종류: 필라테스 1회권"
        }
      }
    ],
    "quickReplies": [
      { "label": "예약확인", "action": "message", "messageText": "예약확인" },
      { "label": "예약변경", "action": "message", "messageText": "예약변경" },
      { "label": "홈으로", "action": "message", "messageText": "홈" }
    ]
  }
}
```

**3. URL 파라미터 감지**
카카오톡 챗봇에서 `return` 파라미터를 감지하여 적절한 메시지 표시:
- `return=completed`: 예약 완료 메시지
- `return=cancelled`: 예약 취소 메시지  
- `return=changed`: 예약 변경 메시지

**4. 카카오톡 챗봇 스킬 예시**
```javascript
// 카카오톡 챗봇 스킬에서 URL 파라미터 감지
function handleReturnFromWeb() {
  const urlParams = new URLSearchParams(window.location.search);
  const returnStatus = urlParams.get('return');
  const uid = urlParams.get('uid');
  
  switch(returnStatus) {
    case 'completed':
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": "🎉 예약이 완료되었습니다!\n\n예약이 성공적으로 처리되었습니다."
              }
            }
          ],
          "quickReplies": [
            { "label": "예약확인", "action": "message", "messageText": "예약확인" },
            { "label": "홈으로", "action": "message", "messageText": "홈" }
          ]
        }
      };
      
    case 'cancelled':
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": "✅ 예약이 취소되었습니다.\n\n예약이 성공적으로 취소되었습니다."
              }
            }
          ],
          "quickReplies": [
            { "label": "새 예약", "action": "message", "messageText": "예약하기" },
            { "label": "홈으로", "action": "message", "messageText": "홈" }
          ]
        }
      };
      
    case 'changed':
      return {
        "version": "2.0",
        "template": {
          "outputs": [
            {
              "simpleText": {
                "text": "🔄 예약이 변경되었습니다.\n\n예약이 성공적으로 변경되었습니다."
              }
            }
          ],
          "quickReplies": [
            { "label": "예약확인", "action": "message", "messageText": "예약확인" },
            { "label": "홈으로", "action": "message", "messageText": "홈" }
          ]
        }
      };
      
    default:
      return null; // 기본 메시지 표시
  }
}
```

### 3. 수업 관리
- 수업 일정 관리
- 수업별 정원 관리
- 수업 참석자 현황
- **수업 추가 기능**: 캘린더 우측 상단 + 버튼으로 수업 추가
- **강사 배정**: 수업별 담당 강사 설정
- **수업 메모**: 수업에 대한 추가 정보 입력
- **시간 선택**: 1시간 단위 드롭다운 (오전/오후 표시)
- **정원 설정**: 1~6명 드롭다운 (기본값: 3명)
- **강사 연동**: Supabase instructor 테이블과 실시간 연동

### 문제 해결
**회원권 추가 시 "저장 중 오류가 발생했습니다" 에러가 발생하는 경우:**

1. **테이블 확인**: `/check-table` 페이지에서 membership_history 테이블 상태 확인
2. **디버그 페이지 확인**: `/debug-supabase` 페이지에서 Supabase 연결 상태 확인
3. **테스트 페이지 확인**: `/test-membership` 페이지에서 테이블 연결 상태 확인
4. **수업 테이블 확인**: `/debug-class-table` 페이지에서 class 테이블 구조 및 삽입 테스트
5. **Supabase 설정 확인**:
   - SQL Editor에서 `supabase_membership_history.sql` 실행
   - RLS 정책이 올바르게 설정되었는지 확인
6. **브라우저 콘솔 확인**: 개발자 도구에서 상세한 에러 메시지 확인
7. **필수 필드 입력**: 회원권 종류와 시작일은 반드시 입력
