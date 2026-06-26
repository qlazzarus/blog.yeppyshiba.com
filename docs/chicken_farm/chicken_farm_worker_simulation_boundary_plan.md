# Chicken Farm Worker Simulation Boundary Plan

이 문서는 `chicken-farm`에 Web Worker를 도입할 때, 현재 Phaser PoC 코드를 어떤 경계로 분리해야 하는지 정리한다.

목표는 단순히 "무거운 계산을 worker로 보낸다"가 아니다.

- host-authoritative simulation을 메인 스레드에서 분리한다.
- Phaser `GameObject`와 판정 로직의 결합을 끊는다.
- 앞으로 추가할 economy, wave, shop, P2P snapshot 구조를 처음부터 worker 친화적으로 만든다.

이 문서는 `docs/chicken_farm/chicken_farm_network_and_suspend_plan.md`의 host-only runtime 정책과, `docs/chicken_farm/chicken_farm_next_priority_plan.md`의 다음 구현 순서를 코드 구조 관점으로 구체화한 보조 기준이다.

## 1. 핵심 원칙

Worker 경계는 "CPU를 많이 쓰는가"만으로 자르지 않는다.
다음 네 가지를 모두 만족하는 쪽을 우선적으로 pure simulation으로 옮긴다.

1. 입력이 plain data다.
2. 출력이 plain data다.
3. `Phaser.Scene`, `GameObject`, `Camera`, `Graphics` 없이 계산할 수 있다.
4. host tick 기준으로 재실행, snapshot, checksum이 가능하다.

반대로 아래 항목은 worker 대상이 아니다.

- Phaser display tree 생성/파괴
- `Graphics` draw call
- pointer/keyboard/raw DOM input 수집
- camera scroll, HUD text, selection rectangle, minimap paint

즉 경계는 아래처럼 잡는다.

- worker: canonical simulation
- main thread: input capture, presentation, interpolation, Phaser rendering
- bridge: command/snapshot/event serialization

## 2. 책임 레이어

### 2.1 Pure Simulation Layer

host tick 기준으로만 움직이는 판정 레이어다.

포함 책임:

- player command 적용
- unit movement/path follow state update
- wolf AI decision
- pathing/repath/blocker fallback
- combat hit/cooldown/hp/death
- future economy tick
- future wave spawn
- future shop/build/repair validation
- RNG consumption
- checksum/snapshot source state

출력:

- next state
- applied command list
- combat/wave/economy events
- snapshot/checksum payload

### 2.2 Main Thread Presentation Layer

Phaser scene와 시각 객체를 관리하는 레이어다.

포함 책임:

- tilemap layer 생성
- controllable unit sprite/container 생성
- wolf/building/fx view 생성
- fog/minimap rendering
- camera, HUD, debug text
- drag selection rectangle
- snapshot interpolation view

입력:

- worker snapshot
- worker event stream
- local pointer/keyboard input

### 2.3 Bridge Layer

worker와 main thread 사이의 데이터 계약 레이어다.

포함 책임:

- `PlayerCommand` 전송
- `SimulationSnapshot` 수신
- `SimulationEvent` 수신
- lifecycle/pause/resume message
- profiling/checksum telemetry 전달

bridge는 판정을 하지 않는다.
데이터를 포장하고 순서를 보장하는 역할만 맡는다.

## 3. 현재 코드 기준 분류

### 3.1 이미 pure simulation에 가까운 파일

아래 파일은 worker로 옮기기 좋다.

| 파일 | 현재 성격 | worker 대상 판단 | 비고 |
| --- | --- | --- | --- |
| `games/chicken-farm/src/game/systems/pathing.ts` | 순수 함수 | 즉시 가능 | Phaser 의존 없음 |
| `games/chicken-farm/src/game/systems/wolfAiStateMachine.ts` | 순수 함수 | 즉시 가능 | decision table 유지 |
| `games/chicken-farm/src/game/systems/movementGuards.ts` | 규칙 함수 중심 | 우선 후보 | Phaser 타입 의존 제거 필요 가능 |
| `games/chicken-farm/src/game/balance.ts` | 정적 데이터 | 즉시 가능 | shared import 가능 |
| `games/chicken-farm/src/game/balanceTypes.ts` | 타입 정의 | 즉시 가능 | shared import 가능 |
| `games/chicken-farm/src/game/buildingTemplates.ts` | 정적 데이터 | 즉시 가능 | state factory 입력으로 사용 |
| `games/chicken-farm/src/game/systems/wolfAi.ts` | 규칙/랜덤 보조 | 조건부 가능 | RNG를 host seeded PRNG로 교체 필요 |

