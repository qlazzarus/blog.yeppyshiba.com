# Apex Seoul 구조 정리 계획: typed config 우선, ECS는 보류

갱신일: 2026-07-27

상태: AR-5 runtime telemetry/QA adapter와 우선순위 3~6 구조 분리를 완료했다. 현재 제안된 우선순위 table은 모두 완료 상태다.

## 판단

`main.ts`는 Phaser Scene 진입점이면서도 차량 물리 기본값, 카메라 기본값, runtime URL override 조립, run state, renderer, HUD, telemetry까지 가진다. 이 상태에서 launch control과 burnout을 더하면 출발 상태가 render/QA/물리와 한 파일에서 직접 연결된다.

하지만 현재 실행 세계는 player vehicle, camera, road track이 각각 하나이며, Phaser GameObject depth와 lifecycle이 중요하다. 따라서 범용 ECS로 전환하지 않는다. 여러 traffic/opponent entity가 실제 범위에 들어올 때 다시 판단한다.

채택 구조는 **명시적 도메인 시스템 + typed config dictionary**다.

```text
main.ts
  → Phaser preload/create/update/render의 조립과 system 호출 순서

apexSeoulConfig.ts
  → 중첩 typed defaults, URL runtime config 조립

courseRun.ts
  → countdown, checkpoint, finish, restart, result

launchControl.ts
  → pre-launch rev, clutch engagement, launch quality, burnout timer

launchRuntimeQa.ts
  → launch telemetry snapshot과 fixture contract

runtimeQaState.ts (제안)
  → 전체 QA override 적용과 telemetry snapshot 조립
```

## ECS를 지금 도입하지 않는 이유

| 조건 | 현재 상태 | 결론 |
| --- | --- | --- |
| 동적 entity 수 | player/camera/road가 각각 1개 | ECS query의 이득이 작다. |
| 실행 순서 | vehicle → camera/road → render → telemetry 순서가 계약 | scheduler 전환은 회귀 위험이 크다. |
| 렌더 lifecycle | Phaser GameObject와 depth가 직접 연결 | component 분리는 가능하지만 generic ECS는 불필요하다. |
| 향후 traffic/opponent | 아직 P5 범위 | AI 차량·spawn·collision이 실제로 생길 때 재평가한다. |

## config 원칙

- JSON이나 문자열 key-value map이 아니라 TypeScript `as const` 객체를 사용한다.
- 값은 `course`, `camera`, `playerPresentation`, `run`, `telemetry`, `world`처럼 책임별로 중첩한다.
- 기존 `PlayerVehicleControllerConfig`는 물리 시스템의 flat typed contract로 유지한다. 중첩 defaults를 해당 경계에서 명시적으로 조립한다.
- URL QA override는 defaults를 대체하지 않고 `runtimeConfig.ts`의 검증된 범위/타입을 계속 통과한다.
- asset URL, engine profile처럼 import와 연결된 값은 JSON으로 옮기지 않는다.

## 다음 코드 개선·쪼개기 제안

우선순위는 새 기능을 붙일 때 `main.ts`의 변경 면적을 얼마나 줄이는가, 그리고 현재 자동 QA가 얼마나 그대로 재사용되는가를 기준으로 정한다.

