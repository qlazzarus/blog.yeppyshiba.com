# Apex Seoul 후순위 보류 백로그

갱신일: 2026-07-29

상태: active roadmap에서 제외된 세부 항목을 한 곳에서 관리한다. 이 문서의 항목은 단독 작업으로 시작하지 않고, 연결된 상위 기능을 구현할 때 함께 재검토한다.

## 운영 원칙

- 현재 작업 순서는 [구현 로드맵](./pseudo-3d-apex-seoul-roadmap.md)과 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)에서만 관리한다.
- 이 문서는 아이디어 저장소가 아니라 **재활성화 조건이 있는 보류 목록**이다.
- 항목을 다시 열 때는 별도 prototype 번호를 늘리지 않고 해당 상위 기능의 설계·QA에 합친다.
- U2 `longitudinalScale=2`, 현재 grip/drift/understeer, 표시 km/h와 powertrain을 기본 회귀 기준으로 유지한다.
- 사용자 피드백, 명확한 제품 요구 또는 실제 회귀가 없으면 보류 상태를 유지한다.

## 코스·환경에 합칠 항목

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-01 | roadside hero pass | ORS-2B | 코스 환경·랜드마크 제작 | 새 sector 미술 작업에서 반복되는 숲/옹벽을 구분할 큰 구조물이 필요할 때 |
| D-02 | sector transition, 선택적 route fork | ORS-6 | track/sector 구조 개편 | time attack 코스에 서로 다른 주행·시각 정체성을 가진 구간이 둘 이상 필요할 때 |
| D-03 | crest reveal, 짧은 camera bank/offset | ORS-4 | elevation·카메라 polish | 새 crest/downhill 구간을 만들거나 진입 방향 가독성 문제가 확인될 때 |
| D-04 | 추가 코스 연장·longitudinal resampling | CSS-5, ORS-2A 후속 | track geometry rebalance | U2에서 grip 조작 시간이 부족하거나 게임 루프가 요구하는 목표 주행 시간이 모자랄 때 |
| D-05 | 선택적 line target과 sector별 위험·보상 | 기존 후속 백로그 | 코스 gameplay 규칙 | sector split이나 점수 규칙이 실제 라인 선택을 요구할 때 |

### 보존 규칙

- D-01은 기존 marker 수를 단순 증량하지 않는다. 환경 제작 자산과 같은 pass에서 배치한다.
- D-02는 장면 변화 없이 코스 길이만 늘리는 작업으로 대체하지 않는다.
- D-03은 steady FOV, 상시 shake 또는 코너 전체 roll로 확장하지 않는다.
- D-04는 handling 상수를 먼저 바꾸지 않고 코스 시간·entry/apex/exit window를 함께 재측정한다.

## 콘텐츠 확장 구조에 합칠 항목

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-16 | track/vehicle typed registry | 2026-07-29 확장성 점검 | 두 번째 정식 코스 또는 세 번째 플레이어 차량 제작 | 새 콘텐츠를 추가할 때 `road.ts`의 ID 분기, `main.ts`의 asset import·checkpoint·launch 분기를 함께 수정해야 하는 상태가 실제 작업 비용이나 회귀 위험이 될 때 |

### 보존 규칙

- D-16은 ECS 전환이 아니다. Phaser Scene의 lifecycle과 현행 단일 player/camera/road 실행 순서는 유지한다.
- track 정의는 geometry, finish coast, run checkpoint/countdown, scenery profile을 함께 소유한다. Scene과 HUD는 선택된 track 정의를 읽고 전역 checkpoint 상수를 읽지 않는다.
- vehicle 정의는 atlas/sprite/shadow asset, engine profile, 선택 가능한 color, capability(예: launch control)를 함께 소유한다. 차량 ID 조건문으로 기능을 분기하지 않는다.
- 새 registry에는 ID fallback, atlas contract, checkpoint 수 가변 HUD, 코스별 best-run key를 고정하는 fixture를 추가한다. 기존 handling·runtime QA와 production build도 회귀 기준으로 유지한다.

## 기록·고스트 주행에 합칠 항목

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-17 | 버전 호환 개인 기록, 구간 PB, PB ghost replay | 2026-07-29 기록/고스트 구조 점검 | time attack records·ghost vehicle | 개인 기록을 전체 완주 시간 이상으로 비교할 필요가 생기거나, 같은 코스에서 이전 최고 주행과 동시에 달릴 UX를 만들 때 |

### 보존 규칙

- 기록은 `trackId`, `vehicleId`와 함께 `trackGeometryRevision`, `vehiclePhysicsRevision`, `longitudinalScaleRevision`, `recordSchemaVersion`을 metadata로 저장한다. key에는 stable ID를 사용하고 호환성 판단은 metadata로 한다.
- `trackGeometryRevision`은 section 순서·curve/elevation/road width·segment length·finish/checkpoint 위치를 바꿀 때만 올린다. 환경 sprite·색상·HUD 문구만 바꾸는 경우에는 올리지 않는다.
- `vehiclePhysicsRevision`은 engine profile, controller/guardrail/launch force처럼 주행 궤적이나 시간에 영향을 주는 값을 바꿀 때 올린다. atlas·색상·shadow 변경은 올리지 않는다.
- `longitudinalScaleRevision`은 world travel scale 또는 그 의미를 바꿀 때 올린다. 같은 숫자의 runtime QA override는 정식 기록을 만들지 않는다.
- 기록 화면은 동일한 호환 버전의 전체 PB와 checkpoint별 sector PB만 기본 비교 대상으로 삼는다. 버전이 다른 기록은 보관하되 현재 PB·delta·ghost 후보에서 제외하거나 명확히 "이전 버전"으로 표시한다.
- ghost는 input 재시뮬레이션이 아니라 시간 기준으로 보간하는 비충돌 trajectory replay로 시작한다. PB 갱신 때만 경량 sample(`t`, world `z`, lateral offset, steering/pose, speed, drift state)을 저장하며, player와 ghost 사이의 물리·충돌·기록 판정은 만들지 않는다.
- QA는 동일 호환 버전의 저장/로드·sector PB 갱신·trajectory 보간, 버전 불일치 시 ghost 비활성화, schema migration/무효 데이터 fallback을 고정한다.