### 3.2 presenter와 simulation이 섞여 있는 파일

아래 파일은 그대로 worker로 옮기면 안 된다.
먼저 `state/update`와 `view`를 분리해야 한다.

| 파일 | 현재 문제 | 분리 방향 |
| --- | --- | --- |
| `games/chicken-farm/src/game/systems/controllableUnitSystem.ts` | command 처리, pathfinding, combat target 판정, Phaser view 갱신이 한 클래스에 섞여 있음 | `controllableUnitSimulation` + `controllableUnitPresenter`로 분리 |
| `games/chicken-farm/src/game/systems/combatPocSystem.ts` | wolf AI/combat 판정과 rectangle/text/debug draw가 결합돼 있음 | `combatSimulation` + `combatPresenter`로 분리 |
| `games/chicken-farm/src/game/systems/playerControlSystem.ts` | player slot 선택과 debug marker view가 결합돼 있음 | input/controller와 player marker presenter로 축소 |
| `games/chicken-farm/src/main.ts` | tick orchestration, debug API, render update, simulation update가 한 scene loop에 집중돼 있음 | scene는 bridge/presenter만 담당하도록 축소 |

### 3.3 main-thread에 남겨야 하는 파일

아래 파일은 worker 대상이 아니다.

| 파일 | 이유 |
| --- | --- |
| `games/chicken-farm/src/game/systems/cameraControlSystem.ts` | camera는 Phaser runtime 책임 |
| `games/chicken-farm/src/game/systems/dragSelectionInputSystem.ts` | pointer input과 screen-space rectangle 처리 |
| `games/chicken-farm/src/game/systems/visibilitySystem.ts` | fog/minimap draw call 중심 |
| `games/chicken-farm/src/game/rendering/buildGridRenderer.ts` | Graphics draw 생성 |
| `games/chicken-farm/src/game/rendering/tilemapObjectRenderer.ts` | tilemap/object layer 생성 |
| `games/chicken-farm/src/game/ui/farmHud.ts` | HUD display 구성 |
| `games/chicken-farm/src/game/systems/performanceProfiler.ts` | main thread frame profiler 역할 유지가 자연스러움 |
| `games/chicken-farm/src/game/systems/telemetryRecorder.ts` | 공통 사용 가능하지만 browser export/UX는 main thread가 자연스러움 |

## 4. 현재 시스템별 목표 상태

### 4.1 Controllable Unit

현재 `ControllableUnitSystem`은 아래 책임을 동시에 가진다.

- unit state 보유
- selection state 보유
- smart command dispatch
- multi-unit offset 계산
- pathfinding 호출
- attack command follow
- unit push
- Phaser body/label/ring 갱신

worker 도입 후 목표:

- simulation:
  - `ControllableUnitState[]`
  - `issueMoveCommand`
  - `issueAttackCommand`
  - `updateControllableUnits`
  - `resolveUnitPush`
  - `buildControllableUnitSnapshot`
- presenter:
  - unit body/hp bar/selection ring 생성
  - snapshot 기준 위치/HP/selection 시각 반영

selection 자체는 1차적으로 main thread에 남겨도 된다.
다만 최종적으로는 `selectedUnitIds`도 command source state로 승격하는 편이 replay에 유리하다.

### 4.2 Combat / Wolf AI

현재 `CombatPocSystem`은 아래 책임을 동시에 가진다.

- wolf/building runtime state
- target acquisition
- repath
- direct attack / blocker fallback
- tower attack 판정
- building hp 변화
- telemetry snapshot
- wolf/building graphics, label, debug marker draw

worker 도입 후 목표:

- simulation:
  - `CombatState`
  - `updateWolfAi`
  - `updateTowerCombat`
  - `applyCombatDamage`
  - `spawnCombatEntities`
  - `buildCombatSnapshot`
- presenter:
  - wolf/building view 생성 및 파괴
  - debug overlay 선택적 표시
  - damage marker/fx 표시

`wolfAiStateMachine.ts`와 `pathing.ts`는 simulation 내부 순수 모듈로 유지한다.

