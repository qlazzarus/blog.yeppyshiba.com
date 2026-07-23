# Apex Seoul 아웃런 스타일 속도감 개선 기록

갱신일: 2026-07-23

상태: ORS-1 unit/reference audit와 ORS-2A longitudinal A/B 완료. 사용자 리뷰로 U2 `longitudinalScale=2`를 production 기본값으로 승인했으며 속도감 개선 트랙은 종료한다. ORS-2B와 ORS-6을 포함한 잔여 항목은 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)로 이동했다.

이 문서는 더 이상 active 실행 계획이 아니다. 타 게임 비교 방법, U2 선택 근거와 회귀 기준을 보존한다.

## 해결한 문제

CSS-1~CSS-4 뒤에도 표시 km/h에 비해 도로와 roadside object가 느리게 흐르는 문제가 남아 있었다. marker 추가, 카메라 확대 또는 traffic으로 가리기 전에 표시 속도와 world progression의 환산을 분리해 검증했다.

```text
physicalSpeed
  → powertrain / HUD / handling

worldTravelSpeed = physicalSpeed × longitudinalUnitScale
  → canonical camera.z
  → track progress / corner / elevation
  → road object / crest / collision / telemetry
```

## ORS-1 — unit/reference audit — 완료

### 비교 원칙

- 타 게임 raw unit는 직접 비교하지 않는다.
- 공개 엔진은 `segment/s`, `road-width/s`, visible-depth time으로 정규화한다.
- 상용 게임은 화면의 primary `screenY 60→85%`, compatibility `60→95%` near-pass와 object scale doubling time을 측정한다.
- boost, drift와 traffic이 없는 flat straight/easy sweep를 우선한다.

### 결과

- 현재 문제의 1차 원인은 `longitudinal unit scale`이었다.
- content gap과 projection은 보조 원인이었다.
- 185km/h corner marker cadence는 이미 약 `5.21/s`라 marker density는 1차 원인이 아니었다.
- 타 게임의 `segment/s`를 목표값으로 직접 복사하지 않고 진단 방향으로만 사용했다.

상세 측정은 [ORS-1 Unit / Screen-flow Audit](../../games/apex-seoul/assets/telemetry/generated/outrun-unit-scale/outrun-unit-scale-ors1.md)에 고정한다.

## ORS-2A — longitudinal A/B — 완료

표시 km/h, powertrain, engine/gear, handling과 FOV를 고정하고 canonical world progression만 비교했다.

| 후보 | scale | 185km/h segment/s | 225km/h 60→85% | 185km/h 최소 commitment |
| --- | ---: | ---: | ---: | ---: |
| U0 | 1.00 | 2.604 | 2.061초 | 4.225초 |
| U1 | 1.50 | 3.906 | 1.374초 | 2.817초 |
| U2 production | 2.00 | 5.207 | 1.031초 | 2.112초 |
| U3 diagnostic | 3.00 | 7.811 | 0.687초 | 1.408초 |

### 선택

- 사용자 A/B 리뷰에서 U2 `2.00`이 더 나은 속도감으로 승인됐다.
- 파라미터 없는 일반 실행과 새 ORS 계측은 U2를 사용한다.
- U0/U1은 회귀 비교, U3는 진단 상한으로 유지한다.
- URL `?longitudinalScale=1|1.5|2|3`와 게임 내 `B` 전환은 유지한다.
- 과거 SH-7/TSE-5 named scenario는 입력 시각과 코스 위치를 재현하도록 U0를 고정한다.

상세 entry/apex/exit window와 검사 결과는 [ORS-2A Longitudinal A/B](../../games/apex-seoul/assets/telemetry/generated/outrun-longitudinal-ab/outrun-longitudinal-ab-ors2a.md)에 고정한다.

## production 회귀 기준

- `DEFAULT_LONGITUDINAL_UNIT_SCALE = 2`
- 185km/h worldTravelSpeed 약 `1,250u/s`, `5.207 segment/s`
- 225km/h worldTravelSpeed `1,520u/s`, `6.333 segment/s`
- display speed identity error `0km/h`
- 최고 후보 U3도 30Hz 한 step에서 `0.5 segment` 이하
- 모든 spatial consumer가 같은 canonical Z를 사용
- grip/drift/understeer, collision, 표시 km/h와 powertrain 상수 유지

재현 명령:

```bash
npm run qa:outrun-unit-scale --workspace @games/apex-seoul
npm run qa:outrun-longitudinal-ab --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

## 잔여 아이디어 이동

ORS 번호는 여기서 종료한다. 다음 항목은 독립 ORS 단계가 아니라 상위 제품 기능에 합친다.

| 기존 항목 | 새 위치 | 재개 방식 |
| --- | --- | --- |
| ORS-2B roadside hero pass | backlog D-01 | 새 코스 환경·랜드마크 제작에 병합 |
| ORS-4 crest/camera | backlog D-03 | elevation·camera polish에 병합 |
| ORS-6 sector transition/route fork | backlog D-02 | track/sector 구조 개편에 병합 |
| ORS-3 sparse traffic | backlog D-06/D-07 | traffic/opponent gameplay에 병합 |
| ORS-5 event audio | backlog D-09 | 통합 audio feedback pass에 병합 |

현재 속도감 개선을 위해 위 항목을 별도로 시작하지 않는다.

## 유지할 비목표

- marker 추가 증량
- 상시 camera shake, roll 또는 전체 구간 FOV 확대
- grip 코너의 drift smoke, 큰 slip angle 또는 drift sprite
- 빠르게 움직이는 원경 sky/city
- 장면 변화 없는 코스 연장
- traffic으로 기본 도로 흐름 문제를 가리는 구현
- traffic collision, slipstream과 경쟁 AI를 첫 traffic pass에 한꺼번에 추가

## 관련 문서

- [구현 로드맵](./pseudo-3d-apex-seoul-roadmap.md)
- [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)
- [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)
- [코너 통과 속도감 개선 기록](./apex-seoul-corner-speed-sense-improvement-plan.md)
