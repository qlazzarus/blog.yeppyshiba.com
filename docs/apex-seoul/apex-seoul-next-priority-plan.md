# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-22

상태: HND-6, SH-1~SH-7, 최고속 평형 TSE-1~TSE-6, Visual Rail RAIL-1~RAIL-2 자동 검증 완료. 사용자 리뷰에서 코너 통과 속도감이 새 최우선 과제로 확인됐다.

이 문서는 **앞으로 할 일만** 관리한다. 완료된 구현 과정과 발행용 글감은 누적하지 않는다. 세부 설계와 수치는 각 단일 기준 문서 및 자동 QA 결과를 따른다.

## 현재 기준

- Raven Coupe는 FT86 기반 실제 기어비·final drive·타이어 회전 RPM을 사용한다.
- 0-100km/h는 `8.117초`, 60km/h 2단, 100km/h 3단으로 자동 측정된다.
- 표시 속도 envelope는 `225km/h`지만 handling knot와 실주행 승인은 `185km/h`까지다.
- Raven physical mapping은 선형이며 `speed unit/s = km/h / 225 × 760`이다. 60/100/150/185/225km/h는 각각 약 `202.7 / 337.8 / 506.7 / 624.9 / 760 unit/s`다.
- speed cue는 `70 / 110 / 150 / 185 / 210 / 225km/h` band를 사용하며 210~225km/h steady cue는 `0.1`로 hold된다.
- lane dash와 reflector는 매 segment 주기라 150km/h 약 `2.11Hz`, 225km/h 약 `3.17Hz`로 통과한다.
- SH-4 FOV bonus는 185/210/225km/h에서 `3.9° / 4.732° / 5.2°`이며 185→225km/h에 `1.3°`를 남긴다.
- SH-1은 12개 속도 band의 unit/cadence/cue/FOV/shader/straight handling을 JSON과 표로 고정했고 inverse identity 오차는 `0km/h`다.
- SH-1에서 185→225km/h straight base handling profile delta가 `0`임을 확인했다. HND 코너 overlay와 별도로 향후 speed handling knot 검토에 사용한다.
- SH-3에서 lane dash를 매 segment의 짧은 dash/gap으로 분리하고 reflector 간격을 1 segment로 줄였다. 225km/h theoretical cadence는 둘 다 `3.167/s`다.
- SH-3 225km/h runtime reflector rolling pass rate는 최대 `4/s`였으며 guardrail post와 background 밀도는 변경하지 않았다.
- SH-2에서 초기 throttle hold burst는 `0`, 207km/h 페달 재입력 peak는 `0.1851`로 측정됐다.
- SH-4 shader는 steady `0.1`, 모든 event overlap `0.38`을 상한으로 하며 210~225km/h steady 값이 증가하지 않는다.
- SH-4 실제 WebGL 185/225km/h FOV 최대는 `72.913° / 74.217°`로 측정됐다.
- SH-7 직선은 TSE 수정 후 1x runtime에서 `225km/h`, 6단에 도달한다.
- RAIL-1 재측정에서 grip/drift의 물리 rail ratio는 최대 `0.6263 / 0.3528`이며 rail impact는 모두 `0회`다.
- 최종 drift run은 setup/drift/recovery/grip, counter timer `0.749초`, exit burst `0.0354`를 기록했다.
- understeer lateral motion은 raw px/s가 아니라 현재 사용 가능한 road width 비율로 계산한다.
- HND-2에서 감속과 understeer가 단일 `CornerDemandSample.targetSpeed/overspeedRatio`를 사용하게 됐다.
- `qa:corner-demand-sweep`은 synthetic 72개, recovery 16개, 실제 Bugak 구간 9개를 자동 측정한다.
- HND-3에서 matched straight control 24개와 `within / overspeed / severe` speed-loss zone을 추가했다.
- 현재 물리 중심 한계 기준 HND-4 level 225 outward/road는 easy/medium/sharp 각각 `0.207 / 0.353 / 0.454`다.
- HND-4 understeer max는 같은 조건에서 `0.265 / 0.579 / 1.000`으로 단계적으로 증가한다.
- downhill 225 outward/road는 grade 상한에 의해 `0.223 / 0.389 / 0.547` 안에서 멈춘다.
- 실제 Bugak sharp segment 64는 `maxRoadOffset ≈ 810.1`, outward/road가 약 `0.481`까지 읽힌다.
- 400ms lift 회복량은 `0.626~0.914`, brake 회복량은 `0.977~1.000`이며 강제 guardrail 충돌은 `0`이다.
- HND-5 body yaw authority는 easy/medium/sharp `0.953 / 0.689 / 0.460`, frame pose authority는 `0.973 / 0.820 / 0.687`이다.
- tire-scrub cue는 같은 순서로 `0.086 / 0.631 / 1.000`이며 grip understeer에서만 짧게 보인다.
- HND-6 준비 제동의 평균 understeer relief는 level/downhill 6개 조건에서 `0.028~0.289`, line retention gain은 `0.009~0.238`이다.
- HND-6 level/downhill corner-only loss는 모두 `sharp > medium > easy`, downhill sharp는 level sharp보다 `13.719%p` 크다.
- HND-3 straight control 24개와의 exit speed 오차, HND-1과의 0-100 오차, grip accidental drift ratio는 모두 `0`이다.
- 단일 target의 speed ratio, `v²` demand, understeer 연결 invariant 오차는 모두 `0`이다.