### 4.3 Future Economy / Wave / Shop

이 항목들은 아직 구현 전이므로 처음부터 worker 기준으로 만든다.

반드시 pure simulation으로 시작할 파일:

- `economyTypes.ts`
- `economySystem.ts`
- `waveSystem.ts`
- `shopSystem.ts`
- `simulation.ts`
- `network/checksum.ts`

여기서는 Phaser import를 금지한다.

런타임 state는 아래 규칙을 따른다.

- 모든 반복 이벤트는 `elapsedSec` 또는 `hostTick` 기준
- RNG는 injected seeded PRNG만 사용
- entity id / event id는 결정적으로 생성
- output은 snapshot/event/plain telemetry만 반환

## 5. Worker 도입 순서

### 단계 1. Pure Core 추출

먼저 현재 클래스를 worker로 옮기지 말고, 로직 함수와 state 타입을 꺼낸다.

필수 결과:

- `simulation/` 또는 동등한 shared runtime 폴더 생성
- Phaser import 없는 state/update 함수 확보
- 기존 scene는 extracted function을 main thread에서 먼저 호출

이 단계에서는 아직 실제 worker를 붙이지 않아도 된다.

### 단계 2. Fixed Tick Runtime

scene update에서 직접 전투/이동을 돌리지 않고 fixed tick runner를 둔다.

필수 결과:

- `hostTick`
- accumulator
- large delta guard
- command apply -> simulation update -> snapshot export 순서 고정

### 단계 3. Worker Bridge 연결

그 다음 simulation runner를 worker로 옮긴다.

필수 message:

- `INIT_SIMULATION`
- `PLAYER_COMMAND`
- `SIMULATION_TICK`
- `STATE_SNAPSHOT`
- `SIMULATION_EVENT`
- `REQUEST_CHECKSUM`
- `PAUSE_SIMULATION`
- `RESUME_SIMULATION`

### 단계 4. Presenter 전환

main thread는 local mutable game state 대신 snapshot-driven presenter로 바꾼다.

필수 결과:

- view cache keyed by entity id
- snapshot apply
- interpolation buffer
- authoritative correction

## 6. Multiplayer Worker Topology

worker 구조는 싱글 플레이 기준이 아니라, P2P 멀티플레이 기준으로 먼저 고정해야 한다.

이 프로젝트의 기본 원칙은 다음과 같다.

- authoritative state는 `host simulation` 하나만 만든다.
- worker는 authoritative source가 아니라, authoritative source가 실행되는 위치다.
- client는 기본적으로 simulation을 재계산하지 않는다.

### 6.1 권장 토폴로지

#### Host 브라우저

- main thread
  - input capture
  - Phaser presenter
  - WebRTC bridge
  - page visibility / lifecycle handling
- dedicated simulation worker
  - fixed tick
  - command apply
  - pathing / AI / combat
  - future economy / wave / shop
  - snapshot / event / checksum 생성

#### Client 브라우저

- main thread
  - input capture
  - WebRTC bridge
  - snapshot interpolation presenter
  - page visibility / lifecycle handling
- simulation worker 없음
  - 1차 MVP 기본값

이 구조가 기본이다.
client 쪽 worker는 나중에 필요가 입증될 때만 추가한다.

### 6.2 client worker를 기본으로 두지 않는 이유

현재 프로젝트는 `lockstep deterministic RTS`가 아니라 `host authoritative snapshot` 모델을 따른다.
따라서 client가 로컬에서 같은 AI/pathing/combat를 다시 계산하면 이점보다 리스크가 크다.

리스크:

- host와 client의 state drift
- float/path timing 차이
- RNG step 불일치
- hidden/resume 이후 stale local simulation
- "보여주는 값"과 "판정값" 이중화

따라서 client worker의 허용 용도는 아래로 제한한다.

- replay 검증
- checksum 재계산
- local prediction 연구용 실험
- bot/spectator 부가 기능

즉 1차 멀티 구조에서는 `host worker only`가 기본값이다.

## 7. Web Game Best Practice 기준

아래 기준은 MDN/web.dev의 worker, data channel, visibility, OffscreenCanvas 문서를 바탕으로 이 프로젝트에 맞게 정리한 것이다.
일부는 문서의 직접 규정이 아니라, 해당 API 성질로부터 도출한 구현 판단이다.

