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
- 구글 지도 캠프 장소 링크와 날짜별 길찾기를 iOS·Android에서 확인. 몽골 길찾기가 지원되지 않으면 경로 버튼 제외.
- 마지막 여행일에 이전 날짜 예보 유지 확인.

데이터: https://open-meteo.com/en/docs · 달 계산: https://github.com/mourner/suncalc

## 날짜별 SVG 지도

기본 화면은 날씨이며, 상단 ‘위치·경로 지도’ 탭에서 방문 장소 목록, 도로 경로, 방문 순서, 축척, 북쪽 표시를 볼 수 있습니다. 두 화면은 선택한 날짜를 공유합니다. 9/24 테를지와 9/25 시내는 별도 확대 박스로 표시합니다. 지도는 날씨 응답과 무관하게 렌더링되며 앱 실행 중 지도 API나 타일을 요청하지 않습니다. 장소 링크를 누르면 외부 구글 지도가 열립니다. 기존과 같이 완전 오프라인 최초 페이지 로드는 지원하지 않습니다.

- 장소·캠프 링크·방문 순서: `src/config/pois.ts`
- 확대 박스 위치·라벨·강제 직선 구간: `src/config/map-layout.ts`
- 빌드에 포함되는 도형: `src/generated/day-maps.json` (12KB 이하)
- 원본 OSRM 응답과 조회 실패 캐시: `scripts/cache/`
- 생성 미리보기: `scripts/preview/YYYY-MM-DD.html`

```sh
npm run maps:build                 # 캐시에 없는 구간만 1초 간격 조회
npm run maps:build -- --offline    # 외부 요청 없이 저장된 경로로 재생성
npm run maps:build -- --retry-failed # 실패한 구간 재시도
```

POI 좌표를 바꾸면 캐시의 좌표 서명이 달라져 해당 경로만 다시 조회합니다. 라벨·배치만 바꾸면 오프라인으로 재생성할 수 있습니다. 생성 JSON은 저장소에 포함하므로 일반 `npm run build` 및 Vercel 배포에서는 OSRM 요청이 발생하지 않습니다. 실제 도로로 확인하지 못한 구간 및 도로에서 목적지까지의 연결은 점선입니다. 경로 데이터는 OSRM / OpenStreetMap 출처이며 실제 차량 진입 가능 여부는 현장에서 확인해야 합니다.

확정 캠프 날씨 좌표로 변경하면서 예전 좌표 예보가 표시되지 않도록 localStorage 캐시 키를 v2로 변경했습니다. 원본 기능의 동작은 유지합니다.