| 우선순위 | 상태 | 제안 모듈 | 옮길 책임 | 기대 효과 | 주의점 |
| --- | --- | --- | --- | --- | --- |
| 1 | completed | `playerVehicleDefaults.ts` | `PLAYER_*` 물리 상수와 `PlayerVehicleControllerConfig` 조립 | `main.ts` 상단의 가장 큰 상수 뭉치를 제거하고 차량 tuning의 단일 기준을 만든다. | 상수와 runtime config 조립을 모두 이관했고, flat controller contract는 그대로 유지한다. |
| 2 | completed | `runtimeQaState.ts` | camera/road/player/launch snapshot 조립과 QA URL 적용 | telemetry schema가 Scene update/render와 분리돼 fixture 추가가 쉬워진다. | URL param clamp는 `runtimeConfig.ts`에 유지하고, Scene은 live sample만 전달한다. 최종 player snapshot은 detached contract로 고정했다. |
| 3 | completed | `playerPresentation.ts` | vehicle anchor, pose, shadow, understeer/launch tire cue | 차체 렌더 변경이 물리·run state를 침범하지 않는다. | Phaser depth, texture, atlas frame/origin 적용은 Scene에 유지하고, 모든 presentation geometry/transform을 이관했다. |
| 4 | completed | `sceneInput.ts` | keyboard 상태를 `DriveCommand`/debug command로 변환 | keyboard·향후 touch가 같은 입력 계약을 사용한다. | keyboard binding, `DriveCommand`, `SceneHotkeys`, command composition을 이관했다. debug camera는 별도 command로 유지한다. |
| 5 | completed | `vehicleCatalog.ts` | asset URL, vehicle/color 선택, engine profile 연결 | `main.ts`의 asset catalog와 URL 선택 분기를 줄이고 garage 확장 기반을 만든다. | Vite asset import는 Scene entry에 남기고, URL 선택/texture key 조립과 FT86/Genesis fallback fixture를 이관했다. |
| 6 | completed | `sceneBackdrop.ts` | moon/cloud/city parallax와 foreground matte | road/vehicle render loop의 가독성을 높인다. | sky/city layout과 background/foreground matte geometry를 이관했고, depth/horizon occlusion 순서는 Scene에 유지했다. |

### 3순위 진행 기록

- `playerPresentation.ts`가 launch burnout의 skid/dust/flash 순수 geometry를 소유하고, Scene은 Phaser Graphics로만 그린다.
- player pose의 atlas frame 선택, grip/drift 허용 규칙, flip 및 rotation 계산도 같은 module로 이관했다.
- soft/silhouette shadow와 contact patch의 alpha·offset·size·rotation transform도 같은 module로 이관했다. GameObject의 depth, texture, origin 적용은 Scene에 남긴다.
- road span sample을 받은 뒤 base/target/current size를 response time으로 보간하는 road-relative size 계산도 이관했다.
- elevation·contact projection sample을 받은 뒤 anchor 위치, terrain cue, contact ratio를 조합하는 계산도 이관했다.
- understeer tire cue의 조건·two-line trail geometry도 이관했다.
- build와 browser runtime fixture를 통과했으므로 3순위를 `completed`로 전환한다.

### 4순위 진행 기록

- `sceneInput.ts`가 accel/brake/steer를 `DriveCommand`로, telemetry/restart/A-B 단축키를 `SceneHotkeys`로 읽는다.
- vehicle update, pre-launch rev/GO, speed cue, runtime QA snapshot이 같은 `DriveCommand`를 사용한다.
- debug camera input은 일반 주행 command와 의도적으로 분리했다.
- keyboard cursor/key binding 생성도 `createSceneKeyboardBindings()`로 이관했다.
- `mergeDriveCommands()`가 keyboard/touch/replay source를 하나의 `DriveCommand`로 합성한다. 현재는 keyboard source만 연결되어 있으므로 조작 변화는 없다. 다음 subtask는 touch UI가 실제 범위에 들어올 때 source를 추가하는 작업이며, 구조 분리 자체는 완료됐다.
- build와 browser runtime fixture를 통과했으므로 4순위를 `completed`로 전환한다.

### 5순위 진행 기록

- `vehicleCatalog.ts`가 vehicle/color URL 선택, engine profile 연결, texture key 조립을 소유한다.
- `main.ts`는 Vite asset URL import를 유지하고 typed catalog asset으로 주입한다.
- `qa:vehicle-catalog`가 FT86 invalid color fallback, valid color engine/texture key, unknown vehicle Genesis fallback을 고정한다.
- build와 catalog fixture를 통과했으므로 5순위를 `completed`로 전환한다.

### 6순위 진행 기록

- `sceneBackdrop.ts`가 moon/cloud drift, city/ridge parallax layout, sky/ground band, foreground matte rect geometry를 소유한다.
- Scene은 Phaser layer 생성과 alpha/Graphics draw 순서를 유지한다. road와 terrain horizon occlusion보다 앞선 backdrop depth는 변경하지 않았다.
- build와 browser runtime fixture를 통과했으므로 6순위를 `completed`로 전환한다.

