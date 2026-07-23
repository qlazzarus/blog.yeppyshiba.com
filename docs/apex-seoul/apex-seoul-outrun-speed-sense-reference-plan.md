# Apex Seoul 아웃런 스타일 참고 속도감 후속 계획

갱신일: 2026-07-23

상태: longitudinal unit-scale 검증을 첫 gate로 추가했다. ORS-3 traffic과 ORS-5 audio는 기본 도로 흐름 승인 뒤로 보류한다.

## 목표

CSS-1~CSS-4로 코너 시간 길이와 near marker cadence는 개선됐지만, 사용자 리뷰에서는 속도감 개선이 아직 제한적이었다.

다음 단계는 표시 km/h, 구동계, 현재 grip handling과 코너 길이를 유지하면서 화면에 다음 크기의 사건을 추가하는 것이다.

단, 추가 오브젝트보다 먼저 현재 종방향 좌표 환산을 확인한다. Apex Seoul은 `225km/h = 760u/s`를 그대로 `camera.z` 진행량으로 사용한다. 이때 `segmentLength = 240u`이므로 최고속에서도 약 `3.17 segment/s`만 통과한다. 이 값이 다른 OutRun 스타일 게임의 화면 흐름과 같은 감각인지 아직 검증되지 않았다.

```text
micro flow
  lane dash / reflector, 현재 4~6 pass/s

meso pass
  큰 표지판 / 조명 기둥 / 옹벽 이음 / tunnel pillar, 3~5초마다

macro event
  차량 추월 / crest 통과 / gate / 환경 전환, 6~10초마다
```

현재 화면에는 micro flow는 충분하지만 meso와 macro 사건이 적다. 연속 guardrail, 나무, 옹벽은 공간을 설명하지만 오래 보면 하나의 배경층처럼 보인다. 이번 계획은 이 빈 간격을 채우는 데 집중한다.

## 참고 게임에서 확인한 구조

| 게임 | 확인한 구조 | Apex Seoul에 가져올 부분 | 그대로 가져오지 않을 부분 |
| --- | --- | --- | --- |
| OutRun 2006: Coast 2 Coast | 최고속 momentum을 유지하며 traffic 사이를 통과하고, slipstream·checkpoint·분기와 큰 환경 전환을 연속해서 만난다. | 희소한 동일 방향 traffic, 추월 순간의 큰 상대 운동, sector gate와 장면 전환 | drift 중심 코너링과 과도한 traffic collision |
| Horizon Chase / Horizon Chase 2 | 상대 차량과 장애물을 피하며 momentum을 유지한다. 고속에서 camera offset·tilt를 쓰고, 카메라 각도와 고저차로 다음 도로를 보여주거나 숨긴다. | 속도 임계 이후의 짧은 camera bank, crest/downhill reveal, 상대 차량을 이용한 크기 변화 | 상시 camera roll, nitro zoom을 일반 주행에 상시 적용 |
| Slipstream | pseudo-3D에서 slipstream, optional traffic, rivals, branching path와 빠른 지역 전환을 결합한다. | traffic을 단순 장식이 아니라 접근→추월→이탈 사건으로 구성, 장기적으로 route fork 검토 | 현재 grip 주행을 drift/slipstream 보상 중심으로 변경 |
| Victory Heat Rally | 2.5D super-scaler 화면, 빠른 음악, 경쟁 차량과 서로 다른 환경을 사용해 주행 중 시각·청각 상태가 계속 바뀐다. | foreground scale 변화, 추월과 환경별 음향 accent | non-stop drift와 과장된 차량 자세 |

근거 자료:

