# Chicken Farm Next Priority Plan

이 문서는 W3X 분석에서 Phaser 구현으로 넘어가기 전, 남은 작업의 우선순위를 정리한다.

원칙:

- PoC는 구현 리스크를 쪼개기 위한 단계이며, MVP의 원본 경험 범위를 줄이는 기준이 아니다.
- 원본 논리 시간, 8인 슬롯, 농부+개 시작, 거미/늑대의 돌/늑대 웨이브, 가족/상점/건물 테크는 데이터 모델에 유지한다.
- 빠른 검증은 룰 축소가 아니라 `timeScale`과 debug preset으로 처리한다.

## P0. 즉시 구현 데이터로 고정

| 항목                       | 상태 | 다음 액션                                                                                                               |
| -------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| 시작 유닛                  | 완료 | `H000` 농부 + `n002` 개를 `createInitialState` 기본값으로 반영                                                          |
| 시작 위치                  | 완료 | 8인 슬롯 기준 Tilemap object layer와 runtime spawn point를 연결                                                         |
| 첫 웨이브/장기 타임라인    | 완료 | `wolf_wave_phase_reference.tsv`를 Phaser wave scheduler 데이터로 변환                                                   |
| 일반 늑대 18티어           | 완료 | `combat_unit_stats_reference.tsv`에서 enemy template 생성                                                               |
| 보스/소환 능력             | 완료 | `wolf_ability_reference.tsv`에서 boss ability stub 생성                                                                 |
| 펜스/타워 라인             | 완료 | `fence_candidate_rawcodes.tsv` high confidence 라인을 building template로 축약                                          |
| 배럭/연구소 테크           | 완료 | `building_tech_reference.tsv`와 `research_upgrade_provider_reference.tsv`를 Phaser build/research graph 입력값으로 사용 |
| 아이템 획득 경로           | 완료 | `item_catalog_reference.tsv`와 `item_acquisition_reference.tsv`를 Phaser item/reward data 입력값으로 사용               |
| Warsmash pathing/공격 전환 | 완료 | `balance.ts`의 `pathing`, enemy range/acquire/leash/windup 값으로 반영                                                  |
| MVP 건물 템플릿            | 완료 | high confidence 펜스/벽/타워/코어/시장/용병소/연구소를 `balance.ts`의 `buildingTemplates`로 축약                        |
| 늑대 AI 목표 갱신 규칙     | 완료 | `jass_wolf_order_flows.tsv` 결론을 `pathing.wolfAi.jassOrderModel`과 `wolfAi.ts` helper로 반영                          |
| 전투 PoC                   | 진행 | Tilemap 화면 위에서 두 공격 타워, 울타리 우회, 타워 피격 어그로 전환, blocker fallback, grid 가시성을 확인              |
| 원본 pathing 크기 검증     | 완료 | `.wpm` 352x336 cell 기준으로 `chicken_farm_poc_01.json`을 원본 크기 Tilemap으로 확장                                  |

## P1. 구현 전 추가 분석

| 우선순위 | 항목                           | 산출물                               | 이유                                                                                     |
| -------: | ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
|        1 | WPM terrain blocker 이식       | `wpm_pathing_grid.json`, runtime grid | 원본 지형 blocker와 동적 방벽/건물 blocker를 분리해 늑대 우회/공격 전환을 검증           |
|        2 | Phaser 아이템/보상 데이터 축약 | `itemTemplates`, `rewardTables` 후보 | 구매/드랍/레벨/이벤트 보상을 런타임에서 같은 방식으로 지급                               |
|        3 | WolfAI 상태 머신 고도화        | `WolfAI` runtime                     | 현재 전투 PoC의 A\* path를 전체 Tilemap grid, repath, blocker acquire 상태 머신으로 승격 |

## P2. 구현 중 병행 검증

| 항목                           | 검증 방법                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------- |
| 거미 8개와 늑대 스폰 13개 구분 | Tilemap object layer에서 `spider_spawn`, `wolf_spawn_rect`, `wolf_stone`을 분리 |
| 중앙 상점/행상인/거북이 후보   | 중앙 허브 object layer에 placeholder를 두고 reward hook만 연결                  |
| 낮/밤                          | 시각/FoW 레이어로 먼저 구현, 늑대 스탯 보정은 기본 비활성                       |
| 가족 테크                      | `marriage -> spouse -> support skill` 최소 축만 먼저 구현                       |
| 8인 성능                       | 로컬 8슬롯 시뮬레이션으로 entity count와 pathing 비용 확인                      |

## P3. 후순위 검증

| 항목                       | 이유                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| 실제 플레이 관찰           | 보스 순서와 체감 스탯 검증에는 좋지만 현재 구현 착수의 선행 조건은 아님 |
| wc3libs 교차 검증          | 현재 Python 파서 결과가 충분히 유효하므로, 불일치가 생길 때 보강        |
| 원본 모델/아이콘 세부 연결 | 직접 사용하지 않고 신규 에셋 제작 참고로만 사용                         |
| 전체 가족 테크 분기        | MVP 데이터에는 자리를 두되, 플레이 루프 안정 후 확장                    |
