# Chicken Farm Docs

이 폴더는 Warcraft III 유즈맵 `닭농장1.3a.w3x`를 참고해 Phaser 기반 오리지널 웹 게임으로 재해석하기 위한 분석/기획 문서 모음이다.

원본 맵의 코드, 에셋, 모델, 아이콘, 사운드를 그대로 사용하는 목적이 아니다. 이곳의 문서는 플레이 루프, 수치, 타이밍, 이동/공격 감각을 이해하고 새 구현으로 변환하기 위한 참고 자료다.

현재 구현의 장기 목표는 개별 PoC를 나열하는 것이 아니라, Warsmash/Warcraft III식 선택, 명령 타일, Shift 예약, 건설, 공격/attack-move 감각을 Chicken Farm MVP의 공통 command model로 수렴시키는 것이다.

## 읽는 순서와 컨텍스트 예산

새 작업은 아래 순서로 시작한다. 큰 분석·P2P 문서는 필요한 질문이 생겼을 때만 연다.

1. [Current Context](./chicken_farm_current_context.md) — 현재 구현 경계와 바로 다음 작업을 3분 안에 파악하는 시작점.
2. [W3X·Warsmash·현재 구현 차이](./chicken_farm_gap_analysis.md) — 원본 사실, 엔진 감각, 의도적 MVP 변환, 미통합 항목을 구분한 기준 문서.
3. 작업 범위에 맞는 PoC 문서 하나 — 건설, command queue, telemetry, asset 등.
4. 수치/원본 근거가 필요할 때만 [W3X 추출 분석 노트](./chicken_farm_w3x_analysis.md)와 artifact를 연다.
5. behavior/pathing 감각이 필요할 때만 [Warsmash 동작 관찰 노트](./chicken_farm_warsmash_behavior_notes.md)를 연다.

### 문서 역할

| 층 | 문서 | 역할 |
| --- | --- | --- |
| 현재 판단 | [Current Context](./chicken_farm_current_context.md), [Gap Analysis](./chicken_farm_gap_analysis.md), [Runtime Audit](./chicken_farm_runtime_audit_2026-07-13.md) | 다음 구현의 출발점, 차이·실제 코드 감사·우선순위 |
| 원본 근거 | [W3X 추출 분석](./chicken_farm_w3x_analysis.md), `chicken_farm_w3x_artifacts/` | 정적 추출값·JASS·오브젝트·지형 관찰 |
| 엔진 참고 | [Warsmash 동작 노트](./chicken_farm_warsmash_behavior_notes.md), [참조 계획](./chicken_farm_warsmash_reference_plan.md) | Warcraft III식 order/pathing/attack 감각 |
| 구현별 계획 | [Next Priority](./chicken_farm_next_priority_plan.md), 건설/명령/telemetry/sprite 계획 | 세부 완료 기준과 이력. 현재 판단은 위 두 압축 문서가 우선 |
| 장기 설계 | [P2P Game Plan](./chicken_farm_phaser_p2p_game_plan.md), network/worker 계획 | 통합 MVP 이후의 네트워크·simulation 경계 |

### 범위별 PoC 문서

- [Construction Placement](./chicken_farm_construction_poc_plan.md), [Construction Visibility](./chicken_farm_construction_visibility_poc_plan.md)
- [Command Queue](./chicken_farm_command_queue_poc_plan.md)
- [Playtest Telemetry](./chicken_farm_playtest_telemetry_plan.md)
- [Wave/Shop MVP](./chicken_farm_wave_shop_disease_mvp_spec.md)
- [Actual Play Observation](./chicken_farm_actual_play_observation_protocol.md)
- [Sprite Asset Generation](./chicken_farm_sprite_asset_generation_plan.md)

Archive:

- [Archive README](./archive/README.md)  
  완료된 PoC 이력과 과거 검증 결과를 보관하는 폴더.
- [Completed PoC History](./archive/completed_poc_history.md)  
  Tilemap/WPM/path smoothing/WolfAI/Combat baseline/Command Control/Command Queue P0의 완료 결론.
- [Next Priority Plan Before Completed Section Trim](./archive/next_priority_plan_before_completed_section_trim_2026-07-01.md)  
  `Next Priority Plan`에서 완료 상세 섹션을 쳐내기 전의 보관 스냅샷.

## 핵심 분석 산출물

분석 스크립트는 파생 파일을 [chicken_farm_w3x_artifacts](./chicken_farm_w3x_artifacts/)에 생성한다.

주요 파일:

