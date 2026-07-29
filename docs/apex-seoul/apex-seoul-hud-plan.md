# Apex Seoul HUD 설계: debug overlay와 gameplay HUD 분리

갱신일: 2026-07-29

상태: 설계. `D` 키로 현재 debug HUD를 켜고 끌 수 있다. gameplay HUD는 time attack records·ghost vehicle 작업과 함께 별도 pass로 구현한다.

## 판단

현재 `hud.ts`는 물리·투영·QA 수치를 한 text block으로 노출하는 **debug HUD**다. 플레이 화면에 필요한 속도, RPM, 기록 정보와 같은 역할로 확장하지 않는다.

HUD는 아래 두 계층으로 분리한다.

```text
debug HUD       → 개발·QA용 진단값, D toggle, 기본 on
gameplay HUD    → 플레이어 정보, 일반 플레이에서 기본 on
run result UI   → finish/countdown/checkpoint 사건, gameplay HUD와 별도
```

`D`는 debug HUD만 제어한다. countdown, checkpoint notice, finish result와 이후 gameplay HUD를 숨기지 않는다.

## 가시성 계약

초기 구현은 Scene이 `debugHudVisible: boolean`을 소유하며 `D`로 토글한다. 이후에는 다음처럼 명시적 preference/config를 둔다.

```ts
type HudVisibility = {
  debug: boolean;
  gameplay: boolean;
};
```

- `debug` 기본값은 개발 환경에서 `true`, 일반 release에서는 `false`를 목표로 한다.
- `gameplay` 기본값은 항상 `true`다. 접근성·스크린샷 목적의 숨김 옵션은 별도 설정으로만 제공하며 `D`에 묶지 않는다.
- URL QA override나 local preference를 추가할 때도 `debugHud`와 `gameplayHud`를 별도 boolean으로 검증한다.
- debug HUD의 collision banner도 debug 계층에 속한다. 게임플레이용 충돌 피드백이 필요해질 경우, 짧은 비진단 cue를 gameplay HUD에 별도로 만든다.

## Gameplay HUD 화면 배치

차량이 화면 하단 중앙에 고정되는 현재 presentation과 road/progress line을 피하기 위해 세 영역만 쓴다.

```text
┌ time / sector / delta ────────────────────────────────┐
│                                                        │
│                                                        │
│                                                        │
│ speed + gear + RPM                             ghost Δ │
└────────────── progress line / checkpoint ticks ───────┘
```

| 영역 | 기본 정보 | 표현 규칙 |
| --- | --- | --- |
| 상단 좌측 | elapsed time, 현재 sector, 직전 split | 숫자를 우선한다. countdown·checkpoint·finish 메시지와 겹치지 않게 좌측 정렬한다. |
| 하단 좌측 | 큰 표시 속도, `km/h`, 현재 gear, RPM bar | 속도는 가장 큰 숫자다. gear는 속도 옆의 작은 고정 폭 표기, RPM은 그 아래 가로 segmented bar로 둔다. |
| 하단 우측 | PB 대비 delta, ghost ahead/behind | 고스트가 활성일 때만 보인다. sector 통과 뒤 짧게 강조하고 상시 큰 경고색을 쓰지 않는다. |
| 하단 중앙 | course progress + checkpoint tick | 현행 progress UI를 유지하되, 차량 sprite와 겹치지 않는 safe-area 안에서만 확장한다. |

모바일 landscape에서는 상단 좌측과 하단 좌·우 패널을 safe-area inset 안으로 밀어 넣고, timer·speed·gear를 우선한다. progress bar와 delta는 공간 부족 시 축소 또는 숨길 수 있지만 차량 앞 road 시야를 덮지 않는다.

## Powertrain 표현

Gameplay HUD는 raw physics unit이 아니라 engine profile을 통한 표시값만 사용한다.

| 항목 | 표시 조건 | 표현 |
| --- | --- | --- |
| speed | 항상 | `getDisplaySpeedKmh()` 결과를 정수 `km/h`로 표시 |
| gear | 항상 | `N`/`1`~`n`의 간결한 한 글자 표기 |
| RPM | 항상 | `idleRpm`~`maxRpm`을 bar로 정규화, redline/fuel-cut 영역만 amber/red로 전환 |
| turbo boost | `engineProfile.boost`가 있을 때만 | RPM bar와 분리된 작은 `BOOST` bar. NA 차량에는 빈 meter나 `0.0 bar`를 표시하지 않음 |
| launch meter | launch capability가 있을 때 countdown 중에만 | RPM band와 hooked window를 짧게 표시하고, GO 뒤에는 `GOOD LAUNCH` 같은 사건 cue만 남김 |

현재 Raven Coupe는 NA이므로 speed·gear·RPM만 표시한다. boost UI가 없는 것은 정보 누락이 아니라 차량 특성이다.

## 모듈 경계

`hud.ts`는 당분간 `debugHud.ts` 성격으로 유지하고, gameplay HUD는 별도 `gameplayHud.ts`에서 만든다. Phaser Scene은 GameObject lifecycle과 depth만 소유하며, 형식·색상·bar geometry는 HUD 모듈이 소유한다.

```ts
type GameplayHudState = {
  run: { elapsedSec; checkpointTimesSec; progressRatio; bestDeltaSec };
  powertrain: { speedKmh; gear; rpm; idleRpm; maxRpm; redlineStartRpm; boostRatio?: number };
  ghost: { enabled; deltaSec?: number; relativeDistance?: number };
  viewport;
};
```

- `GameplayHudState`에는 mutable `PlayerVehicleState`, raw controller config, camera debug 수치를 직접 넘기지 않는다.
- track/vehicle registry가 도입되면 HUD는 선택된 track의 checkpoint 수와 vehicle engine profile만 읽는다.
- HUD의 boost/launch 조건은 차량 ID가 아니라 engine profile 및 capability로 결정한다.
- `RenderDepth`에는 debug, gameplay, result가 의도적으로 겹치지 않는 대역을 추가하고 render-layer tracker를 함께 갱신한다.

## 구현 순서와 QA

1. debug HUD `D` toggle과 visibility boolean을 유지한다. — 적용
2. `GameplayHudState`와 speed/gear/RPM formatter를 순수 함수로 추가한다.
3. speed/RPM/gear의 최소 패널을 만들고 기존 progress/run result와 겹치지 않는지 desktop·mobile landscape에서 확인한다.
4. turbo-capable 차량이 실제 catalog에 추가될 때만 optional boost bar를 연결한다.
5. D-17 records/ghost를 재개할 때 sector PB·delta·ghost relative UI를 붙인다.

완료 조건:

- `D`가 debug text와 collision debug banner만 토글하며 run 상태·입력·telemetry에는 영향을 주지 않는다.
- Raven에서 speed/gear/RPM이 실제 engine profile과 일치하고 boost UI는 없다.
- turbo 차량에서는 boost profile이 있을 때만 boost bar가 생긴다.
- HUD가 player sprite, progress line, finish result, mobile safe area를 가리지 않는다.
- HUD 상태 formatter는 vehicle/track fixture로 검증하고 production build를 통과한다.
