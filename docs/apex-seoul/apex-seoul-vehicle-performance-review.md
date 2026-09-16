# 브라우저 주행 및 차량 성능 비교

검토일: 2026-09-16. 기준: 공통 선형 속도계·코너 조향 방향 수정 이후, `time-attack-v3`.

이 문서는 변속 수정 전 v3 측정 기록이다. 현재 구현과 후속 수치는 [v4 변속 특성 검증](./apex-seoul-shift-character-review.md)을 따른다.

## 측정 방법

- 브라우저: 실제 Chromium WebGL 게임에 Playwright 키 입력을 전달한다. 반복 조건을 맞추기 위해 Phaser scene update를 60Hz로 진행하고 조향 판단·텔레메트리를 100ms마다 수집한다. 최초 4개는 WebGL 제출도 60Hz, 재개한 5개는 소프트웨어 GPU의 screenshot timeout을 피하기 위해 화면 제출만 10Hz로 낮추고 각 시나리오마다 브라우저를 새로 실행했다. 물리·입력 업데이트는 모두 60Hz다. QA 시작 위치와 속도를 사용하며 기록 저장 대상이 아니다. 이는 브라우저 통합 주행 검증이며 사람의 손으로 운전한 주관적 플레이테스트나 실제 기기 FPS 측정은 아니다.
- 성능: 실제 `createPlayerVehicleRuntimeConfig()`와 controller를 사용한 60/120Hz 시뮬레이션. 복제된 QA 설정 대신 production 설정을 직접 읽도록 `runtimeConfig`의 단순 clamp에서 Phaser 의존성을 제거했다. 기존 fixture와 공통 기본값이 일치함도 확인했다.
- 가속·제동: 평지·직선, 출발 보너스 없음. 80–120은 초기 boost 0에서 시작한다. 브레이크는 100km/h에서 가속 해제와 함께 누르며 정지 기준은 0.1km/h 미만이다.
- 코너: 실제 Bugak 도로의 `z=4500→10500`, `14200→19700`, 진입 140km/h, 공통 longitudinal scale 2. 경사·도로 폭·앞부분 가드레일 충돌을 반영한다. 동일 디지털 조향 제어기를 적용한 구간 비교이며 최적 랩타임이나 사람의 숙련도를 뜻하지 않는다. 거리 단위는 world unit으로 실제 미터가 아니다.
- lift: 조향 중 곡률 크기 0.42를 넘으면 가속을 0.4초 해제한 뒤 재가속한다. 별도 대조군에서는 가속 해제와 함께 방향키도 놓는다.

## 브라우저 주행 결과

**9/9 통과.** 세 차량의 첫 코너 grip/lift 6개, Raven의 방향키 중립 lift 대조군 1개, 반대 방향 코너 grip/lift 2개를 확인했다. 모든 시나리오가 목표 지점까지 진행했고 충돌·페이지 오류는 0회였다. 마지막 상태는 모두 grip이다.

| 브라우저 주행 | grip 시간 / 출구 속도 | lift drift 시간 / 출구 속도 |
| --- | --- | --- |
| Raven 첫 코너 | 6.0초 / 161.4km/h | 6.5초 / 148.8km/h |
| Seorin 첫 코너 | 5.2초 / 206.5km/h | 5.6초 / 193.8km/h |
| Mirae 첫 코너 | 5.4초 / 198.6km/h | 5.8초 / 183.4km/h |
| Raven 반대 코너 | 5.5초 / 159.1km/h | 6.0초 / 147.9km/h |

브라우저 종료 시점은 100ms 간격의 관측값이므로 아래 시뮬레이션의 경계 보간 시간과 직접 빼서 오차로 해석하지 않는다. 입력 제어 주기도 브라우저는 100ms, 시뮬레이션은 매 physics tick이다.

- **그립 진입·탈출:** 방향 입력에 반응하며, 이번 제어 입력에서는 drift 없이 구간을 통과했다. Raven 첫 코너의 최대 횡오프셋은 약 180 world units였다.
- **조향 유지 + 가속 해제:** 세 차량 모두 `grip → setup → drift → recovery → grip`을 거쳤다. Raven 첫 코너의 최대 횡오프셋은 약 592로 커졌고, 출구 속도도 grip보다 12.6km/h 낮았다. 차체의 강한 회전 pose와 넓어진 이동 궤적을 스크린샷 및 텔레메트리에서 확인했다.
- **조향 중립 + 가속 해제:** Raven은 drift 없이 6.1초, 출구 158.4km/h로 통과했다. 가속 해제 자체가 항상 drift를 만드는 것은 아니다. 단, 코너에서 방향키를 누른 채 속도를 줄이려는 플레이어에게는 drift 진입이 예상 밖으로 느껴질 수 있으므로 입력 안내/진입 정책은 후속 체감 검토 항목이다.
- **반대 방향:** Raven의 반대 코너도 충돌 없이 회복했다. 이 범위에서 비대칭 발사나 탈출 후 drift 고착은 관측되지 않았다. 세 차량의 모든 코너·진입속도에 대한 보증은 아니다.

[브라우저 판정·수치 JSON](./evidence/2026-09-16-driving-review/browser-summary.json) · [가속 해제 drift 화면](./evidence/2026-09-16-driving-review/raven-coupe-lift-4500-drift.png) · [탈출 화면](./evidence/2026-09-16-driving-review/raven-coupe-lift-4500-exit.png) · [반대 코너 drift](./evidence/2026-09-16-driving-review/raven-coupe-lift-14200-drift.png)

## 평지 성능

60Hz 결과. 120Hz에서 주요 가속 도달 시간과 시험 코너 구간 시간의 차이는 모두 0.05초 미만이다.