세부 설계와 단계는 [225km/h 속도감·핸들링 후속 계획](./apex-seoul-speed-sense-handling-revision-plan.md)을 따른다.

SH-7 blocker의 진단 근거와 실행 단위는 [최고속 평형·Visual Rail Boundary 진단 및 개선 계획](./apex-seoul-top-speed-equilibrium-diagnosis-plan.md)을 단일 기준으로 사용한다.

코너 통과 속도감의 진단, 목표 cadence와 코스 연장 조건은 [코너 통과 속도감 개선 계획](./apex-seoul-corner-speed-sense-improvement-plan.md)을 단일 기준으로 사용한다.

## P0 — 코너 통과 속도감 CSS-1~CSS-5

- 현재 15~27 segment인 강한 commitment run을 시간 단위로 다시 측정한다. 가장 긴 27 segment는 130km/h에서 약 14.8초, 150km/h에서도 약 12.8초다.
- CSS-1에서 entry/apex/exit duration, 코너 near marker pass rate와 screen velocity를 고정한다.
- CSS-2에서 첫 27-segment 코너만 `10~14 segment` prototype으로 압축해 동일 replay A/B를 만든다.
- CSS-3에서 코너 lane dash와 바깥쪽 reflector를 fractional Z로 보강해 130~185km/h에서 `4~6 pass/s`를 목표로 한다.
- prototype 승인 후 CSS-4에서 전체 commitment를 `8~14 segment` 중심으로 재편한다.
- 코스가 짧아질 경우 느린 코너를 늘리는 대신 fast recovery/easy sweep을 추가한다. 전체 후보는 `340~380 segment`다.
- 표시 km/h, `camera.z` 물리 진행량, 구동계, handling과 corner demand는 변경하지 않는다.
- 카메라와 shader 추가 조정은 코스 시간 구조와 near-field flow를 검증한 뒤 CSS-5에서만 검토한다.

## P1 — 최고속 평형 TSE-1~TSE-6

- TSE-6 완료: `qa:top-speed-regression`으로 역사 기준, production calibration, runtime 1×, corner demand, handling relation과 presentation을 한 번에 재검증한다.
- 변경 전 level `126.759km/h`·SH-7 `140.7km/h`와 변경 후 level `223.953km/h`·SH-7 `225km/h`를 같은 보고서에 고정했다.
- 225km/h corner-loss는 calibrated straight control 기준으로 재정의했고 handling relational QA를 다시 통과했다.
- TSE-5 완료: `qaTimeScale=1` SH-7 직선 runtime에서 39.383초에 225km/h·6단에 도달했다. steer/corner loss/rail impact/fuel cut은 모두 0이다.
- FOV 최대 `74.2157°`, shader `0.1056`, theoretical cadence `3.1667 segment/s`를 함께 기록했다. SH-7 225km/h는 양의 경사 가속이 남은 safety cap으로 level 평형과 구분한다.
- TSE-4 완료: production `aeroDrag = 0.000007661283`, `launchThrottleFullSpeedRatio = 1.0`을 적용했다.
- 0-60 `4.05초`, 0-100 `8.10초`, 60/100km/h `2/3단`을 유지했다. level은 6단 `223.953km/h`에서 clamp 없이 평형을 이룬다.
- uphill 300초 `168.711km/h < level 223.953km/h < SH-7 downhill 225km/h` 관계를 확인했다. 내리막 225는 양의 경사 가속이 남은 safety cap이며 level force equilibrium과 구분한다.
- TSE-3 완료: production을 변경하지 않고 223/224/225km/h force root와 전역 engine 대안을 비교했다.
- TSE-4 입력은 `aeroDrag = 0.000007661283`, level 목표 `224km/h`다. 223에서 양의 힘, 225에서 음의 힘을 남겨 clamp 없이 `223.913km/h`에 수렴한다.
- 전역 engine force `4.542배`는 0-100 `1.317초`, 6단 전용 boost는 production이 4단에서 멈춰 각각 폐기했다.
- 선택 aero만 적용한 0-100 `7.083초` 영향은 launch ramp 최소 보정으로 `8.10초`까지 복구했다.
- TSE-2 완료: physical profile의 초기 기어/upshift/downshift가 실제 기어 RPM 하나를 사용한다.
- physical upshift는 `speedRatioMax`를 사용하지 않고 7,400rpm에서 작동하며, downshift는 한 단 내린 뒤 5,400rpm이 되도록 실제 기어비에서 파생한다.
- 80/120/150/180km/h 초기 기어는 실제 가속 주행과 같은 `2/3/4/5단`으로 정렬됐다.
- TSE-1 terminal 결과와 최대 차이 `0km/h`, 0-100 `8.117초`, HND 관계형 QA를 유지했다.
- RAIL-1에서 visual rail collision boundary를 단일 물리 좌표계로 재정의했다.
- TSE-1 완료: level terminal `126.759km/h`, SH-7 slope terminal `140.835km/h`를 production controller로 자동 재현했다.
- 힘 합계와 실제 frame 가속도의 최대 오차는 `0`, hard clamp와 corner loss는 모두 `0`이다.
- uphill은 3단 `128.399km/h`, level은 4단 `126.759km/h`라 경사와 최고속 관계가 역전된다. 변속 후 downshift hysteresis도 TSE-2 범위에 포함한다.
- SH-7 직선은 59.4초 full throttle에서도 `140.7km/h`, 4단 `6,176rpm`에 머물렀다.
- 현재 225km/h는 표시/clamp envelope이며 level 실제 구동력 평형이 아니다.
- 4단 speed envelope는 135km/h지만 물리 7,400rpm은 약 175.3km/h라 변속 기준이 일치하지 않는다.
- 6단 225km/h를 강제로 대입해도 drive force 약 `18.3`보다 rolling+aero resistance 약 `83.3`이 크다.
- `TSE-1 힘 측정 → TSE-2 변속 기준 단일화 → TSE-3 level force budget → TSE-4 calibration → TSE-5 runtime 재측정 → TSE-6 회귀/글감` 순서로 진행한다.
- 0-100 `7.8~8.3초`, 60km/h 2단, 100km/h 3단을 보존하며 전역 engine force 증폭과 hard speed pull은 사용하지 않는다.