- [web_mvp_balance_reference.json](./chicken_farm_w3x_artifacts/web_mvp_balance_reference.json): 원본 참조값과 웹 MVP 변환값을 나란히 둔 밸런스 초안
- [unit_rawcode_crosscheck.tsv](./chicken_farm_w3x_artifacts/unit_rawcode_crosscheck.tsv): rawcode별 유닛/구조물 스탯 교차표
- [fence_candidate_rawcodes.tsv](./chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv): 펜스/벽/방어 건물 rawcode 후보
- [building_tech_reference.tsv](./chicken_farm_w3x_artifacts/building_tech_reference.tsv): 배럭/용병소/워크샵/블랙스미스/아케인 생텀 등 건물 테크 참조표
- [research_upgrade_provider_reference.tsv](./chicken_farm_w3x_artifacts/research_upgrade_provider_reference.tsv): 연구/업그레이드 rawcode의 제공 건물과 적용 대상 참조표
- [jass_wolf_order_flows.tsv](./chicken_farm_w3x_artifacts/jass_wolf_order_flows.tsv): 늑대 명령 함수의 좌표/대상 흐름 요약
- [jass_wolf_spawn_points.tsv](./chicken_farm_w3x_artifacts/jass_wolf_spawn_points.tsv): 늑대 외곽 스폰 rect 13개 좌표
- [jass_wolf_unit_tiers.tsv](./chicken_farm_w3x_artifacts/jass_wolf_unit_tiers.tsv): 일반 늑대 보충 배열 rawcode
- [wolf_wave_phase_reference.tsv](./chicken_farm_w3x_artifacts/wolf_wave_phase_reference.tsv): 늑대 단계별 보충 티어/목표 수 증가/보스 등장 참조표
- [combat_unit_stats_reference.tsv](./chicken_farm_w3x_artifacts/combat_unit_stats_reference.tsv): 농부/아내/개/일반 늑대/보스/소환체 전투 스탯 참조표
- [wolf_ability_reference.tsv](./chicken_farm_w3x_artifacts/wolf_ability_reference.tsv): 늑대/보스 능력 rawcode와 MVP 변환 후보
- [jass_wolf_special_spawns.tsv](./chicken_farm_w3x_artifacts/jass_wolf_special_spawns.tsv): 난이도/보스 직접 생성 위치
- [jass_wolf_order_areas.tsv](./chicken_farm_w3x_artifacts/jass_wolf_order_areas.tsv): 늑대 공격/보스/난이도 rect 좌표
- [jass_day_night_events.tsv](./chicken_farm_w3x_artifacts/jass_day_night_events.tsv): 낮/밤 time-of-day 등록과 연결 액션 요약
- [jass_night_wolf_stat_candidates.tsv](./chicken_farm_w3x_artifacts/jass_night_wolf_stat_candidates.tsv): 밤 시간대 늑대 스탯 변경 가능성 후보
- [central_shop_event_candidates.tsv](./chicken_farm_w3x_artifacts/central_shop_event_candidates.tsv): 중앙 상점/상인/거북이 이벤트 후보와 JASS 라인 근거
- [boss_and_level_reward_candidates.tsv](./chicken_farm_w3x_artifacts/boss_and_level_reward_candidates.tsv): 보스 점수/특수 드랍/농부 레벨 보상 후보
- [item_catalog_reference.tsv](./chicken_farm_w3x_artifacts/item_catalog_reference.tsv): 커스텀 아이템 rawcode, 비용, stock, 사용 효과 참조표
- [item_acquisition_reference.tsv](./chicken_farm_w3x_artifacts/item_acquisition_reference.tsv): 아이템 획득 경로를 구매/드랍/레벨 보상/이벤트 보상으로 분리한 구현 참조표
- [jass_function_labels.tsv](./chicken_farm_w3x_artifacts/jass_function_labels.tsv): JASS 함수군 라벨링
- [jass_labeled_call_edges.tsv](./chicken_farm_w3x_artifacts/jass_labeled_call_edges.tsv): 라벨링된 함수 호출 관계
- [doo_doodads.tsv](./chicken_farm_w3x_artifacts/doo_doodads.tsv): doodad/destructable 배치 전체 좌표
- [w3e_summary.json](./chicken_farm_w3x_artifacts/w3e_summary.json): 지형 타일 요약
- [wpm_summary.json](./chicken_farm_w3x_artifacts/wpm_summary.json): pathing map 요약
- [reference_asset_manifest.json](./chicken_farm_w3x_artifacts/reference_asset_manifest.json): 새 에셋 제작 참고용 추출 파일 목록

## 재생성

W3X 분석 산출물은 저장소 루트에서 다음 명령으로 다시 만들 수 있다.

```bash
python3 scripts/analyze_chicken_w3x.py
```

기본 입력 파일은 [닭농장1.3a.w3x](./닭농장1.3a.w3x)이고, 기본 출력 폴더는 [chicken_farm_w3x_artifacts](./chicken_farm_w3x_artifacts/)다.

