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
| 핵심 오브젝트 좌표         | 완료 | `key_unit_placement_reference.tsv` 기준 거미/늑대의 돌/고대 늑대의 돌/중앙 마켓/행상인/이벤트 NPC를 Phaser object layer에 반영 |
| Tilemap trim               | 완료 | trim 전 백업 `chicken_farm_poc_01.backup_before_trim_352x336.json` 보관. 현재 맵은 상단 7, 왼쪽 2, 오른쪽 35 tile trim |
| 초반 거미/방어 타이밍      | 완료 | `player_spider_defense_timing_budget.tsv`와 `early_defense_build_requirements.tsv`로 거미 왕복 후 첫 늑대 준비 시간 산정 |

## P1. 구현 전 추가 분석

| 우선순위 | 항목                           | 산출물                               | 이유                                                                                     |
| -------: | ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
|        1 | WPM terrain blocker 이식       | `wpm_pathing_grid.json`, runtime grid | 원본 지형 blocker와 동적 방벽/건물 blocker를 분리해 늑대 우회/공격 전환을 검증           |
|        2 | Phaser 아이템/보상 데이터 축약 | `itemTemplates`, `rewardTables` 후보 | 구매/드랍/레벨/이벤트 보상을 런타임에서 같은 방식으로 지급                               |
|        3 | WolfAI 상태 머신 고도화        | `WolfAI` runtime                     | 현재 전투 PoC의 A\* path를 전체 Tilemap grid, repath, blocker acquire 상태 머신으로 승격 |

## P2. 구현 중 병행 검증

| 항목                           | 검증 방법                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------- |
| 거미 8개와 늑대 스폰 13개 구분 | 완료. `phaser_object_position_crosscheck.tsv`로 원본 좌표 교차검증               |
| 중앙 상점/행상인/거북이 후보   | 완료. `n006`, `h01R`, `n01J` 실제 좌표를 object layer에 반영. reward hook은 후속 구현 |
| 낮/밤                          | 시각/FoW 레이어로 먼저 구현, 늑대 스탯 보정은 기본 비활성                       |
| 가족 테크                      | `marriage -> spouse -> support skill` 최소 축만 먼저 구현                       |
| 8인 성능                       | 로컬 8슬롯 시뮬레이션으로 entity count와 pathing 비용 확인                      |

## P2.1 초반 거미 사냥과 첫 방어 시간 예산

초반 감각은 "농부+개로 빠르게 거미를 잡고, 자기 구석으로 돌아와 타운홀/우물/닭/양계장/타워/방벽을 갖춰 첫 늑대를 막는 흐름"을 기준으로 검증한다.

산출물:

- `player_to_spider_distance.tsv`: 각 P1-P8 시작점에서 가장 가까운 거미까지의 직선 거리.
- `player_to_unique_spider_assignment.tsv`: 8명이 서로 다른 거미를 먹는 전제에서 총 이동거리 최소 배정.
- `player_spider_defense_timing_budget.tsv`: 거미 왕복 후 `80초 경고`, 현재 MVP `70초 첫 웨이브`, 원본 정적 분석상 `120초 첫 주요 보충 단계`까지 남는 준비 시간.
- `player_unique_spider_defense_timing_budget.tsv`: 겹치지 않는 거미 배정 기준의 방어 준비 시간.
- `scout_tower_spider_clear_time.tsv`: 언리미티드 기준으로 거미 사거리 밖에 스카우트 타워를 지어 거미를 처치하는 시간.
- `early_defense_build_requirements.tsv`: 타운홀, 우물, 닭장/양계장, 스카우트 타워 2개, 울타리, 시작 닭/불터/시장 키트 후보.
- `initial_farmer_inventory_reference.tsv`: 시작 농부에게 지급되는 닭 분양서/불터/시장건설/질병 치료제 후보.
- `early_defense_tech_path_reference.tsv`: 스카우트 타워 추가 건설과 기본/상위 방벽, 우물, 닭장까지의 초반 테크 요구조건.
- `early_opening_build_order_timing.tsv`: `농부 시작 -> 스카우트 타워 -> 거미 처치 -> 불터/닭/시장 키트 -> 기본 울타리 -> 추가 스카우트 타워` 순차 빌드오더 완료 시간.

현재 결론:

