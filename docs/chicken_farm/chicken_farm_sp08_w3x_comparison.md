# SP-08 늑대 wave — W3X 기준 비교

> 갱신: 2026-10-13. SP-08은 일반 늑대 wave의 좌표·시간 경계·tier·생성/보충·명령 lifecycle을 웹 runtime에 연결했다. 원본 수치가 없는 항목과 웹 플레이성 결정은 분리한다.

## 보존한 원본 근거와 웹 변환

| 영역 | W3X 근거 | 웹 SP-08 결과 |
| --- | --- | --- |
| phase 시간 | `wolf_wave_phase_reference.tsv`의 120~3000초 10개 milestone, 35/22초 간격 | 동일 milestone과 interval을 scheduler/순수 검사에 보존했다. |
| 일반 tier | 18 일반 rawcode와 phase별 active tier | `WAVE_ORDINARY_ENEMY_TIERS`의 rawcode/EnemyId와 owner 10, run/tier/sequence ID를 runtime에 연결했다. |
| spawn | 13개 JASS rect | WPM/world 좌표 변환, terrain·dynamic blocker 후보 검사, 실패 시 다음 0.2초 due 재시도를 적용했다. |
| 명령 | spawn-entry `attack`, 60초 global refresh | spawn-entry/local farm attack-move와 global refresh를 이유별로 분리했고, stuck/reached 재경로와 섞이지 않게 했다. |
| 농장 교전 | JASS는 일반 우선순위를 명시하지 않음 | 웹의 target acquire·fence 파괴·repath 정책을 사용했다. 이는 웹 정책이다. |

## 명시적 웹 결정과 미확인 범위

원본 추출에는 120초 initial live count와 35/22초마다의 quantity increase가 없다. normal play는 빈 wave가 되지 않도록 active ordinary tier마다 1기의 `WEB_WAVE_BASELINE_TARGET_QUANTITY`를 사용한다. 이 baseline은 W3X 수치 복원이 아니며 periodic target 증가도 하지 않는다.

보스 rawcode/능력·소환, 처치 보상과 드롭은 SP-10으로, 농부 사망·패배·재시작 판정은 SP-11으로, hidden/pause 시간 정책은 SP-13으로, normal 한 판 수치·성능 균형은 SP-15/16으로 인계한다.

## 검증 근거

- [runtime phases](./chicken_farm_w3x_artifacts/wave_check_runtime_phases.json): test profile의 0.2초 step으로 10 phase와 18 tier를 확인했다. fixture target override와 직접 제거를 사용하므로 정상 속도 생존/밸런스 근거가 아니다.
- [normal integration](./chicken_farm_w3x_artifacts/wave_check_normal_integration.json): fixture·시간 jump·debug 자원 없이 normal P3에서 닭 분양과 `farm_house` 건설 후 seed 812로 120.10초 첫 wave 생성, 158.15초 농장 target 피해를 기록했다.
- [combat all](./chicken_farm_w3x_artifacts/combat_check_all.json)과 [economy all](./chicken_farm_w3x_artifacts/economy_check_all.json)은 모두 `pass: true`다.

SP-08-18에서 `typecheck`, production `build`, `chicken:waves:check`, combat/economy all, start regression, player pathing을 종료 코드 0으로 실행했다. `wave:check`, controls, construction runner에는 `all` selector가 없음을 source에서 확인했다. 개별 wave normal/phase artifact와 기존 controls/construction case artifact를 사용했으며, all selector 추가는 검증 harness 개선으로 남긴다.