### 진행 규칙

1. 한 번에 table의 `in progress` 항목 하나만 수정한다.
2. 동작·tuning을 바꾸지 않는 구조 변경과 기능 변경을 같은 pass에 섞지 않는다.
3. build와 해당 도메인 QA를 통과한 뒤에만 `completed`로 바꾼다. 다음 항목은 실제 작업을 시작할 때만 `in progress`로 옮긴다.
4. 새 하위 작업이 생기면 우선순위·상태·검증 명령을 이 표에 먼저 추가한다.

`roadRenderer`, `roadObjectRenderer`, `playerVehicleController`, `headlightShader`처럼 이미 독립된 도메인은 다시 쪼개지 않는다. traffic/opponent가 실제로 활성화되기 전에는 ECS registry·query scheduler도 추가하지 않는다.

### AR-5 — telemetry/QA adapter

- QA URL 적용과 runtime snapshot 조립을 Scene 밖 순수 함수로 옮긴다.
- QA fixture가 config 변경 때문에 launch/countdown을 우회한다는 사실을 명시적으로 유지한다.

현재 launch slice:

- `launchRuntimeQa.ts`가 launch snapshot의 반올림·null 처리·schema를 Scene 밖에서 소유한다.
- `qa:launch-control`은 cold, held limiter/hooked, release-before-GO, forced overrev의 quality·force·burnout 계약을 검증한다.
- 전체 `getRuntimeQaState()`의 camera/road/player snapshot 분리는 다른 telemetry field를 바꾸지 않기 위해 별도 후속 pass로 유지한다.

### 2순위 진행 기록

- `runtimeQaState.ts`를 추가해 camera, headlight, guardrail screen, launch, longitudinal, physics road, run, speed effect, track, vehicle snapshot의 반올림과 field 조립을 Scene 밖으로 옮겼다.
- `applyRuntimeQaOverridesToState()`는 Scene mutation만 소유한다. URL parsing/clamp는 기존처럼 `runtimeConfig.ts`에 남긴다.
- `qa:runtime-qa-state` fixture는 override 허용 field, camera/road 숫자 반올림, run의 null/반올림 contract를 고정한다.
- player telemetry의 `cornerDemand`, `cornerSpeedLoss`, `speedHandling` nested sample도 serializer로 이관했다. Scene이 계산한 flat field까지 포함한 최종 snapshot은 `serializeRuntimeQaPlayer()`가 detached contract로 소유한다.
- `qa:runtime-qa-browser`는 실제 Edge에서 `qaFreeze`/`qaStartSpeed` URL을 열어 QA mode, countdown 우회, launch idle, 초기 속도를 검증한다.
- build, state fixture, browser fixture를 통과했으므로 2순위를 `completed`로 전환한다.

다음 완료 범위:

1. `getRuntimeQaState()`에서 camera/road/player/launch serializer를 순수 함수로 분리한다.
2. `applyRuntimeQaOverrides()`를 Scene mutation과 URL parsing으로 나누고, URL parsing은 `runtimeConfig.ts`에 유지한다.
3. 기존 telemetry JSON field명과 숫자 반올림을 snapshot fixture로 고정한다.
4. countdown/launch가 QA URL에서 우회되는지를 browser runtime fixture로 확인한다.

## 변경 금지선

- config 이관 pass에서 수치 tuning을 함께 바꾸지 않는다.
- `camera.z`, collision, player physics, telemetry schema를 동시에 재설계하지 않는다.
- traffic/opponent가 없는데 generic entity registry를 먼저 만들지 않는다.
- launch/burnout 수치를 QA adapter 이관과 같은 pass에서 함께 tuning하지 않는다.

## 검증

```bash
npm run build --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:corner-production --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:runtime-qa-state --workspace @games/apex-seoul
npm run qa:runtime-qa-browser --workspace @games/apex-seoul
```

`qa:top-speed-regression`은 현재 생성 기준선의 corner-loss reference 불일치가 독립적으로 남아 있으므로, config 이관의 pass/fail을 이 한 항목으로 판단하지 않는다. 다만 결과는 매번 기록해 실제 force/RPM 변화가 없는지 확인한다.