## P2 — Visual rail collision boundary

- RAIL-1 완료: `rail line = paved half-width + 220u`, `center limit = rail line - vehicle half-width 240u` 한 식으로 단일화했다.
- 화면 road width, vehicle `displaySize`, anchor scale을 물리 lateral 단위로 역산하는 경로와 좌우별 inset을 제거했다.
- guardrail renderer도 각 segment의 같은 rail line을 사용하고, collision 폭은 player contact distance에서 샘플한다.
- `qa:guardrail-collision`, `qa:corner-demand-sweep`, build가 통과했고 SH-7 grip/drift impact는 `0 / 0회`다.
- RAIL-2 완료: 차량 screen Y의 실제 road span으로 물리 offset을 투영하고 atlas shadow chassis를 presentation contact 폭으로 사용한다.
- 좌우 `±940u` runtime 고정 캡처에서 rail X와 vehicle contact edge X가 동일하며 active gap은 모두 `0px`다.
- 일반 grip/drift 전 sample에서 물리 contact ratio와 화면 normalized ratio 오차는 `0`, screen gap은 음수가 되지 않았다.
- `qa:guardrail-projection`, `qa:guardrail-projection-runtime`, SH-7 projection gate로 회귀를 고정했다.

## P3 — HND-6 실주행 최종 승인 보류

- prepared/full-throttle, easy/medium/sharp, level/downhill 자동 관계형 QA는 통과했다.
- `level/left`, `downhill/right`, `sharp S-bend` 실주행과 캡처는 사용자 체감 검토가 끝날 때 진행한다.
- 자동 QA 통과만으로 handling 최종 승인이나 속도감 작업 재개를 확정하지 않는다.

## P4 — SH-7 통합 승인 재개

- 자동 승인 완료: straight acceleration, grip corner, drift mixed 최신 runtime log의 모든 blocking gate가 통과했다.
- 최고속 `225km/h`, grip/drift impact `0회`, counter timer `0.749초`, exit burst `0.0354`를 확인했다.
- recovery→grip 직후 `0.28초`의 재가속 허용 창을 추가해 브라우저 프레임 경계에서도 drift-exit cue를 잃지 않는다.
- shader 최대는 straight/grip/drift `0.1056 / 0.1089 / 0.1339`로 `0.38` envelope 안에 있다.
- 자동 READY는 사용자 실주행 최종 승인을 대신하지 않는다.

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
npm run qa:top-speed-equilibrium --workspace @games/apex-seoul
npm run qa:top-speed-force-budget --workspace @games/apex-seoul
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:understeer-visual --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:low-speed-steering --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run qa:guardrail-projection --workspace @games/apex-seoul
npm run qa:guardrail-projection-runtime --workspace @games/apex-seoul
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