- P1-P8 시작점과 거미 좌표는 W3X 대응 좌표 기준으로 계산한다.
- 단순 최단 거미 기준으로는 P2/P6, P3/P7, P4/P8이 같은 거미를 선호한다. 실제 플레이에서도 이 경우 빠른 재시작, 양보, 혹은 먼 거미 횡단이 발생할 수 있다.
- 8명이 서로 다른 거미를 먹는 최적 배정에서는 P3 -> `spider_06`, P6 -> `spider_07`, P8 -> `spider_05`가 되며, 이 셋은 최단 거미 대비 이동 부담이 크게 늘어난다.
- 거미 처치 시간은 단순 편도/왕복보다 "거미 사거리 밖 타워 건설 후 처치" 기준으로 봐야 한다. 언리미티드 기준에서는 농부+개 직접 교전보다 스카우트 타워 `h00D`를 거미 사거리 밖에 짓는 방식이 원본 플레이 감각에 가깝다.
- `h00D` 스카우트 타워는 사거리 650, 평균 피해 23, 쿨다운 1.05초다. `n01D` 거미는 HP 620, 방어 2, 사거리 350이다. 방어 감소를 적용하면 평균 31회 공격, 약 31.5초에 처치한다.
- 현재 추출 테이블에는 `h00D` 실제 건설시간 필드가 없으므로, 우선 휴먼 워치타워 계열 기본값으로 보이는 30초를 tentative로 둔다. 이 값은 MPQ/SLK 또는 Warsmash 관찰로 재검증해야 한다.
- 거미 사거리 350 밖에 1 pathing cell 여유를 둔 382 거리에서 타워를 짓는다고 가정하면, 겹치지 않는 배정 기준 총 처리 시간은 `P1` 69.8초, `P2` 68.6초, `P3` 74.5초, `P4` 65.0초, `P5` 69.3초, `P6` 75.1초, `P7` 71.1초, `P8` 78.2초다.
- 따라서 현재 MVP의 70초 첫 웨이브는 언리미티드식 거미 선처리 감각과 충돌한다. `80초 경고 -> 120초 본격 압박` 구조가 더 안전하다.
- 원본 JASS 안내는 "80초 후 부터 늑대들이 출몰"이고, 정적 타이머상 첫 주요 보충/명령 단계는 120초다. 따라서 원본 감각 재현에서는 70초 고정보다 `80초 경고 -> 120초 본격 압박` 구조가 안전하다.
- 현재 `balance.ts`의 건물 `buildTimeSec`는 대부분 0인 placeholder다. 실제 건설 시간은 외부 MPQ/SLK 또는 Warsmash 관찰로 보강해야 한다.
- 초반 테크 기준으로 `H000` 농부는 `h00D` 스카우트 타워와 `h003` 울타리를 바로 건설할 수 있다. 따라서 거미 처리용 스카우트 타워 1개와 첫 방어용 추가 스카우트 타워/기본 방벽은 별도 테크 없이 가능하다.
- 우물 `h00M`은 농가 `h001`, 닭장 `h00N`과 돌 벽 `h00K`는 마을회관 `h00H`가 필요하다. `h00H` 요구조건에 `H002` 아내가 추출되어 있어 결혼/아내 테크가 초반 마을회관 진입 조건인지 추가 검증해야 한다.
- 위 순차 빌드오더 기준으로 두 번째 스카우트 타워 완성 시점은 P4 약 97초, P1/P2/P5/P7 약 101~103초, P3/P6 약 106~107초, P8 약 110초다.
- 따라서 `70초 첫 웨이브`는 이 원본형 초반 운영과 충돌한다. `80초`는 경고/첫 출몰 체감으로 두고, 실제 방어선 검증은 `120초 첫 주요 보충/압박` 기준으로 맞추는 편이 원본 경험에 가깝다.

## P3. 후순위 검증

| 항목                       | 이유                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| 실제 플레이 관찰           | 보스 순서와 체감 스탯 검증에는 좋지만 현재 구현 착수의 선행 조건은 아님 |
| wc3libs 교차 검증          | 현재 Python 파서 결과가 충분히 유효하므로, 불일치가 생길 때 보강        |
| 원본 모델/아이콘 세부 연결 | 직접 사용하지 않고 신규 에셋 제작 참고로만 사용                         |
| 전체 가족 테크 분기        | MVP 데이터에는 자리를 두되, 플레이 루프 안정 후 확장                    |