| 항목 | Raven Coupe | Seorin GT | Mirae GT |
| --- | ---: | ---: | ---: |
| 0–60km/h | 4.04초 | 5.95초 | 7.18초 |
| 0–100km/h | 8.09초 | 9.17초 | 10.83초 |
| 0–160km/h | 18.21초 | 13.46초 | 15.84초 |
| 0–200km/h | 31.18초 | 16.34초 | 19.09초 |
| 80–120km/h | 4.94초 | 3.03초 | 3.50초 |
| 100→정지 | 1.10초 | 1.10초 | 1.10초 |
| 90초 가속 후 속도 | 220.13km/h | 225.00km/h | 225.00km/h |
| 90초 가속 후 기어 | 6단 | 7단 | 5단 |

90초 후 속도는 평형 최고속도가 아니다. Seorin/Mirae는 공통 속도 상한에 도달했다. 프로파일의 목표값 230/218km/h가 실제 최고속도를 제한하거나 보장하지 않는다.

130km/h에서 gear/RPM/boost를 3초 안정화하고 0.5초 가속 해제 후 1초 재가속한 경우:

| 항목 | Raven | Seorin | Mirae |
| --- | ---: | ---: | ---: |
| 해제 전 boost | 0 | 0.915 | 0.974 |
| 해제 후 boost | 0 | 0.056 | 0.207 |
| 재가속 1초 속도 증가 | 7.09km/h | 13.62km/h | 12.52km/h |

Mirae는 압력을 더 오래 보존하지만, 이 조건에서 재가속 우위로 이어지지는 않았다.

## 실제 코스 형상에 대한 시뮬레이션

| 차량 | 첫 코너 grip 시간 / 출구 | 첫 코너 lift 시간 / 출구 | 반대 코너 grip / lift 시간 |
| --- | --- | --- | --- |
| Raven | 5.970초 / 161.67km/h | 6.414초 / 150.59km/h | 5.481 / 5.894초 |
| Seorin | 5.151초 / 206.09km/h | 5.535초 / 194.14km/h | 4.769 / 5.133초 |
| Mirae | 5.312초 / 197.94km/h | 5.728초 / 185.11km/h | 4.916 / 5.305초 |

모든 위 시뮬레이션은 충돌 0회다. 이 입력 정책에서 lift drift는 grip보다 약 0.36~0.44초 느리고 첫 코너 출구 속도도 약 11~13km/h 낮다. 다른 진입 속도·라인·급코너에서의 드리프트 효용까지 부정하는 결과는 아니다.

## 차량 프로파일 수정 우선순위

1. **도달 불가능한 상향 변속을 먼저 정리한다.** Seorin 7단 `rpmMax=6500`은 `shiftUpRpm=6650`에 도달할 수 없어 8단으로 못 올라간다. Mirae 5단도 `6700 < 6850`이므로 6단으로 못 올라간다. 실제 정지 가속 결과에서도 7/5단에 머물렀다. 속도 기반 arcade 기어 구간과 RPM 조건 중 어떤 것을 변속의 기준으로 삼을지 정한 뒤 비교를 다시 실행해야 한다.
2. **구동계·최고속도 목표를 측정 가능한 설정으로 정리한다.** Raven만 physical 기어비 기반 구동력을 쓰고 나머지는 arcade 배율을 사용한다. `accelerationScale` 숫자만으로 세 차량을 비교할 수 없다. 공통 225km/h 상한과 차량 목표값의 관계도 함께 정한다.
3. **Mirae의 유리한 상황을 만든다.** 현재 측정한 출발·재가속·두 코너 모두 Seorin보다 느리다. 압력 유지라는 차이는 있지만 기록상 이득이 아직 확인되지 않았다. 전 구간 열세라고 단정할 수는 없으나 고를 이유를 검증해야 한다.
4. **그 후 `VehicleHandlingProfile` TODO를 구현한다.** 현재 제동·조향·drift 값은 공통이다. 엔진 차이를 분리한 기준선을 확보한 후, 차량 프로파일 설정으로 장단점을 부여한다. 브레이크는 세 차 모두 100→0 약 1.1초여서 짧은 입력의 속도 감소가 크다는 점도 체감 조정 후보로 둔다.

이번 비교에서 차량별 토크·기어·핸들링 수치는 변경하지 않았다.

## 재현

```sh
npm run compare:vehicle-performance --prefix games/apex-seoul
npm run qa:driving-browser --prefix games/apex-seoul
```

기본 출력은 `/tmp/apex-vehicle-comparison`, `/tmp/apex-driving-browser`. 브라우저에는 Playwright Chromium과 해당 시스템 라이브러리가 필요하다. 이번 환경에서는 부족한 `libnspr4`, `libnss3`를 시스템 설치 없이 `/tmp`에 풀어 `LD_LIBRARY_PATH`로 연결했다.

동일 게임 소스·설정에서 중단된 브라우저 검사만 재개하려면 `npm run qa:driving-browser --prefix games/apex-seoul -- /tmp/apex-driving-browser --resume`을 사용한다. 게임 코드나 설정이 바뀌었다면 다른 출력 경로로 새로 측정해야 한다. 요약 JSON과 대표 스크린샷은 이 문서의 evidence 폴더에 보존했다. 대용량 원본 텔레메트리는 `/tmp` 출력에 있다.

검증: 비교 스크립트의 60/120Hz 일관성·충돌 검사, 브라우저 9개 시나리오, `qa:speed-units`, `qa:runtime-qa-state`, `qa:gameplay-hud`, Vite build 통과. 기존 프로젝트 전체 타입 오류와 저속 조향 QA의 기존 실패는 [주행 기준선 점검](./apex-seoul-driving-baseline-review.md)의 범위를 유지한다.

[성능 측정 요약 JSON](./evidence/2026-09-16-driving-review/vehicle-performance.json)
