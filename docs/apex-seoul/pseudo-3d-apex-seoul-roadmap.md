# Apex Seoul 구현 로드맵

갱신일: 2026-09-03

## 프로젝트 목표

| 항목 | 방향 |
| --- | --- |
| 장르 | Phaser 4 기반 pseudo-3D arcade downhill racing |
| 핵심 주행 | 고속 grip을 기본으로 하고 sharp/S 구간에서 drift를 선택하는 구조 |
| 기본 모드 | 짧게 반복할 수 있는 Bugak Ridge Downhill time attack |
| 플랫폼 | 데스크톱과 모바일 브라우저 |
| 시각 방향 | black/blue 야간 서울, 푸른 반사광과 먼 도시 불빛 |

목표는 자동차 물리 시뮬레이터가 아니라, 읽기 쉬운 화면과 일관된 규칙으로 기록을 줄여 가는 아케이드 다운힐 게임이다.

## 제품 원칙

1. 차량은 화면 하단의 안정적인 조작 기준점이다.
2. grip이 기본값이고 drift는 특정 코너를 위한 선택지다.
3. 표시 속도, world progression, 코너 판정과 충돌은 하나의 좌표 관계를 공유한다.
4. 효과를 추가하기 전에 그것이 플레이 판단이나 게임 loop에 어떤 역할을 하는지 정의한다.
5. 승인된 handling·drift·속도감은 회귀 기준으로 유지하되, 사용자 실주행에서 핵심 gameplay 계약이 깨지면 다음 milestone보다 먼저 재검증한다.
6. 후순위 세부 아이디어는 독립 단계로 늘리지 않고 상위 기능에 병합한다.

## M0 — 주행 기반 확립 — HR-3K 기준선 임시 동결

### 구현된 기반

- curve/elevation/roadside를 가진 pseudo-3D road와 Bugak Ridge Downhill
- accelerator, brake, slope, drag, RPM, gear와 Raven Coupe powertrain
- speed-dependent grip, corner demand, understeer와 speed loss
- setup, drift, counter trim/transition과 recovery
- U2 `longitudinalScale=2` 기반 속도감과 `225km/h` 표시 envelope
- 차량 pose, shadow, headlight, speed cue와 guardrail collision/projection
- checkpoint, finish progress와 runtime telemetry
- handling, drivetrain, speed presentation, road와 collision 자동 QA

### 현재 판단

속도대별 grip, drift 상태 머신, 구동계와 화면 속도감은 유지한다. CH-0~CH-3 뒤 runtime 로그에서 relative outward와 absolute shoulder 위협이 다르다는 사실을 확인해 기존 gameplay 승인을 다시 열었고, HR-3H에서 preview 기반 조기 yaw와 passive road-follow를 제거했다. 횡이동은 현재 접지점 road frame과 `worldTravelSpeed × sin(relativeHeading)`으로 계산한다.

HR-3I/HR-3I-R은 physical steering command와 sprite의 의미를 맞췄다. 무입력 차는 road-relative heading debt가 커져도 조향 sprite를 만들지 않는다. HR-3J는 guardrail contact를 `enter / stay / exit`로 나눠 같은 rail의 지속 접촉을 한 번의 충돌로 처리한다. HR-3K는 코너 출구에서 grip yaw와 drift slip이 같은 방향 회전을 중복 생성하는 경로를 제한한다.

현재 자동 계약은 다음을 만족한다.

- production 강코너 `8개 × 3속도`에서 무조향 첫 이동이 모두 바깥쪽이다.
- `185km/h` 강코너 `8/8`이 `1.267~1.700초` 안에 예상 바깥 rail에 닿는다.
- 동일 rail impact는 기존 코너당 `4~11회`에서 모두 `1회`로 줄었다.
- 무입력 road-follow와 lateral centering force는 `0`이다.
- grip sprite는 physical command를 따르며 유효 command와 방향 불일치는 `0건`이다.
- drift exit inside heading은 좌우 최대 `0.179rad`로 대칭이며 직선 조향은 제한하지 않는다.

사용자 실주행에서는 코너 감각에 약 `20%`의 보완 여지가 남았다고 판단했다. 이를 완료로 숨기지 않고 HR-3K를 임시 회귀 기준선으로 동결한다. CH-4 선택 코스 apex 재설계와 CH-5 grip/drift section time 승인은 time attack 기록 비교가 가능해진 뒤 다시 연다.