### 7.1 one long-lived dedicated simulation worker

권장:

- 브라우저당 simulation worker는 1개
- 게임 세션 동안 오래 유지
- 시스템별로 worker를 쪼개지 않음

이유:

- worker와 main thread는 `postMessage()` 기반으로 통신한다.
- MDN 기준 worker와 main thread 사이 데이터는 공유가 아니라 복사 또는 transfer된다.
- 경로탐색 worker, AI worker, economy worker처럼 잘게 나누면 복사/순서/디버깅 비용이 커진다.

따라서 `simulation kernel 1개`가 웹게임 기준으로 가장 보수적이고 운영하기 쉽다.

### 7.2 authoritative simulation은 DOM/Phaser와 분리

MDN 기준 worker는 DOM을 직접 조작할 수 없다.
이 제한은 불편함이 아니라 장점으로 받아들이는 편이 좋다.

권장:

- simulation state는 plain object / typed array / transferable data만 사용
- Phaser object reference를 worker에 넘기지 않음
- presenter는 snapshot을 읽고 뷰만 갱신

이 원칙이 있어야 멀티에서 host snapshot과 replay/checksum이 의미를 가진다.

### 7.3 메시지는 역할별로 분리

MDN 기준 `RTCDataChannel`은 ordered 여부와 retransmit 정책을 채널 생성 시점에 정할 수 있다.
이 프로젝트에서는 그 성질에 맞춰 채널을 나누는 것이 가장 자연스럽다.

권장 채널:

1. reliable ordered channel
   - player command
   - pause/resume
   - checkpoint
   - host handoff control message
2. lossy state channel 또는 snapshot lane
   - frequent state snapshot
   - interpolation target
   - 늦게 도착한 오래된 snapshot은 버려도 되는 종류

여기서 "lossy state channel"은 API 명세의 직접 표현이 아니라 구현 전략이다.
근거는 다음 두 가지다.

- `ordered=true`는 in-order delivery를 보장한다.
- `maxRetransmits`로 재전송 상한을 줄 수 있다.

따라서 command와 checkpoint는 ordered/reliable 성격이 맞고, snapshot은 "최신 상태가 중요하고 오래된 상태는 가치가 낮다"는 점에서 별도 lane으로 다루는 것이 웹게임 쪽에 더 맞다.

### 7.4 backpressure를 반드시 본다

MDN 기준 `RTCDataChannel.bufferedAmount`는 아직 전송되지 않은 queued byte 수다.
따라서 snapshot/event를 계속 쏘는 구조에서는 backpressure를 무시하면 안 된다.

권장:

- `bufferedAmount` 기준 상한을 둔다.
- 상한 초과 시 low-priority snapshot을 drop/coalesce한다.
- checkpoint, pause, command ack 같은 control message는 drop하지 않는다.

즉 네트워크 브릿지는 단순 send wrapper가 아니라 congestion-aware queue여야 한다.

### 7.5 hidden tab에서도 simulation을 계속 믿지 않는다

MDN 기준 background tab은 throttling될 수 있고, `Document.hidden`, `visibilitychange`로 상태를 감지할 수 있다.
또한 WebRTC/WebSocket 연결은 예외적으로 덜 throttled될 수 있지만, 이것이 "게임 simulation을 hidden 상태에서도 정상적으로 계속 돌려도 된다"는 뜻은 아니다.

권장:

- host hidden -> authoritative pause/resync
- client hidden -> local presenter 정지 또는 완화, visible 복귀 시 latest snapshot resync
- worker가 있더라도 visibility policy를 우회하지 않음

즉 worker는 suspend 문제를 해결하는 수단이 아니라, pause/resync 정책 안에서 움직이는 구성 요소다.

### 7.6 OffscreenCanvas는 선택 기능이지 1차 구조 전제가 아니다

MDN과 web.dev 기준 `OffscreenCanvas`는 DOM과 canvas rendering을 분리하고 worker에서 canvas 작업을 가능하게 한다.
하지만 현재 `chicken-farm`의 핵심 병목은 pathing/AI/simulation 쪽이며, Phaser scene 전체를 곧바로 OffscreenCanvas 전제로 재구성하는 것은 우선순위가 아니다.

권장:

