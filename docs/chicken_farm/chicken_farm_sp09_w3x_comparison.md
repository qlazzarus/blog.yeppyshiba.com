# SP-09 성장 경로 W3X 비교·coverage 인계

갱신: 2026-10-16. 이 문서는 SP-09의 웹 구현 범위와 W3X에서 읽은 원본 근거를 분리한다. 수치가 원본에서 추출되지 않은 경우 웹 baseline을 원본 복원값으로 주장하지 않는다.

| 영역 | 웹 구현·검증 증거 | W3X 대조 및 상태 | 후속 |
| --- | --- | --- | --- |
| 건물 획득·upgrade graph | [progression artifact](./chicken_farm_w3x_artifacts/growth_check_progression.json)는 35 template, 누락 upgrade target 0, cycle 0, normal `farm_house`/`market`에서 34개 도달을 기록한다. | `building_tech_reference.tsv`의 rawcode/requirement를 source trace로 보존했다. `campfire`는 시작 배치 전용이라 graph 밖이다. | SP-12가 가족·용병 등 아직 범위 밖 콘텐츠를 연결한다. |
| 공급 | 농가/마을회관/가족 사원 `3/5/7`, complete/remove/death owner 격리는 [supply lifecycle](./chicken_farm_w3x_artifacts/growth_check_supply_lifecycle.json)으로 검증했다. | W3X food 변환비는 확인되지 않아 웹 공급 정책이다. | SP-15에서 정상 한 판 경제와 함께 조정한다. |
| 생산·부화 | dog 비용·공급 예약·직렬 queue·cancel/exit/restart는 [production queue](./chicken_farm_w3x_artifacts/growth_check_production_queue.json), [hatch reservation](./chicken_farm_w3x_artifacts/growth_check_hatch_reservation.json)으로 검증했다. | dog rawcode requirement는 source trace이며 비용/시간은 명시적 웹 baseline이다. | SP-12가 추가 생산 콘텐츠를 다룬다. |
| 연구·실제 효과 | masonry, tower, dog 연구 및 support aura는 [research queue](./chicken_farm_w3x_artifacts/growth_check_research_queue.json), [defense research](./chicken_farm_w3x_artifacts/growth_check_defense_research.json), [unit support](./chicken_farm_w3x_artifacts/growth_check_unit_support_effects.json)으로 검증했다. | provider rawcode와 식별자는 원본 trace다. 비용·시간·효과 수치는 W3X 미확인 범위에서 웹 baseline이다. | SP-15가 수치 밸런스를 검토한다. |
| 건설·upgrade·gate·명령 | prerequisite 재검사, paid upgrade/cancel/destroy, gate open/close, command card, same-page restart는 각 [construction prerequisite](./chicken_farm_w3x_artifacts/construction_check_growth_prerequisite.json), [building upgrade](./chicken_farm_w3x_artifacts/growth_check_building_upgrades.json), [gate](./chicken_farm_w3x_artifacts/growth_check_gate.json), [restart](./chicken_farm_w3x_artifacts/growth_check_restart.json) artifact로 검증했다. | `h006/h00G` 대문 전이와 원본 build time/refund의 실행 관찰은 미확인이다. | Warsmash 관찰 계획 및 SP-15 수치 조정으로 인계한다. |
| fixture 없는 normal 통합 | [normal integration](./chicken_farm_w3x_artifacts/growth_check_normal_integration.json)는 normal P3에서 실제 입력으로 farm→lumber mill→tower, dog cancel, farm upgrade, masonry를 완료하고 browser 오류 0을 기록한다. | 원본 normal 시작 resource와 placement는 기존 SP-01/02 계약을 따른다. 전체 tier를 원본 수치와 동등하다고 주장하지 않는다. | SP-10부터 다음 단일 task를 진행한다. |

## SP-09 완료 회귀 상태

- 2026-10-16에 progression, supply lifecycle, production queue, building upgrade, research queue, defense research, unit support, economy upgrades, hatch reservation의 TypeScript 회귀를 다시 실행했고 모두 종료 코드 0이었다. [command-card browser artifact](./chicken_farm_w3x_artifacts/growth_check_command_card.json)도 fixture prerequisite의 중심 선택으로 재실행해 build/growth hotkey, lumber-mill placement 시작, upgrade cancel, world-input 누출 없음과 browser 오류 0을 확인했다.
- 2026-10-16 재실행에서 [economy all](./chicken_farm_w3x_artifacts/economy_check_all.json)과 [combat all](./chicken_farm_w3x_artifacts/combat_check_all.json)이 pass했다. economy 전체 루프는 normal P3의 실제 farm → town hall → egg storage → coop upgrade와 알 예치/부화/판매를 포함하며 browser 오류가 없다.
- [construction completion](./chicken_farm_w3x_artifacts/construction_check_completion.json)·[removal](./chicken_farm_w3x_artifacts/construction_check_removal.json)·[restart](./chicken_farm_w3x_artifacts/construction_check_restart.json), [wave normal integration](./chicken_farm_w3x_artifacts/wave_check_normal_integration.json), [wave runtime phases](./chicken_farm_w3x_artifacts/wave_check_runtime_phases.json)도 모두 pass와 browser 오류 0을 기록했다. `typecheck`, production `build`, `git diff --check`은 종료 코드 0이다.

따라서 SP-09는 완료한다. 다음 구현 task는 원본/웹 baseline 차이를 유지한 **SP-10 적 단계·보스·보상 연결**이다.
