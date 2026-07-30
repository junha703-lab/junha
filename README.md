# 대전양지초 교원 역량지도

교원이 16개 문항을 5점 리커트 척도로 진단하고, 4월·10월·1월의
7개 역량 변화를 7각형 그래프로 확인하는 웹앱입니다.

진단 결과에서 가장 낮은 역량을 찾아 다음 자료도 제공합니다.

- 대전교육연수원에서 확인할 추천 검색어 3개
- 카카오 도서 검색 API에서 확인된 중복 없는 실제 도서 3권
- 웹앱 안에서 이용하는 실제 도서 직접 검색
- 사용자별 추천 이력과 공용 도서 검색 캐시

## 기술 구성

- Next.js 16 / React 19
- Supabase Postgres, RLS, 보안 함수 기반 자체 세션
- Kakao 책 검색 REST API
- GitHub → Vercel 자동 배포
- OpenAI Sites 배포

## 환경변수

로컬 개발은 `.env.local`, Vercel은 프로젝트의
`Settings → Environment Variables`에 다음 값을 설정합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
KAKAO_REST_API_KEY=카카오_디벨로퍼스_REST_API_키
```

`KAKAO_REST_API_KEY`는 반드시 서버 환경변수로만 설정합니다.
`NEXT_PUBLIC_` 접두사를 붙이거나 클라이언트 코드에 작성하지 마세요.
Supabase Service Role Key는 이 기능에 필요하지 않으며 사용하지 않습니다.

### 카카오 REST API 키 발급

1. [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션을
   생성합니다.
2. 앱의 `앱 키` 메뉴에서 **REST API 키**를 복사합니다.
3. Vercel의 `KAKAO_REST_API_KEY`에 저장합니다.
4. 환경변수 저장 후 새 Production 배포를 실행합니다.

키가 없거나 카카오 API에 장애가 발생하면 도서 영역만 오류 상태를
표시하고, 대전교육연수원 검색어 추천은 계속 작동합니다.

## Supabase 설정

기존 인증·평가 테이블을 먼저 구성한 뒤 다음 마이그레이션을 순서대로
실행합니다.

```text
supabase/migrations/20260730_teacher_login.sql
supabase/migrations/20260730_admin_dashboard.sql
supabase/migrations/20260730_growth_recommendations.sql
```

추천 마이그레이션은 다음 구조를 추가합니다.

- `growth_recommendations`: 사용자·평가월·평가시점별 추천 이력
- `growth_book_cache`: 검색 조건별 도서 결과 30일 캐시
- `recommendation_context`: 세션 검증 후 현재 평가의 최저 역량 계산
- `recommendation_save`: 평가시점과 최저 역량을 재검증한 뒤 추천 저장
- `recommendation_history_load`: 로그인 사용자의 추천 이력만 반환
- `recommendation_book_cache_get/put`: 서버 요청의 공용 도서 캐시 처리

두 테이블은 RLS가 활성화되어 있고 `anon`, `authenticated`의 직접 접근은
차단됩니다. 클라이언트는 세션 토큰을 검증하는 `security definer` 함수로만
자기 이력에 접근합니다.

## 추천 동작

### 연수

대전교육연수원의 공개·안정적 과정 검색 API가 확인되지 않아 실제 과정명을
추측하지 않습니다. 검색 결과가 잘 나오는 짧은 핵심어 3개를 제시하며,
공용 검색창 한 곳에서 검색어를 선택하거나 직접 입력해
[대전교육연수원 공식 통합검색](https://www.teti.kr/homepage/search/selectTotalSearchList.do)
으로 연결합니다.

### 도서

`POST /api/recommendations/books`가 서버에서만 카카오 API를 호출합니다.
외부 API에는 역량별 검색어만 전송하며 이름, 학교명, 비밀번호, 세션 토큰은
전송하지 않습니다. 제목·저자·상세 URL이 모두 있는 카카오 응답만 화면에
표시합니다. 기본 추천은 초등학교 관련성을 우선하며 제목을 정규화해 같은
책의 표기·판본 차이로 인한 중복을 제거합니다. 화면의 도서 검색창은 동일한
서버 API를 사용해 실제 도서를 최대 6권까지 보여 줍니다.

## 로컬 실행과 검증

```bash
npm install
npm run dev
npx tsc --noEmit
npx next build
npm run build
```

- `npx next build`: Vercel용 Next.js 빌드
- `npm run build`: Sites용 vinext 빌드

## 배포 확인

1. GitHub `main` 브랜치에 푸시합니다.
2. Vercel의 새 배포가 해당 커밋을 사용했는지 확인합니다.
3. 도서 카드가 설정되지 않았다면 Vercel의
   `KAKAO_REST_API_KEY`와 새 배포 여부를 확인합니다.
4. 평가를 저장한 계정으로 로그인해 연수 3개와 도서 3개가 독립적으로
   표시되는지 확인합니다.
