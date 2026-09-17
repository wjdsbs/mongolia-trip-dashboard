# 몽골, 우리의 3일

2026년 9월 23–25일 몽골 여행용 모바일 날씨 웹입니다. Next.js App Router, React, TypeScript, SVG 차트, SunCalc를 사용합니다.

## 실행

```sh
npm install
npm run dev
```

http://127.0.0.1:3000 에서 확인합니다. Windows PowerShell에서 실행 정책으로 npm이 막히면 `npm.cmd`를 사용합니다. API 키나 환경변수는 필요 없습니다.

## 검증

```sh
npm test
npm run typecheck
npm run build
```

## Vercel 배포

저장소를 Vercel에 연결하고 Next.js 프리셋으로 배포합니다. 빌드 명령은 `npm run build`, 출력 설정은 기본값입니다. 정적 내보내기가 아닌 서버 배포가 필요합니다. `/api/weather`가 외부 Open-Meteo API를 호출합니다.

## 동작

- `src/config/trip.ts`: 날짜, 방문 순서, 숙박, 대략 좌표.
- `/api/weather`: 세 좌표를 한 번에 조회하고 15분 캐시. 과거 2일과 미래 16일 요청.
- 현재 값과 24시간 예보가 누락되면 임의 데이터를 대신 표시하지 않습니다.
- 몽골 현지 날짜와 시간은 `Asia/Ulaanbaatar` 기준. 달 사건은 UTC 이웃 날짜에서 계산 후 몽골 하루로 자릅니다.
- 밤 구름량은 21:00, 22:00, 23:00 평균입니다. 24:00은 다음 날의 시작으로 제외합니다.
- localStorage 저장 예보를 먼저 표시하고 갱신합니다. 탭 복귀 시 15분 경과하면 갱신하며, 정기 예보 폴링은 없습니다.
- API 오류 시 이전 예보를 유지합니다. 완전 오프라인에서 최초 페이지 로드는 지원하지 않습니다.
- 시스템 라이트/다크 테마, 차트 터치 및 좌우 방향키, 접근성 날짜 탭을 지원합니다.

## 최종 배포 전 확인

- 360px 화면에서 넘침 및 차트 터치 조작 확인.
- iOS Safari와 Android Chrome에서 날짜 전환, 저장 예보, 연결 실패 배너 확인.
- 두 캠프의 실제 좌표 확인.
- 마지막 여행일에 이전 날짜 예보 유지 확인.

데이터: https://open-meteo.com/en/docs · 달 계산: https://github.com/mourner/suncalc