- [OutRun 2006 hands-on](https://www.gamespot.com/articles/outrun-2006-coast-2-coast-hands-on/1100-6147417/)
- [OutRun 2006 review](https://www.gamespot.com/reviews/outrun-2006-coast-2-coast-review/1900-6148519/)
- [Horizon Chase game-feel postmortem](https://zumbigordo.tumblr.com/post/128788533317/horizonchase-devteam-interview-ep-6-game)
- [Horizon Chase 2 level-design postmortem](https://www.horizonchase.com/blog/the-making-of-japan)
- [Slipstream 공식 Steam 페이지](https://store.steampowered.com/app/732810/Slipstream/)
- [Victory Heat Rally 공식 Nintendo 페이지](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-download-software/Victory-Heat-Rally-2705899.html)
- [Jake Gordon Javascript Racer 소스](https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html)
- [CannonBall Enhanced OutRun Engine 소스](https://github.com/djyt/cannonball)

## longitudinal unit-scale 예비 진단

### raw unit는 게임 사이에서 직접 비교할 수 없다

`760u/s`와 다른 게임의 `12,000u/s`를 숫자만 비교해서는 안 된다. 게임마다 road width, segment length, camera height, draw distance와 projection 식이 다르기 때문이다.

다음 정규화 값으로 비교한다.

```text
segment flow        = worldTravelSpeed / segmentLength
road-width flow     = worldTravelSpeed / fullRoadWidth
visible-depth time  = objectDrawDistance / worldTravelSpeed
near-pass time      = object가 screenY 60% → 95%를 통과하는 시간
scale doubling time = roadside object 높이가 2배가 되는 시간
```

`segment/s`와 `road-width/s`는 내부 구조 비교용이다. 최종 승인은 상용 게임 영상과 Apex replay의 `near-pass time`, `scale doubling time`처럼 화면에서 직접 관찰되는 값으로 한다.

### 현재 Apex Seoul 수치

기준:

- `segmentLength = 240u`
- 기본 full road width `= 1,920u`, commitment 최소 full width `= 1,640u`
- road object nominal draw distance `= 9,800u`
- `worldTravelSpeed = km/h / 225 × 760`

| 표시 속도 | world u/s | segment/s | 기본 road-width/s | 9,800u 통과 시간 |
| ---: | ---: | ---: | ---: | ---: |
| 110km/h | 371.56 | 1.548 | 0.194 | 26.38초 |
| 150km/h | 506.67 | 2.111 | 0.264 | 19.34초 |
| 185km/h | 624.89 | 2.604 | 0.325 | 15.68초 |
| 225km/h | 760.00 | 3.167 | 0.396 | 12.89초 |

실제 오브젝트는 fog, crest와 screen-size threshold 때문에 9,800u 전체 구간에서 선명하게 보이지 않는다. 따라서 마지막 열은 실제 체감 시간이 아니라 현재 world scale의 상한 성격을 설명하는 값이다.

### 소스가 공개된 OutRun식 엔진과의 구조 차이

Jake Gordon의 Javascript Racer는 다음 값을 사용한다.

- `segmentLength = 200`
- road half-width `= 2,000`, full width `= 4,000`
- `step = 1/60초`
- `maxSpeed = segmentLength / step = 12,000u/s`
- 최고속 `60 segment/s`, `3 full-road-width/s`
- `drawDistance = 300 segment`라 최고속 이론 visible-depth time은 약 `5초`

이 구현은 collision 검사를 위해 한 frame에 한 segment 이상 이동하지 않도록 최고속을 정한 기술 demo다. 따라서 `60 segment/s`를 Apex 목표로 복사하지 않고, 현재 `3.17 segment/s`와 화면 통과 시간이 크게 다른 방향성만 확인한다.

원본 OutRun을 재구현한 CannonBall은 HUD에 표시하는 `car_increment >> 16`과 road position을 직접 동일시하지 않는다. `CAR_BASE_INC`를 곱한 fixed-point 변환을 거쳐 `road_pos`를 증가시킨다. 즉 표시 속도와 코스 좌표 이동 사이에 명시적인 변환 계층이 있다.

이 비교로 현재 단계에서 확정할 수 있는 것은 다음뿐이다.

- Apex의 `1 physical speed unit = 1 longitudinal world unit/s` 관계는 검증된 기준이 아니다.
- 다른 게임의 배율을 그대로 가져오는 것도 근거가 부족하다.
- traffic, audio와 추가 효과 전에 longitudinal scale을 독립 변수로 A/B해야 한다.

## 핵심 판단

### 1. 다음 1순위는 content 추가가 아니라 longitudinal scale 검증이다

현재 `player.speed`는 powertrain, 표시 km/h와 world progression 역할을 함께 가진다. 비교 결과 종방향 진행이 느리다고 확인되면 다음처럼 책임을 분리한다.

```text
physicalSpeed
  → engine / gear / 표시 km/h / corner demand

worldTravelSpeed = physicalSpeed × longitudinalUnitScale
  → camera Z / track progress / road object pass / sector time
```

`camera.z`에만 임시 배율을 곱하는 시각 효과로 구현하지 않는다. 하나의 `worldTravelSpeed`가 track progress, corner sampling, object projection, crest, collision과 telemetry에 일관되게 사용되어야 한다.

### 2. marker 추가보다 큰 scale 변화가 우선이다

lane dash와 reflector는 이미 코너에서 약 `4~6 pass/s`다. 같은 종류의 작은 표식을 더 늘리면 화면만 복잡해지고, 속도대 구분 개선은 작을 가능성이 높다.

OutRun 계열에서 강한 cue는 다음 물체가 멀리서 나타나 화면을 크게 차지한 뒤 옆으로 빠져나가는 과정이다.

- 느린 차량을 따라잡고 추월한다.
- 큰 표지판, 조명 기둥 묶음, tunnel pillar를 가까이 통과한다.
- crest 뒤에 숨었던 도로와 skyline이 한 번에 열린다.
- checkpoint나 환경 경계가 화면 전체를 가로지른다.

따라서 다음 prototype은 같은 물체를 더 촘촘히 반복하지 않고 크기 변화가 큰 물체를 희소하게 배치한다.

### 3. traffic은 유효하지만 기본 도로 흐름 승인 뒤로 미룬다

traffic은 강한 상대 운동을 만들지만 잘못된 unit scale을 다른 차량으로 가릴 수 있다. ORS-1/2/4/6에서 도로 자체 흐름이 승인되기 전에는 구현하지 않는다. 이후 첫 traffic prototype의 목적도 AI 경쟁이나 충돌이 아니라, 플레이어보다 느린 같은 방향 차량이 화면 중앙에서 커지고 차 옆으로 빠르게 흘러나가는 상대 운동을 만드는 것이다.

첫 구현에서는 다음을 고정한다.

- 화면에 동시에 보이는 traffic은 `1~3대` 이내
- 150~185km/h recovery 구간에서 추월 사건은 약 `6~9초`마다 1회
- 서로 다른 차선 offset과 속도 차를 사용해 일렬 반복을 피함
- 물리와 코너 목표 속도에는 영향 없음
- prototype에서는 collision을 끄고 A/B하며, 출시에 포함하기 전 collision 또는 회피 규칙을 별도 승인
- 정면으로 오는 차량은 사용하지 않음

### 4. 카메라는 지속 효과보다 전환 순간에만 쓴다

Horizon Chase의 camera offset·tilt는 속도 임계 이후 조향 순간에만 존재한다. Apex Seoul도 같은 원칙으로 turn-in, crest reveal, 추월의 세 사건에만 짧은 cue를 검토한다.

- turn-in camera bank 후보: `0.35~0.75°`
- lateral camera offset 후보: `4~10px`
- rise/settle: 각각 `0.15~0.45초`
- 기존 steady speed FOV와 shader envelope는 유지
- 상시 shake, 상시 roll, 코너 전체에 유지되는 확대는 추가하지 않음

### 5. 코스 연장은 unit scale 확정과 환경 전환을 동반할 때만 의미가 있다

현재 코스는 이미 `348 segment / 83,520 unit`으로 늘었다. 같은 숲·옹벽·guardrail을 더 길게 반복하는 연장은 속도감보다 체류 시간만 늘린다.

추가 연장은 다음 중 하나가 있을 때만 한다.

- tunnel 진입→내부 조명 cadence→출구 skyline reveal
- forest wall→viewpoint/open ridge처럼 근경 밀도가 크게 변하는 sector
- route gate 뒤에 도로 폭, 조명색, roadside silhouette가 바뀌는 전환
- crest 직후 다음 6~10초의 도로가 한 번에 열리는 downhill reveal

실제 branch 선택은 traffic과 sector transition이 승인된 뒤의 장기 작업으로 둔다.

## 실행 계획

### ORS-1 — 타 게임 unit-scale 정규화와 화면 기준선

소스가 공개된 엔진은 내부 단위를 계산하고, 상용 게임은 60fps 이상 gameplay footage를 화면 단위로 측정한다.

내부 구조 비교:

- Apex Seoul
- Jake Gordon Javascript Racer
- CannonBall/OutRun road-position conversion

화면 flow 비교:

- OutRun 2006 또는 원본 OutRun/CannonBall
- Horizon Chase Turbo
- Slipstream
- 비교 장면은 boost, drift와 traffic이 없는 flat straight / easy sweep를 우선 사용

현재 빌드에서도 110/150/185/225km/h 고정 replay를 만들고 다음을 분리해 센다.

- micro marker pass/s
- segment/s, road-width/s와 nominal visible-depth time
- road mark와 roadside object의 `screenY 60% → 95%` 통과 시간
- roadside object의 `16→32px`, `32→64px` scale doubling time
- 화면 높이 `15%` 이상으로 커졌다가 사라지는 meso pass 수
- traffic, gate, crest, 환경 전환의 macro event 수
- 의미 있는 사건 없이 유지되는 최대 시간
- camera FOV/offset/roll과 player anchor 변화

비교 캡처는 HUD on/off를 각각 남긴다. 체감 평가는 HUD off 10초 클립으로 현재 빌드와 후보를 무작위 비교한다.

완료 조건:

- 현재 문제가 marker 수, longitudinal unit scale, camera projection과 content gap 중 어디에 있는지 분리한다.
- 상용 게임의 raw unit를 추정하지 않고 동일 해상도의 screen-space 시간만 비교한다.
- 이후 모든 후보가 같은 속도, 입력, 코너와 화면 크기를 사용한다.

### ORS-2A — longitudinal unit-scale A/B

ORS-1 결과를 바탕으로 표시 km/h와 powertrain을 고정한 채 world progression 후보를 비교한다.

첫 후보:

| 후보 | longitudinalUnitScale | 150km/h segment/s | 185km/h segment/s |
| --- | ---: | ---: | ---: |
| U0 | 1.00 | 2.111 | 2.604 |
| U1 | 1.25 | 2.639 | 3.255 |
| U2 | 1.50 | 3.167 | 3.906 |
| U3 진단 상한 | 1.75 | 3.694 | 4.556 |

규칙:

- 표시 km/h, engine force, gear, RPM과 가속 시간은 변경하지 않는다.
- `worldTravelSpeed` 변환을 한 곳에서 만들고 모든 spatial consumer가 같은 값을 사용한다.
- candidate별 corner entry/apex/exit 시간, steering input window와 rail 접근을 다시 측정한다.
- U3는 목표값이 아니라 느린 원인이 unit scale인지 확인하기 위한 진단 상한이다.
- 다른 게임의 `60 segment/s` 같은 값을 목표로 복사하지 않는다.

완료 조건:

- HUD off A/B에서 어느 배율부터 150/185km/h가 의도한 속도로 읽히는지 확인한다.
- 선택 후보가 현재 grip handling의 조작 가능 시간과 corner grade 관계를 훼손하지 않는다.
- unit scale만으로 충분하면 object, camera와 course content를 추가하기 전에 그 결과를 사용자에게 리뷰받는다.
- 모든 후보가 handling을 훼손하면 배율 적용을 중단하고 projection/geometry scale 문제로 진단 범위를 옮긴다.

### ORS-2B — roadside hero pass prototype

longitudinal scale 승인 뒤 구현할 첫 content 후보는 큰 roadside anchor다.

후보:

- 반사 표지판 또는 코너 번호 sign
- 2~3개가 한 묶음인 조명 기둥
- 옹벽의 밝은 수직 seam 또는 tunnel pillar
- 도로를 가로지르는 sector gantry
- 가까운 나무 한 그루보다 silhouette가 분명한 구조물

배치 규칙:

- 고속 recovery/easy sweep에서 `3~5초`마다 1회
- 강한 코너에서는 apex 시야를 가리지 않도록 바깥쪽에 최대 1~2개
- 좌우를 기계적으로 번갈아 놓지 않고 코스 문맥을 따름
- 먼 거리에서는 낮은 contrast, 가까워질수록 edge와 반사가 읽힘
- curve sign, guardrail contact line, headlight pool과 겹치지 않음

완료 조건:

- 기존 marker 수를 늘리지 않고 meso event 최대 공백이 `5초` 이하가 된다.
- 150/185km/h의 통과 크기와 screen velocity가 110km/h보다 명확히 크다.
- black/blue 야간 장면과 실제 북악 영감이 유지된다.

### ORS-3 — sparse traffic / overtake prototype — 후순위 보류

ORS-1/2/4/6 승인 뒤 동일 방향 traffic을 별도 A/B로 추가한다.

구현 단위:

1. player와 독립된 longitudinal Z, lateral offset, visual speed를 가진 traffic state
2. pseudo-3D road projection과 crest/occlusion을 공유하는 renderer
3. `approach → side pass → rear exit` phase와 telemetry
4. recovery/easy 구간 중심의 deterministic spawn schedule
5. 추월 직전 곡률과 player offset을 보고 반대쪽 여유 차선에 배치

첫 prototype은 시각 효과만 검증한다. collision, 추월 점수, slipstream boost와 경쟁 AI는 포함하지 않는다.

완료 조건:

- 150~185km/h에서 추월이 `6~9초`마다 발생하지만 동시에 `3대`를 넘지 않는다.
- 차량이 road surface, crest와 guardrail에 맞게 투영되고 pop-in하지 않는다.
- corner sign과 시선을 가리지 않으며 핸들링·km/h·코너 속도 손실이 기준선과 동일하다.
- traffic 없는 ORS-2와 traffic만 있는 ORS-3를 별도 비교해 기여도를 확인한다.

### ORS-4 — elevation reveal과 제한적 카메라 반응

ORS-2A/2B 승인 뒤 다음을 독립 toggle로 비교한다.

- crest 직전 보이는 도로를 짧게 줄이고 crest 뒤 downhill span을 빠르게 공개
- turn-in의 작은 horizontal offset와 bank
- tunnel/gantry 통과 때 FOV가 아니라 조명과 화면 프레임 변화로 속도를 강조

완료 조건:

- steady corner에서 camera가 기울어진 채 머물지 않는다.
- player vehicle anchor, rail projection과 headlight alignment가 기존 QA 범위 안이다.
- camera cue를 끈 상태에서도 ORS-2A/2B 개선이 유지된다.

### ORS-5 — 사건 기반 오디오 — 마지막 보류

unit scale, roadside, camera/crest, sector와 traffic까지 승인된 뒤 소리를 추가한다.

- 110/150/185km/h band별 wind/road noise
- 큰 roadside anchor의 짧은 좌우 whoosh
- traffic 접근과 side pass의 약한 Doppler/pan
- grip corner에는 tire scrub만 사용하고 drift squeal을 재사용하지 않음
- 음악은 BPM 자체보다 sector 전환과 checkpoint accent를 우선 검토

상시 고주파음을 키우지 않고 통과 사건의 타이밍을 소리로 확인하는 것이 목적이다.

### ORS-6 — sector transition과 선택적 route fork

기본 도로 흐름의 마지막 단계이며, 후순위인 ORS-3 traffic과 ORS-5 audio보다 먼저 검증한다.

- 첫 후보는 실제 분기 없이 `forest wall → tunnel → open ridge`의 3-sector 전환
- 각 sector는 roadside scale, light cadence와 skyline silhouette가 달라야 함
- sector gate 간격은 약 `20~35초`를 후보로 측정
- 전환이 총 코스 시간을 늘리기만 하면 기존 길이 안에서 재배치
- route fork는 두 경로가 주행 리듬과 시각 언어 모두 다를 때만 구현

## 우선순위와 예상 효과

| 우선순위 | 후보 | 속도감 기대 | 구현 위험 | 판단 |
| ---: | --- | --- | --- | --- |
| 1 | unit-scale/reference audit | 매우 높음 | 낮음 | 첫 gate |
| 2 | longitudinal scale A/B | 매우 높음 | 중간 | content보다 먼저 검증 |
| 3 | roadside hero pass | 높음 | 낮음 | scale 승인 뒤 구현 |
| 4 | crest reveal + transient camera | 중간 | 중간 | 보조 cue로 제한 |
| 5 | sector transition | 높음 | 높음 | unit scale 확정 뒤 코스 연장과 함께 검토 |
| 6 | sparse traffic overtake | 매우 높음 | 중간~높음 | 기본 도로 흐름 승인 뒤 보류 해제 |
| 7 | event audio | 중간~높음 | 낮음~중간 | 마지막 통합 단계 |
| 보류 | marker 추가 증량 | 낮음 | 낮음 | 현재 4~6Hz라 더 늘리지 않음 |
| 보류 | 상시 FOV/shake | 단기만 높음 | 멀미·가독성 위험 | 사용하지 않음 |

실행 순서는 번호 순서가 아니라 다음 gate를 따른다.

```text
ORS-1 unit/reference audit
  → ORS-2A longitudinal scale A/B
  → 사용자 속도감·핸들링 리뷰
  → ORS-2B roadside hero pass
  → ORS-4 crest/camera
  → ORS-6 sector transition
  → ORS-3 traffic
  → ORS-5 audio
```

현재 구현 범위는 `ORS-1 → ORS-2A`까지다. traffic과 audio는 이 범위에 포함하지 않는다.

## 통합 승인 기준

- 표시 km/h, engine/gear, corner demand, understeer, drift와 collision 상수는 유지한다. `camera.z` 진행률은 선택한 world conversion을 사용한다.
- 표시 속도와 world progression의 환산은 한 곳에서 정의되고 모든 spatial system이 같은 값을 사용한다.
- 타 게임 비교는 raw unit가 아니라 segment/s, near-pass time과 scale doubling time을 함께 기록한다.
- 코너 marker `4~6 pass/s`는 유지하되 더 늘리지 않는다.
- 150~185km/h에서 meso event 최대 공백은 `5초` 이하, macro event는 평균 `6~10초`마다 발생한다.
- HUD off 10초 A/B에서 현재 빌드보다 빠르게 보이고, 110/150/185km/h 순서가 구분된다.
- traffic과 hero object가 curve sign, road edge와 player trajectory를 가리지 않는다.
- 기존 handling, corner speed, guardrail, top-speed, production build QA가 모두 통과한다.
- scene 변화가 속도감을 만들며 실제 물리 속도를 시각 배율로 위장하지 않는다.

## 이번 단계에서 하지 않을 것

- ORS-1 근거와 A/B 없이 production world progression 배율 확정
- 근거 없이 타 게임의 raw speed나 segment/s를 그대로 복사
- `camera.z`에만 배율을 곱하고 collision/object/telemetry를 분리
- lane dash와 reflector의 추가 증량
- grip 코너에 drift smoke, 큰 slip angle 또는 drift sprite 사용
- 상시 camera shake, 상시 roll, 전체 구간 FOV 확대
- 빠르게 움직이는 원경 sky/city 배경
- ORS-1/2A 승인 전에 traffic과 audio 구현
- traffic collision, 추월 점수, slipstream boost를 첫 traffic prototype에 포함
- 장면 변화 없이 코스 길이만 추가
