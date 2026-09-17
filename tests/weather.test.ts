import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HourlyChart } from '../src/components/hourly-chart';
import {
  normalizeForecast,
  moonInfo,
  type RawForecast,
} from '../src/lib/forecast';
import {
  localDate,
  localTime,
  tripStatus,
  sunnyWishStatus,
  warnings,
  starVerdict,
  temperatureDomain,
} from '../src/lib/weather';
function fixture(): RawForecast {
  const time = ['2026-09-23', '2026-09-24', '2026-09-25'].flatMap((d) =>
    Array.from(
      { length: 24 },
      (_, i) => `${d}T${String(i).padStart(2, '0')}:00`,
    ),
  );
  const values = (n: number) => time.map(() => n);
  return {
    current: {
      temperature_2m: 10,
      apparent_temperature: 8,
      weather_code: 0,
      is_day: 1,
    },
    hourly: {
      time,
      temperature_2m: values(10),
      apparent_temperature: values(8),
      precipitation_probability: values(0),
      precipitation: values(0),
      snowfall: values(0),
      weather_code: values(0),
      cloud_cover: values(20),
      wind_speed_10m: values(2),
      wind_gusts_10m: values(4),
      is_day: time.map((t) =>
        +t.slice(11, 13) >= 7 && +t.slice(11, 13) < 19 ? 1 : 0,
      ),
    },
    daily: {
      time: ['2026-09-23', '2026-09-24', '2026-09-25'],
      sunrise: ['2026-09-23T06:40', '2026-09-24T06:41', '2026-09-25T06:42'],
      sunset: ['2026-09-23T18:50', '2026-09-24T18:48', '2026-09-25T18:46'],
    },
  };
}
test('몽골 날짜와 시각은 기기 시간대와 독립적', () => {
  const instant = new Date('2026-09-22T16:30:00Z');
  assert.equal(localDate(instant), '2026-09-23');
  assert.equal(localTime(instant), '00:30');
  assert.equal(tripStatus('2026-09-17'), '출발 D-6');
  assert.equal(tripStatus('2026-09-25'), '여행 3일차');
  assert.equal(tripStatus('2026-09-26'), '여행 끝');
  assert.equal(sunnyWishStatus('2026-09-17'), '햇님 기원 D-1');
  assert.equal(sunnyWishStatus('2026-09-18'), '햇님 기원 1일차');
  assert.equal(sunnyWishStatus('2026-09-25'), '햇님 기원 8일차');
});
test('방문 순서, 24시간, 숙박 밤하늘, 마지막 날에도 첫날 유지', () => {
  const result = normalizeForecast(
    [fixture(), fixture(), fixture()],
    new Date('2026-09-25T00:00:00Z'),
  );
  assert.deepEqual(
    result.days.map((d) => d.places.map((p) => p.place)),
    [
      ['ub', 'desert'],
      ['desert', 'terelj'],
      ['terelj', 'ub'],
    ],
  );
  assert.ok(
    result.days.every((d) => d.places.every((p) => p.hours.length === 24)),
  );
  assert.equal(result.days[0].places[0].night, undefined);
  assert.equal(result.days[0].places[1].night?.cloudAvg, 20);
  assert.ok(result.days[1].places[1].night);
  assert.equal(result.days[2].places[0].night, undefined);
});
test('안개는 흐림보다 나쁘고 비보다 좋음', () => {
  const raw = fixture();
  raw.hourly.weather_code[8] = 48;
  raw.hourly.weather_code[9] = 3;
  let result = normalizeForecast([raw, fixture(), fixture()]);
  assert.equal(result.days[0].places[0].summary?.code, 48);
  raw.hourly.weather_code[10] = 51;
  result = normalizeForecast([raw, fixture(), fixture()]);
  assert.equal(result.days[0].places[0].summary?.code, 51);
});
test('null 강수확률을 0으로 만들지 않고 불완전한 하루를 숨김', () => {
  const raw = fixture();
  raw.hourly.precipitation_probability = raw.hourly.time.map(() => null);
  let result = normalizeForecast([raw, fixture(), fixture()]);
  assert.equal(result.days[0].places[0].summary?.precipProbMax, null);
  raw.hourly.temperature_2m[0] = null;
  result = normalizeForecast([raw, fixture(), fixture()]);
  assert.deepEqual(result.days[0].places[0].hours, []);
  assert.equal(result.days[0].places[0].summary, null);
});
test('경고 기준의 경계값과 공유 온도 범위', () => {
  const places = normalizeForecast([fixture(), fixture(), fixture()]).days[0]
    .places;
  const s = places[0].summary!;
  assert.deepEqual(
    warnings({
      ...s,
      precipProbMax: 50,
      snowSum: 0.1,
      gustMax: 12,
      feelsMin: 0,
    }),
    ['비 가능성 높음', '눈 예보', '돌풍 강함', '체감 영하'],
  );
  assert.deepEqual(warnings({ ...s, precipProbMax: null, precipSum: 0.5 }), [
    '비 가능성 높음',
  ]);
  places[1].hours[0].feels = -12;
  const domain = temperatureDomain(places);
  assert.ok(domain[0] <= -12 && domain[1] >= 10);
});
test('밤하늘 판정은 구름과 달 밝기·떠 있는 상태 사용', () => {
  const n = moonInfo('2026-09-23', 'desert', 20);
  assert.equal(
    starVerdict({ ...n, moonIllumination: 50, moonUp: true }),
    '별 보기 어려움',
  );
  assert.equal(
    starVerdict({ ...n, moonIllumination: 50, moonUp: false }),
    '별 보기 좋음',
  );
  assert.equal(
    starVerdict({ ...n, moonIllumination: 0, cloudAvg: 60 }),
    '별 보기 어려움',
  );
  assert.equal(starVerdict({ ...n, cloudAvg: null }), '구름 예보 대기');
  for (const event of [n.moonrise, n.moonset])
    if (event) assert.equal(localDate(new Date(event)), '2026-09-23');
});
test('시간별 차트는 3시간 간격과 최저·최고 기온값, 시간 축을 표시', () => {
  const place = normalizeForecast([fixture(), fixture(), fixture()]).days[0]
    .places[0];
  place.hours[1].temp = -2;
  place.hours[22].temp = 20;
  const html = renderToStaticMarkup(
    createElement(HourlyChart, {
      data: place,
      domain: temperatureDomain([place]),
      date: '2026-09-23',
      now: new Date('2026-09-23T02:00:00Z'),
    }),
  );
  assert.equal((html.match(/class="temp-label/g) ?? []).length, 10);
  assert.ok(html.includes('시간 (시)'));
  assert.ok(html.includes('탭·드래그해서 시간별 보기'));
});