- 1차는 simulation worker만 도입
- presenter는 main thread Phaser 유지
- 향후 fog/minimap/custom canvas가 독립 draw pipeline으로 분리될 때만 OffscreenCanvas 재검토

즉 OffscreenCanvas는 "나중에 별도 검토할 렌더링 최적화"이지, 현재 worker 구조의 필수 전제는 아니다.

## 8. Multiplayer Message and Tick Rules

멀티 기준으로는 worker 내부 tick과 네트워크 메시지 순서를 같이 정의해야 한다.

권장 순서:

1. main thread가 local input을 수집한다.
2. host 브라우저면 input을 simulation worker에 넣는다.
3. client 브라우저면 input을 reliable ordered channel로 host에 보낸다.
4. host worker가 `acceptedHostTick`과 `appliedHostTick`을 부여한다.
5. host worker가 simulation update를 실행한다.
6. host worker가 snapshot/event/checksum payload를 main thread에 보낸다.
7. host main thread가 이를 network channel 정책에 맞게 전송한다.
8. remote client main thread는 snapshot buffer에 적재하고 presenter에 반영한다.

금지:

- client main thread가 받은 snapshot을 기준으로 AI/pathing 판정을 다시 계산
- worker와 network layer가 서로 독립적으로 tick 번호를 생성
- main thread와 worker가 각각 다른 RNG를 소비

## 9. 현재 문서 기준 추가 결정 항목

worker 구조를 실제 구현으로 옮기기 전에 아래를 확정해야 한다.

1. host 브라우저당 simulation worker 수
   - 권장: 1
2. client에서 simulation worker를 기본 활성화할지 여부
   - 권장: 비활성, 필요 시 옵션화
3. data channel 개수와 역할
   - 권장: command/control lane, snapshot lane 분리
4. snapshot cadence와 drop 정책
   - 권장: 최신 snapshot 우선, stale snapshot discard
5. worker snapshot shape
   - 권장: entity state + tick + checksum + rng hash
6. backpressure 임계치
   - 권장: `bufferedAmount` 기반 상한 정의
7. hidden host 정책
   - 권장: pause/resync, hidden 동안 canonical tick 진행 금지
8. hidden client 정책
   - 권장: latest snapshot request 후 interpolation buffer reset

## 10. 문서화된 금지 규칙

worker 친화 구조를 유지하려면 다음 규칙을 지킨다.

1. 새 simulation 파일에 `Phaser` import를 추가하지 않는다.
2. simulation state 안에 `GameObject`, `Vector2`, `Rectangle` 같은 Phaser 객체를 저장하지 않는다.
3. simulation 함수는 `performance.now()`나 `Date.now()`로 판정하지 않는다.
4. 랜덤은 `Math.random()`을 직접 호출하지 않는다.
5. presenter는 판정 로직을 새로 계산하지 않는다.
6. bridge는 snapshot/event를 수정하지 않는다.
7. client는 host 없이 authoritative simulation을 진행하지 않는다.
8. network 전송은 `bufferedAmount`와 snapshot stale 여부를 고려하지 않은 무제한 fire-and-forget으로 두지 않는다.

## 11. 현재 코드 기준 1차 작업 목록

문서 기준으로 다음 순서를 권장한다.

1. `pathing.ts`, `wolfAiStateMachine.ts`, `movementGuards.ts`를 shared simulation 유틸 기준으로 고정한다.
2. `ControllableUnitSystem`에서 state/update와 view 갱신을 분리한다.
3. `CombatPocSystem`에서 combat state update와 debug draw를 분리한다.
4. `main.ts`에서 fixed tick orchestration 경계를 문서대로 재배치한다.
5. Economy/Wave 구현은 처음부터 worker-ready pure system으로 시작한다.
6. 그 다음 실제 worker bridge와 snapshot schema를 붙인다.

## 12. 완료 기준

이 문서 기준 구조 전환이 끝났다고 보려면 아래가 만족되어야 한다.

- 메인 스레드 없이도 simulation tick unit test가 가능하다.
- `pathing`, `wolf ai`, `economy`, `wave`, `combat`가 Phaser import 없이 실행된다.
- scene는 snapshot을 읽어 sprite/HUD를 반영하는 역할로 축소된다.
- host authoritative P2P에서 simulation worker를 canonical runtime으로 사용할 수 있다.
- client는 snapshot interpolation만으로 화면을 유지할 수 있다.
