# Apex Seoul 내부 문서 안내

갱신일: 2026-07-23

이 문서는 Apex Seoul 비-archive 내부 문서의 진입점이다. 공개된 개발 기록은 `contents/phaser4-apex-seoul-*.md`에 있으며, 내부 문서에는 현재 구현 판단과 앞으로의 작업만 남긴다.

## 먼저 볼 문서

| 문서                                                         | 역할                                  |
| ------------------------------------------------------------ | ------------------------------------- |
| [구현 로드맵](./pseudo-3d-apex-seoul-roadmap.md)             | 게임 목표, 구현 기반, 장기 방향       |
| [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)     | 현재 작업 순서와 완료 조건            |
| [속도대별 핸들링](./apex-seoul-speed-band-handling-plan.md)  | 핸들링 구조, understeer, QA 단일 기준 |
| [Raven/FT86 파워밴드](./apex-seoul-raven-ft86-powerband-plan.md) | Raven Coupe의 FT86 기반 기어비·RPM·가속 개선 |
| [225km/h 속도감·핸들링](./apex-seoul-speed-sense-handling-revision-plan.md) | 속도 연출, 185~225km/h 조향, 통합 QA 후속 계획 |
| [코너 통과 속도감](./apex-seoul-corner-speed-sense-improvement-plan.md) | 코너 시간 길이, near-field flow, 코스 리듬·연장 계획 |
| [아웃런 참고 속도감 후속](./apex-seoul-outrun-speed-sense-reference-plan.md) | longitudinal unit-scale 비교, 도로 흐름, 카메라·고저차와 후순위 traffic/audio 계획 |
| [Visual Direction](./apex-seoul-visual-direction.md)         | black/blue 야간 화면과 원근 규칙      |
| [Render Layer Tracker](./apex-seoul-render-layer-tracker.md) | Phaser depth와 가림 관계              |
| [헤드라이트 설계](./apex-seoul-headlight-rendering-plan.md)  | 전방 light pool 구조와 시각 QA        |
| [리소스 관리](./apex-seoul-resource-management.md)           | asset 출처, 생성, 승인, 저장 정책     |
| [Retro Asset Studio](../retro-asset-studio/README.md)        | 차량 sprite 생성·후처리 운영 가이드   |

## 문서 운영 규칙

- 우선순위는 `apex-seoul-next-priority-plan.md` 한 곳에서만 관리한다.
- 핸들링 기본값과 QA 수치는 `apex-seoul-speed-band-handling-plan.md`에만 기록한다.
- palette와 장면 무드는 visual direction, 실제 depth는 render layer tracker가 소유한다.
- asset 실험 로그를 리소스 정책 문서에 누적하지 않는다. 반복 가능한 절차만 운영 가이드에 남긴다.
- 발행이 끝난 글감·초안은 내부 문서에서 제거하고 공개 글을 기록으로 사용한다.
- 완료 이력을 다음 우선순위 문서에 계속 쌓지 않는다.

## 공개 기록

발행된 Apex Seoul 글은 `contents/phaser4-apex-seoul-*.md` 패턴으로 관리한다. 공개 글은 당시의 구현 과정과 수치를 설명하는 기록이며, 현재 기본값을 판단할 때는 위 내부 문서를 우선한다.
