# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-20

상태: 핸들링 P0~P4와 자동 검증 완료. P5 실주행 검증이 현재 최우선이다.

이 문서는 **앞으로 할 일만** 관리한다. 완료된 구현 과정과 발행용 글감은 누적하지 않는다. 세부 설계와 수치는 각 단일 기준 문서 및 자동 QA 결과를 따른다.

## 현재 기준

- `0~185km/h` 기본 조향은 연속 speed handling profile을 사용한다.
- 저속 authority 중복 적용과 정지 상태 steering preload를 제거했다.
- 고속 pose와 실제 trajectory 제한을 분리했다.
- overspeed understeer는 가속 페달이 아니라 코너 속도 예산 대비 현재 속도로 계산한다.
- 무가속 sharp 진입에서도 understeer가 발동하고, 무조향 상태에는 추가 outward force가 생기지 않는다.
- handling baseline은 신규 demand-only 시나리오를 포함해 `91.4/100`이다.
- 자동 QA에는 기존 sharp drift outside/apex entry loss warning 하나가 남아 있다.

상세 핸들링 설계와 최신 수치는 [속도대별 핸들링 개선 계획](apex-seoul-speed-band-handling-plan.md)을 따른다.

## P1 — 핸들링 P5 실주행 검증

자동 QA가 체감을 대신하지 않으므로 같은 빌드에서 아래 세 run을 각각 최소 60초 기록한다.

1. `grip only`
2. `prepared grip`
3. `drift mixed`

확인 항목:

- 30→60km/h에서 조향이 갑자기 살아나지 않는가?
- 60~110km/h에서 입력과 횡이동이 한 동작으로 읽히는가?
- 170~185km/h에서 차량 pose는 남고 trajectory만 제한되는가?
- sharp overspeed가 단순 입력 무시가 아니라 넓어진 회전반경으로 읽히는가?
- throttle lift 뒤에도 속도 부채가 남은 동안 understeer가 자연스럽게 이어지는가?
- downhill sharp가 shoulder 강제나 즉시 감속처럼 느껴지지 않는가?

조정 규칙:

- 한 반복에서는 speed profile과 overspeed overlay 중 한 축만 바꾼다.
- 최고 understeer 값을 먼저 키우지 않는다. 발동 시점, outward build, 시각 전달을 순서대로 본다.
- drift warning은 실제 outside entry가 지나치게 유리할 때만 수정한다.

## P2 — 언더스티어 시각 전달

P1에서 물리 효과는 충분하지만 체감이 약할 때만 진행한다.

- 차량 nose/pose와 실제 lateral trajectory의 차이를 작은 slip cue로 보여 준다.
- camera 또는 road anchor의 짧은 횡지연 후보를 비교한다.
- 타이어 scrub, shadow, road flow 중 한 채널만 먼저 사용한다.
- steering pose 자체를 숨겨 언더스티어를 표현하지 않는다.

통과 기준:

- 같은 sharp 코너에서 prepared grip과 overspeed grip을 HUD 없이 구분할 수 있다.
- cue를 꺼도 물리 결과는 동일하다.
- straight/easy 고속 주행에는 상시 흔들림이나 횡지연이 생기지 않는다.

## P3 — Roadside cue와 코스 라인 비용

P1/P2 뒤에도 한 차선 고정 주행이 손실 없이 성립할 때만 진행한다.

1. commitment 진입 바깥쪽의 reflector·chevron cadence를 높인다.
2. recovery와 open-view에서는 밀도를 낮춰 속도 대비를 만든다.
3. 기존 segment별 width profile과 실제 road edge를 marker 배치의 기준으로 사용한다.
4. cue 보정만으로 부족할 때만 segment별 line target 또는 shoulder 비용을 검토한다.

도로폭, 차량 sprite 크기, controller 상수를 같은 반복에서 함께 바꾸지 않는다.

## 후속 백로그

- 차량별 powerband와 shift 감각 확장
- time attack 결과 화면과 기록 피드백 보강
- 차량 선택과 차량별 handling 성격
- traffic/AI/collision 확장
- 선택적 line target과 sector별 위험·보상

## 현재 하지 않을 것

- 전체 코너를 sharp로 변경
- 최고속 숫자만 상향
- 상시 camera shake/FOV 확대
- understeer와 drift authority를 하나의 계수로 통합
- 실제 북악 도로의 1:1 복제
- 핸들링 P5 확인 전 대규모 track geometry 변경

## 자동 검증

```bash
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:low-speed-steering --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run qa:vehicle-steering --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run qa:road-width --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

## 완료 조건

- P1 세 run에서 속도대 연결과 understeer 발동이 같은 문제를 재현하지 않는다.
- 자동 QA와 production build가 통과한다.
- 남은 warning은 수용 이유 또는 후속 작업이 명확하다.
- 다음 작업은 이 문서에만 기록하고 완료 이력은 관련 설계 문서의 결과 섹션으로 옮긴다.
