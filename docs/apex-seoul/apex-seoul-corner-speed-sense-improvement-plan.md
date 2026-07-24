# Apex Seoul 코너 통과 속도감 개선 계획

갱신일: 2026-07-22

상태: CSS-1~CSS-4 구현 및 자동 검증 완료. 현재 코너 속도감 기준선으로 마감하며 CSS-5 추가 연장은 [후순위 보류 백로그 D-04](./apex-seoul-deferred-backlog.md)로 이동했다.

> 2026-07-23 후속 실주행에서 CSS 코너 압축과 U2 `2.00` 조합이 횡관성 작용 시간을 줄이는 사실을 확인했다. CSS의 화면 흐름 성과는 유지하지만, 코너 gameplay 계약은 [속도대별 핸들링 CH-0~CH-5](./apex-seoul-speed-band-handling-plan.md#2026-07-23-무입력-코너-관성-재검증)에서 다시 검증한다. 물리·단위 계약을 먼저 고치며 CSS 코너 길이를 즉시 원복하지 않는다.

## 목표

현재 승인된 핸들링, 코너 속도 손실, Raven Coupe의 표시 km/h와 구동계를 유지하면서 코너가 화면에서 더 빠르게 지나가게 만든다.

이번 작업의 질문은 “차를 더 빠르게 만들 것인가”가 아니라 다음과 같다.

```text
같은 진입 속도와 같은 물리 이동량
  → 코너의 시간적 길이를 줄이고
  → 가까운 표식의 통과 사건을 늘리고
  → entry / apex / exit 전환을 더 자주 보여서
  → 실제보다 느슨하게 늘어진 코너 체감을 제거한다
```

## 변경하지 않을 기준

- 표시 속도와 `760 unit = 225km/h` 선형 환산
- 엔진 출력, 기어비, 0-100km/h와 최고속 평형
- 현재 grip/understeer/drift 물리와 조작 응답
- corner demand, 목표 속도, line loss와 guardrail collision 기준
- 차량 화면 anchor와 grip/drift sprite 정책
- 상시 camera shake나 과도한 speed-line 의존

속도감을 위해 `camera.z`에 배율을 곱하지 않는다. 이 값은 코스 진행, 코너 판정, road object와 collision이 공유하므로 시각 이동만 빠르게 만들면 물리 좌표와 화면 좌표가 분리된다.

## 현재 진단

### 1. 직선 cadence 개선만으로 코너 체감은 해결되지 않았다

SH-3 이후 lane dash와 commitment reflector는 한 segment 주기로 흐른다. 이론상 통과량은 150km/h에서 약 `2.11/s`, 185km/h에서 약 `2.60/s`, 225km/h에서 약 `3.17/s`다.

직선에서는 속도 band를 구분할 수 있지만, 코너에서는 다음 이유로 체감 사건 수가 더 적다.

- lane dash가 원근과 곡률 때문에 중앙으로 겹친다.
- guardrail과 옹벽의 continuous span은 하나의 긴 덩어리처럼 보인다.
- reflector는 commitment/wall-run profile에만 존재한다.
- 나무와 먼 배경은 공간을 설명하지만 near-field 속도 cue가 아니다.

### 2. 코너의 물리 길이보다 시간적 길이가 크다

현재 Bugak Ridge Downhill은 `284 segment`, `68,160 unit`이다. `qa:road-rhythm` 기준 강한 commitment run은 `15~27 segment`이며 가장 긴 구간은 `6,480 unit`이다.

| commitment 길이 | 130km/h | 150km/h | 185km/h |
| ---: | ---: | ---: | ---: |
| 15 segment | 약 8.2초 | 약 7.1초 | 약 5.8초 |
| 20 segment | 약 10.9초 | 약 9.5초 | 약 7.7초 |
| 27 segment | 약 14.8초 | 약 12.8초 | 약 10.4초 |

같은 방향의 강한 곡률이 10초 이상 유지되면 화면에서는 코너를 통과한다기보다 긴 곡선 위에 머무는 것처럼 느껴진다. 이번 피드백의 1차 원인으로 본다.

### 3. 코스 연장은 속도감의 직접 해법이 아니다

segment 수만 늘리면 플레이 시간은 길어지지만 초당 통과량은 바뀌지 않는다. 코스를 늘릴 경우에는 다음 구조로 늘린다.

- 강한 코너의 commitment 구간은 짧게 압축한다.
- 확보된 길이는 고속 recovery, easy sweep, 짧은 S 전환으로 재배치한다.
- 전체 코스 길이는 늘어도 한 코너에 머무는 시간은 줄인다.

## 목표 수치

| 항목 | 현재 | 1차 목표 |
| --- | ---: | ---: |
| 강한 commitment run | 15~27 segment | 8~14 segment |
| 강한 코너 체류 시간 | 최대 약 10~15초 | 약 4~8초 |
| 130~185km/h 코너 near marker | 약 1.8~2.6 pass/s | 4~6 pass/s |
| entry→apex 또는 apex→exit 구간 | 긴 단일 변화 | 각각 2~4초 안에 읽힘 |
| 전체 코스 | 284 segment | 후보 340~380 segment |
| 물리/표시 속도 변화 | 기준선 | 변화 없음 |

전체 코스 `340~380 segment`는 확정값이 아니라 코너 압축 후 고속 recovery 구간을 추가할 때의 후보 범위다. 첫 prototype의 체감과 총 주행 시간을 측정한 뒤 결정한다.

## 실행 계획

### CSS-1 — 코너 전용 속도감 기준선

직선 중심의 SH 측정과 별도로 코너 entry/apex/exit를 자동 측정한다.

기준 코너:

- 첫 right commitment: 가장 긴 27-segment run
- 대표 left commitment: 20-segment run
- 후반 짧은 right/left: 15~18-segment run
- 비교 control: recovery straight와 easy sweep

고정 속도:

```text
110 / 130 / 150 / 185km/h
```

남길 값:

- entry, apex, exit segment와 각 구간 체류 시간
- 실제 km/h, raw world speed, corner loss와 understeer
- visible lane dash, reflector, post 수
- near marker pass rate와 screen velocity
- curve sign/strength 변화 횟수
- 1× WebGL 캡처와 10초 영상 또는 연속 frame strip

완료 조건:

- 느리게 보이는 현상이 낮은 실제 속도 때문인지, 긴 코너 시간 때문인지, marker 부족 때문인지 숫자로 분리된다.
- 이후 후보는 같은 시작 속도와 같은 입력 replay로 비교한다.

### CSS-2 — 한 개 코너를 짧고 빠른 prototype으로 재구성

전체 코스를 한 번에 바꾸기 전에 첫 27-segment commitment만 후보 코스로 만든다.

구성 원칙:

```text
2~3 segment turn-in
  → 5~7 segment peak commitment
  → 2~3 segment exit unwind
```

- 강한 구간 전체를 `10~14 segment` 안에 둔다.
- peak curve와 road width는 현재 corner grade 범위를 유지한다.
- 곡률 변화는 smoothstep을 유지하고 1~2 segment에서 부호나 강도가 튀지 않게 한다.
- 줄어든 코너 길이는 바로 다음 recovery straight/easy sweep에 재배치한다.
- 기존보다 감속 상수를 키우거나 target speed를 낮추지 않는다.

승인 기준:

- 동일 진입 속도에서 코너 체류 시간이 기준선보다 `30~50%` 감소한다.
- entry/apex/exit가 각각 구분된다.
- 최대 understeer, exit speed loss와 rail 접근은 기존 관계형 gate 안에 남는다.
- 사용자 A/B에서 후보가 더 빠르게 지나가되 조작할 시간이 사라지지 않는다.

### CSS-3 — 코너 near-field flow를 4~6Hz로 강화

segment geometry를 잘게 쪼개지 않고 렌더 표식만 fractional Z에 추가한다. 이 방식은 코스 물리와 handling을 보존한다.

우선 적용:

1. `abs(curve) >= 0.18` 구간의 lane dash를 segment당 2개 후보로 비교한다.
2. commitment/wall-run의 바깥쪽 reflector를 segment당 2개로 늘린다.
3. continuous guardrail과 wall에 짧은 반사 seam 또는 edge stud를 추가한다.
4. near distance에서만 두 번째 표식이 선명해지는 LOD/fade를 적용한다.

150km/h에서 `0.5 segment = 120 unit` 간격은 약 `4.22 pass/s`, 185km/h에서는 약 `5.21 pass/s`다. 이 범위를 1차 목표로 사용한다.

과밀 방지 규칙:

- guardrail post 자체는 첫 반복에서 늘리지 않는다.
- chevron은 코너 방향 안내 역할을 유지하고 일반 motion marker로 사용하지 않는다.
- 먼 거리에서는 추가 marker alpha를 낮추거나 하나로 합친다.
- city, moon, cloud와 원경 숲의 이동 속도는 늘리지 않는다.
- 좌우를 동시에 같은 밀도로 채우지 않고 바깥쪽 edge를 주 cue로 사용한다.

### CSS-4 — 전체 코스 리듬 재편과 선택적 연장

prototype 승인 뒤 나머지 5개 commitment run에 같은 원칙을 적용한다.

목표 리듬:

```text
고속 recovery 6~10초
  → turn-in 2~3초
  → peak commitment 2~4초
  → exit unwind 2~3초
  → 짧은 straight 또는 반대 방향 예고
```

- 현재 15~27 segment commitment를 `8~14 segment` 중심으로 재편한다.
- 모든 코너를 sharp로 만들지 않고 easy sweep을 고속 구간으로 적극 사용한다.
- 코너 압축으로 전체 주행 시간이 너무 짧아지면 fast recovery/easy section을 추가한다.
- 코스 연장 후보는 `+56~96 segment`, 총 `340~380 segment`다.
- 추가 구간은 최고속 직선만 반복하지 않고 `grip sweep → short commitment → S transition → recovery`의 sector 역할을 갖는다.
- 기존 총 고저차와 downhill 방향성은 유지하되 elevation 변화가 코너마다 같은 패턴이 되지 않게 한다.

코스 연장 승인 조건:

- 총 주행 시간은 늘거나 유지되지만 한 코너 체류 시간은 줄어든다.
- 130~185km/h로 통과할 수 있는 recovery/easy 구간의 비율이 증가한다.
- sharp corner 수가 단순히 늘지 않는다.
- `qa:road-rhythm`이 segment 수뿐 아니라 초 단위 run duration을 검사한다.

### CSS-5 — 보조 카메라·shader cue

CSS-2~CSS-4로도 부족할 때만 적용한다. near-field 흐름을 대체하지 않는다.

검토 후보:

- turn-in 순간 `0.2~0.4°`의 짧은 FOV impulse
- curve 방향을 반영한 약한 peripheral streak
- apex 통과 시 짧은 road-edge luminance pulse
- drift exit가 아닌 grip exit에도 아주 작은 longitudinal release cue

상한:

- steady corner FOV는 기존 km/h envelope를 유지한다.
- 상시 shake를 추가하지 않는다.
- shader는 HUD와 차체 외곽을 흐리지 않는다.
- 코너 cue가 실제 속도가 낮은 상황을 고속으로 위장하지 않게 최소 발동 속도를 둔다.

## 구현 순서

```text
CSS-1 corner baseline
  → CSS-2 first-corner A/B
  → CSS-3 corner marker cadence A/B
  → 사용자 체감 확인
  → CSS-4 full track rhythm/extension
  → CSS-5 optional polish
```

코스 전체 수정은 CSS-2와 CSS-3의 어느 쪽이 체감 개선에 더 크게 기여하는지 확인한 다음 진행한다.

## 2026-07-22 구현 결과

### 코스 시간 구조

- Bugak Ridge Downhill을 `284 segment / 68,160 unit`에서 `348 segment / 83,520 unit`으로 확장했다.
- 기존 6개 commitment run `27 / 20 / 20 / 20 / 15 / 18 segment`를 `14 / 11 / 11 / 11 / 12 / 12 segment`로 압축했다.
- 가장 긴 commitment의 130km/h 체류 시간은 약 `14.8초 → 7.65초`, 150km/h에서는 약 `12.8초 → 6.63초`로 줄었다.
- 늘어난 길이는 24~32 segment recovery, fast easy sweep과 후반 low-demand S 구간에 배치했다.
- peak curve `0.62~0.66`, narrow road half-width `820`, 전체 고저차 `560 → -500`은 유지했다.

### 코너 near-field flow

- 직선 lane dash는 기존 한 segment 주기를 유지한다.
- `abs(curve) >= 0.18`에서는 한 segment 안에 짧은 lane dash 2개를 배치한다.
- commitment/wall-run 바깥쪽 reflector도 fractional Z 두 지점에 배치한다.
- 이론 cadence는 150km/h `4.222/s`, 185km/h `5.207/s`다.
- 첫 코너에서 시작한 120-sample Edge runtime에서는 motion anchor rolling pass rate 최대 `6/s`, 보이는 anchor `6~22개`, screen velocity 최대 `142.409px/s`를 기록했다.
- 실제 캡처에서 가까운 dash와 reflector가 분리되어 보였고 continuous guardrail, 차량, HUD를 가리지 않았다.

### 물리 보존

- 표시 km/h와 `camera.z` 진행 식은 변경하지 않았다.
- controller, engine, corner demand, understeer, drift와 collision 상수는 변경하지 않았다.
- 첫 코너의 새 easy/medium/sharp 고정 표본은 segment `21 / 26 / 31`이다.
- `qa:corner-demand-sweep`, `qa:handling-relations`, `qa:top-speed-regression`, guardrail QA와 production build가 통과했다.

### CSS-5 판단

목표한 코너 길이와 `4~6 pass/s`를 geometry/marker만으로 달성했다. turn-in FOV impulse, 추가 streak, grip-exit shader는 현 단계에서 적용하지 않는다. 사용자 실주행에서 여전히 부족할 때만 별도 A/B로 재개한다.

## 자동 QA

새 QA:

```bash
npm run qa:corner-speed-sense --workspace @games/apex-seoul
```

검사 항목:

- 코너별 entry/apex/exit duration
- 110/130/150/185km/h near marker cadence
- longest commitment duration
- corner/recovery 시간 비율
- 동일 replay의 entry/exit speed와 understeer 변화
- marker pop, one-frame visibility와 rolling pass rate

기존 회귀:

```bash
npm run qa:speed-presentation-sweep --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run qa:guardrail-projection-runtime --workspace @games/apex-seoul
npm run qa:drive-telemetry --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

## 최종 완료 조건

- HUD를 보지 않아도 코너 안에서 110/150/185km/h의 차이가 읽힌다.
- 같은 km/h에서도 기존보다 entry→apex→exit가 빠르게 전환된다.
- 150km/h 기준 코너 바깥쪽 near marker가 약 `4~6회/초` 지나간다.
- longest commitment가 목표 시간 범위 안에 들어온다.
- grip과 drift의 조작 감각, 표시 속도와 물리 corner cost가 현재 기준을 유지한다.
- 코스를 늘리더라도 느린 코너를 더 길게 복제하지 않는다.
- 최종 1× 실주행 A/B에서 사용자가 코너 통과 속도감 개선을 승인한다.

자동 기준선과 runtime 자료:

- [CSS 코너 속도감 표](../../games/apex-seoul/assets/telemetry/generated/corner-speed-sense/corner-speed-sense-baseline.md)
- [CSS 코너 runtime summary](../../games/apex-seoul/assets/telemetry/generated/corner-speed-sense/runtime/apex-seoul-drive-2026-07-22T11-30-39-386Z_curve-no-input.summary.json)
- [CSS 코너 runtime 캡처](../../games/apex-seoul/assets/telemetry/generated/corner-speed-sense/runtime/corner-flow-runtime.png)