상세 실행 순서는 [다음 구현 우선순위 P0](./apex-seoul-next-priority-plan.md#p0--코너-조향-필수-계약-복구), 진단과 QA는 [속도대별 핸들링 재검증](./apex-seoul-speed-band-handling-plan.md#2026-07-23-무입력-코너-관성-재검증)을 따른다.

## M1 — 완결된 time attack loop — 다음 구현

### Scene과 startup loading 계약

현재 gameplay는 하나의 Phaser Scene이 환경·차량·run·결과를 모두 preload/create한다. 차량·색상·오디오·코스 asset이 늘어나는 다음 pass에서는 이를 아래 상태 전환으로 나눈다.

```text
LoadingScene
  → MainScene (game start / records / settings)
  → VehicleSelectScene (vehicle + color)
  → GameScene
  → ResultScene
  → MainScene
```

- 첫 `LoadingScene`은 runtime startup manifest를 **일괄 preload**한다. Main 이후의 vehicle turntable, color 전환, 게임 시작은 cache texture key를 재사용하므로 별도 network wait를 만들지 않는다.
- startup manifest는 UI/common, 현재 환경·effect, Bugak Ridge Downhill, 세 차량 × 네 palette body sheet, 차량별 external shadow/atlas, 실제 runtime audio만 담는다. 3D GLB, source beauty, authoring QA, 블로그용 image는 runtime loader 대상이 아니다.
- Loading UI의 bar는 Phaser Loader의 실제 `progress` event에 연결한다. `fileprogress`는 현재 asset의 public label을 보조 문구로 쓰고, 실패는 asset key와 재시도 action을 노출한다. cache hit 때문에 즉시 끝나는 개발 환경을 위해서만 300–500ms의 짧은 최소 표시 시간을 둔다.
- 브라우저 audio는 preload 완료와 playback permission을 분리한다. BGM/engine playback은 LoadingScene이 아니라 사용자의 Start Run action 뒤에 시작한다.
- asset 규모가 startup budget을 넘는 시점에만 같은 `LoadingScene`을 `optional` manifest와 target scene 인자로 다시 쓴다. 예: 추가 course, 고용량 BGM, cutscene. 현재 한 코스·세 차량 범위에는 두 번째 loading gate를 만들지 않는다.
- GameScene은 immutable `RunSetup { vehicleId, colorId, courseId }`만 받으며 URL/module global에서 active vehicle을 다시 해석하지 않는다. ResultScene은 immutable `RunResult`를 받고 retry 또는 Main 복귀를 결정한다.
- QA URL은 menu 흐름을 통과하지 않고 검증용 `RunSetup`으로 GameScene에 직접 진입할 수 있어야 한다. 이는 normal user flow와 독립된 automation entry다.

### 차량 asset 준비 상태

- Raven Coupe / Seorin GT / Mirae GT의 192px 17-pose 7way sheet와 공통 `blue / red / silver / black` palette는 생성·asset QA를 마쳤다.
- Raven Coupe만 기본 runtime sprite로 연결됐다. Seorin GT/Mirae GT는 separate shadow와 hidden debug preview가 있지만 vehicle-local headlight profile 승인 전이므로 selectable catalog에는 아직 넣지 않는다.
- 따라서 M1의 차량 범위는 새 sprite를 만드는 일이 아니라, 세 차량·색상 catalog, 선택 state, garage UI와 run/result 복원 계약을 완성하는 일이다. 상세 순서는 [차량 pose 계획의 7h](./apex-seoul-vehicle-pose-density-plan.md#7h번-게임-연동-잔여-범위--2026-09-03)을 따른다.

### 사용자 경험

```text
vehicle 선택
  → color 선택
  → course 선택
  → ready/countdown
  → 주행과 checkpoint split
  → finish
  → 결과와 best 비교
  → 즉시 재도전
```

### 핵심 결과물

- 명확한 start/finish 상태와 restart
- pre-run garage에서 Raven Coupe, Seorin GT, Mirae GT와 공통 `blue / red / silver / black` palette를 확정하는 선택 상태
- 현재 하나인 Bugak Ridge Downhill도 `courseId`로 선택·직렬화해 이후 코스 확장을 위한 계약을 먼저 고정
- 선택한 `vehicleId / colorId / courseId`가 URL, asset catalog, run telemetry에서 같은 조합을 가리키는 규칙
- 차량이 통과하는 `Π`형 비충돌 checkpoint gate와 현재 기록, best 기록, split 차이
- 결과 화면과 최소 저장 정책
- telemetry와 실제 UI가 같은 run timing source 사용
- 80km/h부터 속도에 따라 강해지는 소실점 기준 만화식 speed line
- 왼쪽 가드레일 가로등과 corner-entry에 재배치한 기존 `>> / <<` chevron
- fog/crest 규칙을 공유하는 가로등 glow·road pool과, timed finish 뒤 약 5초 coast의 별도 finishing gantry·고정 카메라 완주 숏

### gate

- 같은 조건의 반복 주행이 가능하다.
- 차량·색상·코스 선택 뒤에만 run이 시작하며, 새로고침·QA URL이 동일 조합을 복원한다.
- 기록 갱신과 restart가 예측 가능하다.
- U2 속도와 기존 handling/collision 회귀가 없다.

## M2 — 코스 gameplay와 학습 가능한 구간

### 사용자 경험

플레이어가 “어디서 시간을 잃었는가”와 “다음 run에서 무엇을 바꿀 것인가”를 알 수 있어야 한다.

### 핵심 결과물

- recovery/easy/commitment/S-transition section 정의
- checkpoint 또는 section split
- entry 준비, line 유지와 exit speed를 읽는 최소 결과 피드백
- deterministic track/start 조건
- checkpoint/split과 이름을 공유하는 section 표지와, 필요한 한 곳의 짧은 rock-cut/overhang landmark

### gate

- section 데이터가 렌더 장식이 아니라 기록 분석에 사용된다.
- 코스의 line 선택이 결과 시간과 연결된다.
- 환경 콘텐츠 없이도 주행 리듬을 구분할 수 있다.

## M3 — 입력·플랫폼 완성도

### 핵심 결과물

- keyboard와 touch가 공유하는 input abstraction
- 모바일 landscape controls와 HUD 안전 영역
- pause/focus/visibility에 안전한 run timer
- 브라우저별 성능·해상도 기준

### gate

- 입력 장치가 달라도 핵심 controller 결과가 같은 방향으로 나온다.
- 모바일에서도 차량, 도로와 기록 UI가 동시에 읽힌다.
- 포커스 전환과 프레임 저하가 기록을 부당하게 바꾸지 않는다.

## M4 — presentation/content integration

이 milestone부터 필요한 경우에만 코스·환경·오디오 보류 항목을 합친다.

### 후보 결과물

- 새 sector 미술 작업과 함께 만드는 roadside landmark
- 실제 elevation 구간에 붙는 crest/camera cue
- gameplay 사건에 붙는 audio feedback
- 차량 상태 가독성이 부족할 때의 제한적 VFX 보강
- 차량 상태가 실제로 부족할 때의 tail-light glow. 이동 잔상은 speed cue가 아닌 steering/drift cue로 읽히지 않는다는 검증 뒤에만 추가

ORS-2B, ORS-4, ORS-5와 ORS-6을 번호 순서대로 구현하지 않는다. M1~M3에서 확인된 제품 요구에 맞는 항목만 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)에서 가져온다.

## M5 — replayability 확장

### 후보 결과물

- 선택 가능한 차량의 실제 주행 성격 차이와 unlock/challenge 규칙
- traffic/opponent와 추월 또는 경쟁 규칙
- 추가 목표, 점수 또는 난이도 변형
- 충분히 다른 새 코스/sector/route

기본 time attack이 반복 플레이의 기준을 만든 뒤에만 진행한다. 단순 차량 수, 장식 traffic이나 시각만 다른 route는 milestone 완료로 보지 않는다.

## M6 — release readiness

### 핵심 결과물

- production performance budget과 브라우저 호환 범위
- 저장 데이터 migration/reset 정책
- keyboard/touch, viewport와 lifecycle 통합 QA
- 공개 가능한 asset/source 정리와 배포 빌드

## 로드맵 운영

| 문서 | 역할 |
| --- | --- |
| [다음 구현 우선순위](./apex-seoul-next-priority-plan.md) | 현재와 바로 다음 milestone의 실행 범위 |
| [후순위 보류 백로그](./apex-seoul-deferred-backlog.md) | 다른 기능에 병합할 때만 다시 여는 세부 항목 |
| 개별 handling/visual/ORS 문서 | 완료된 설계 근거와 회귀 기준 |
| generated telemetry reports | 자동 측정 결과와 수치 기준 |

milestone이 끝나면 결과를 해당 설계 문서에 남기고, 이 로드맵에는 상태와 다음 gate만 갱신한다.
