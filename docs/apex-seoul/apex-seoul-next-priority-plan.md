# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-21

상태: HND-3 progressive corner speed loss 완료. HND-4 understeer 궤적 실패가 현재 최우선이다.

이 문서는 **앞으로 할 일만** 관리한다. 완료된 구현 과정과 발행용 글감은 누적하지 않는다. 세부 설계와 수치는 각 단일 기준 문서 및 자동 QA 결과를 따른다.

## 현재 기준

- Raven Coupe는 FT86 기반 실제 기어비·final drive·타이어 회전 RPM을 사용한다.
- 0-100km/h는 `8.117초`, 60km/h 2단, 100km/h 3단으로 자동 측정된다.
- 표시 속도 envelope는 `225km/h`지만 handling knot와 실주행 승인은 `185km/h`까지다.
- speed cue, FOV, shader는 raw speed ratio를 사용하며 roadside pass rate와 통합 측정되지 않는다.
- understeer 계산은 존재하지만, 현재 `qa:handling-sim` baseline은 drivetrain 변경 뒤 재승인되지 않았다.
- sharp 과속에서 understeer ratio는 1까지 올라가도 바깥 이동이 road-width 대비 작아 정상 통과처럼 느껴진다.
- HND-2에서 감속과 understeer가 단일 `CornerDemandSample.targetSpeed/overspeedRatio`를 사용하게 됐다.
- `qa:corner-demand-sweep`은 synthetic 72개, recovery 16개, 실제 Bugak 구간 9개를 자동 측정한다.
- HND-3에서 matched straight control 24개와 `within / overspeed / severe` speed-loss zone을 추가했다.
- HND-3 downhill 225 raw 손실은 easy/medium/sharp 각각 `5.1% / 20.9% / 38.0%`다.
- HND-3 level corner-only 손실은 `0.75% / 8.70% / 20.15%`로 단계적으로 증가한다.
- HND-3 결과 sharp/level/225는 understeer `1.0`이지만 outward/road는 여전히 작다.
- 실제 Bugak sharp segment 64는 `maxRoadOffset ≈ 960`, outward/road가 약 `0.05` 수준이다.
- 단일 target의 speed ratio, `v²` demand, understeer 연결 invariant 오차는 모두 `0`이다.

세부 설계와 단계는 [225km/h 속도감·핸들링 후속 계획](./apex-seoul-speed-sense-handling-revision-plan.md)을 따른다.

## P1 — HND-4 understeer 궤적 실패

- understeer의 outward motion을 road-width 대비 비율로 조정한다.
- lift/brake 시 speed와 steering authority가 함께 연속 회복되게 한다.
- easy 최고속에도 약한 understeer를 만들고 medium/sharp의 숫자를 실제 line 실패로 연결한다.
- downhill lift-only recovery가 window 안에 끝나지 않는 case를 해결한다.

## P2 — HND-5~HND-6 전달과 실주행 승인

- 물리 trajectory gate 통과 뒤 body yaw와 road motion의 understeer cue를 조정한다.
- prepared/full-throttle, easy/medium/sharp, level/downhill 관계형 QA를 통과시킨다.
- level/left, downhill/right, sharp S-bend를 같은 build에서 실주행한다.
- accidental drift 없이 line 실패와 회복이 읽혀야 한다.

## P3 — SH-1~SH-4 속도감 개선 재개

- handling 승인 전에는 FOV, shader, roadside cadence를 변경하지 않는다.
- 승인 뒤 speed presentation 기준선 자동화부터 재개한다.
- lane dash·reflector·guardrail post를 주 cue로, FOV/shader를 보조로 조정한다.

## 후속 백로그

- launch traction과 실차 대비 0-60 가속 보정
- time attack 결과 화면과 기록 피드백 보강
- 차량 선택과 차량별 handling 성격
- traffic/AI/collision 확장
- 선택적 line target과 sector별 위험·보상

## 현재 하지 않을 것

- 전체 코너를 sharp로 변경
- understeer 숫자만 키우고 trajectory 결과를 확인하지 않는 tuning
- 코너 진입 즉시 target speed로 내리는 hard clamp/auto brake
- 최고속 숫자만 상향
- 상시 camera shake/FOV 확대
- understeer와 drift authority를 하나의 계수로 통합
- 실제 북악 도로의 1:1 복제
- 핸들링 P5 확인 전 대규모 track geometry 변경

## 자동 검증

```bash
npm run qa:powerband-reference --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:speed-cue --workspace @games/apex-seoul
npm run qa:speed-presentation-sweep --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:low-speed-steering --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run qa:vehicle-steering --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run qa:road-width --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

## 완료 조건

- 60/100/150/185/210/225km/h가 HUD 없이 단계적으로 구분된다.
- 185~225km/h에서 조향 pose와 trajectory가 모두 남고 연속적으로 제한된다.
- 0-100km/h가 `7.8~8.3초`를 유지한다.
- 세 종류의 실주행 run에서 speed cue와 understeer가 의도대로 재현된다.
- 자동 QA와 production build가 통과한다.
- 남은 warning은 수용 이유 또는 후속 작업이 명확하다.
- 다음 작업은 이 문서에만 기록하고 완료 이력은 관련 설계 문서의 결과 섹션으로 옮긴다.