## 구현 연결

Phaser 구현 데이터는 분석 산출물을 그대로 런타임에 읽기보다, 사람이 검토한 뒤 TypeScript 데이터로 축약한다. 내부 테스트 프로파일은 원본에 가까운 8인 슬롯, 장기 논리 타임라인, Phaser Tilemap 기반 맵, 테스트 배속 지원을 기준으로 둔다.

- 구현 밸런스 파일: [games/chicken-farm/src/game/balance.ts](../../games/chicken-farm/src/game/balance.ts)
- PoC 1 타일맵 에셋: [games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json](../../games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json)
- 플레이 테스트 Telemetry: [games/chicken-farm/src/game/systems/telemetryRecorder.ts](../../games/chicken-farm/src/game/systems/telemetryRecorder.ts)
- 원본 참조 밸런스: [web_mvp_balance_reference.json](./chicken_farm_w3x_artifacts/web_mvp_balance_reference.json)
- worker 경계 기준: [Worker Simulation Boundary Plan](./chicken_farm_worker_simulation_boundary_plan.md)

현재 중요한 구현 결론:

- Construction Placement PoC와 Construction Visibility P0는 1차 조작 루프 기준으로 통과 상태다. 세부 계획과 남은 polish 후보는 [Construction Placement PoC](./chicken_farm_construction_poc_plan.md)와 [Construction Visibility PoC](./chicken_farm_construction_visibility_poc_plan.md)에 둔다.
- 예약 명령은 [Command Queue PoC](./chicken_farm_command_queue_poc_plan.md) 기준으로 이동/행동 예약, `A Attack`/attack-move, 건설 예약까지 P0 구현을 진행했다. 건물 생산 큐는 후속 P1로 남긴다.
- 다음 얇은 검증은 War3 Command Combat Smoke다. `CombatPocSystem`은 feature flag로 잠깐 켜서 농부/개 `A + 적`, `A + 땅`, `Shift + A`가 실제 적 대상과 맞는지 확인한다.
- 그 다음 큰 구현 단위는 Economy / Build / Shop PoC다. 닭농장 핵심인 field egg item, 농부 수집, 판매, 부화, coop 구매/업그레이드를 command/system API 위에 붙인다.
- 워3식 명령 타일은 `B`로 build page에 진입하고, `A`로 attack targeting에 진입하며, 단축키 입력과 UI 클릭이 같은 command action을 호출하는 구조로 구현한다.
- 현재 스냅샷: construction on, combat 기본 off, player debug marker off, P3 farm zone 시작, 농부/개 실제 유닛 표시, 자원 HUD, 중앙 선택 정보 패널, 우상단 debug overlay toggle, 건물 시야 source, Shift 이동/공격/건설 예약이 연결되어 있다.
- 늑대는 고정 경로 적이 아니라 열린 지형에서 농장 가치 구역으로 들어오는 attack-move형 적으로 본다.
- 네트워크 플레이에서는 늑대 AI/공격 판정을 host-only로 계산하고, 참가자는 snapshot/event를 수신해 표시한다.
- 브라우저 hidden/suspend 상태에서는 전투 시간을 wall-clock으로 fast-forward하지 않고, host는 pause/resync, client는 최신 snapshot resync로 복귀한다.
- JASS에는 구체적인 닭/건물/펜스 대상 우선순위가 직접 하드코딩되어 있지 않다.
- 펜스/벽은 최우선 타깃이 아니라, 이동을 막는 blocker 또는 가까운 fallback 타깃으로 구현한다.
- 원본 근접 테스트에서는 8인 접속과 원본 장기 타임라인을 기본으로 하고, 빠른 검증은 `timeScale`로 처리한다.
- 원본과 유사한 2D 맵, 시작 위치, 스폰, 거미/중립 배치를 관리하기 위해 Phaser Tilemap을 기본 후보로 둔다.
- PoC/MVP 플레이 테스트는 `T` 키로 JSONL 로그를 압축 export하고, 초반 거미/빌드/첫 웨이브 타이밍 표와 비교한다.
- `H002` 아내와 아들/딸/개/와이번 계열이 확인되므로, 결혼/가족 테크는 MVP 데이터 모델에 포함한다.
- 늑대는 18개 일반 티어와 장기 보스 단계가 확인되므로, MVP에서도 큰 틀의 티어/보스/소환 능력 구조는 축소하지 않고 `timeScale`로 테스트한다.
- 원본 JASS에는 day/night 초기화와 time-of-day 트리거 등록 단서가 있지만, 정적 분석상 밤에 늑대 스탯을 직접 강화하는 증거는 아직 없다.
- 원본 에셋은 직접 사용하지 않고, 실루엣/색감/배치 감각만 새 에셋 제작 참고로 사용한다.