## 교통·경쟁·리플레이성에 합칠 항목

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-06 | sparse traffic의 접근→추월→이탈 | ORS-3 | traffic/opponent 시스템 | 기본 time attack loop가 완성되고 상대 차량이 플레이 규칙에 실제 역할을 가질 때 |
| D-07 | traffic collision, 추월 점수, slipstream, 경쟁 AI | ORS-3 장기안 | 경쟁·점수 시스템 | D-06의 투영·spawn·occlusion이 승인되고 충돌/보상 규칙이 정의됐을 때 |
| D-08 | 차량 선택과 차량별 handling 성격 | 기존 후속 백로그 | garage/vehicle progression | 두 번째 차량이 단순 스킨이 아닌 다른 주행 선택을 제공할 때 |

### 보존 규칙

- traffic은 느린 도로 흐름을 가리는 장식으로 먼저 넣지 않는다.
- 첫 traffic 작업은 정면 차량, 경쟁 AI, slipstream과 collision을 한 번에 묶지 않는다.
- 차량별 handling은 현재 Raven Coupe 회귀 기준을 복제한 뒤 차이를 추가한다.

## 피드백·렌더·오디오에 합칠 항목

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-09 | 사건 기반 wind/road/whoosh/traffic audio | ORS-5 | 통합 audio feedback pass | checkpoint, pass, collision, drift exit 등 사건 종류와 우선순위가 고정됐을 때 |
| D-10 | headlight road geometry mask | headlight rendering plan | road occlusion/render pass | crest 또는 road edge 누출이 실제 화면에서 재현될 때 |
| D-11 | 좌·우 grip/drift/counter headlight 브라우저 매트릭스 | headlight rendering plan | release visual QA | headlight shader, atlas 또는 vehicle pose가 다시 변경되거나 release 후보를 만들 때 |
| D-12 | tail light, shadow, smoke/glow 추가 polish | 초기 roadmap | vehicle feedback pass | 현재 frame/understeer cue만으로 brake·drift·recovery 상태가 구분되지 않는 장면이 확인될 때 |

### 보존 규칙

- D-09는 상시 고주파음을 키우는 방식이 아니라 사건 타이밍을 보강한다.
- D-10은 shader-only 경로로 해결되지 않는 실제 누출이 있을 때만 RenderTexture/mask를 재검토한다.
- grip에는 drift smoke, 큰 slip angle 또는 drift 전용 sprite를 사용하지 않는다.

## 물리·핸들링 후속

| ID | 보류 항목 | 기존 출처 | 합칠 상위 작업 | 재활성화 조건 |
| --- | --- | --- | --- | --- |
| D-13 | HND-6 추가 수동 매트릭스와 체감 미세 조정 | handling plans | handling regression/polish | 새 차량·코스·입력 장치에서 understeer/line 관계가 달라지거나 사용자 회귀가 보고될 때 |
| D-14 | launch traction과 실차 대비 0-60 보정 | 기존 후속 백로그 | drivetrain authenticity pass | 차량 성격 비교나 기록 밸런스에서 발진 구간이 핵심 문제가 될 때 |
| D-15 | 210~225km/h 추가 FOV/shader/steering tuning | SH 후속 | high-speed polish | U2 기준 최고속에서 새로운 가독성·조작 문제가 재현될 때 |

### 보존 규칙

- 현재 grip, drift, counter, recovery와 U2 속도감은 승인된 기준선으로 취급한다.
- 숫자 하나를 키우는 tuning보다 trajectory, corner loss, rail 접근과 표시 속도 identity를 함께 검증한다.
- 새 문제 없이 “더 강한 연출”만을 이유로 D-13~D-15를 재개하지 않는다.

## 명시적 비목표

다음 항목은 보류 작업이 아니라 현재 방향에서 제외한 선택이다.

- lane dash와 reflector의 추가 밀도 증량
- 상시 camera shake, 상시 roll, 전체 구간 FOV 확대
- 타 게임 raw unit 또는 `segment/s`의 직접 복사
- `camera.z`만 빠르게 하고 collision/object/telemetry를 분리하는 구현
- understeer와 drift authority를 하나의 계수로 통합
- 모든 코너의 sharp화 또는 hard auto-brake
- 실제 북악 도로의 1:1 복제
- 장면 변화 없는 단순 코스 연장

## 재활성화 절차

1. active roadmap의 상위 milestone과 사용자 가치를 먼저 적는다.
2. 이 문서에서 필요한 ID만 선택하고 나머지는 계속 보류한다.
3. 해당 상위 기능 문서로 요구사항과 QA를 옮긴다.
4. 기존 자동 QA와 production build를 회귀 기준으로 실행한다.
5. 완료 후 이 문서에는 결과를 누적하지 않고 상태와 새 기준 문서 링크만 갱신한다.
