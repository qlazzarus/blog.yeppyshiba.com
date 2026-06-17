# Chicken Farm Docs

이 폴더는 Warcraft III 유즈맵 `닭농장1.3a.w3x`를 참고해 Phaser 기반 오리지널 웹 게임으로 재해석하기 위한 분석/기획 문서 모음이다.

원본 맵의 코드, 에셋, 모델, 아이콘, 사운드를 그대로 사용하는 목적이 아니다. 이곳의 문서는 플레이 루프, 수치, 타이밍, 이동/공격 감각을 이해하고 새 구현으로 변환하기 위한 참고 자료다.

## 읽는 순서

1. [W3X 추출 분석 노트](./chicken_farm_w3x_analysis.md)  
   원본 맵에서 추출 가능한 JASS, 오브젝트, 지형, pathing, doodad, rawcode, 웨이브/경제/점수 분석의 중심 문서.

2. [Warsmash 참조 계획](./chicken_farm_warsmash_reference_plan.md)  
   Warcraft III 엔진 감각을 Phaser에서 재현하기 위해 Warsmash를 어떤 방식으로 참고할지 정리한 계획.

3. [Warsmash 동작 관찰 노트](./chicken_farm_warsmash_behavior_notes.md)  
   Warsmash 임시 checkout에서 확인한 명령, 이동, attack-move, pathing, blocker 전환 동작 요약.

4. [Wave/Shop/Disease MVP Spec](./chicken_farm_wave_shop_disease_mvp_spec.md)  
   웨이브, 상점, 질병 흐름을 Phaser MVP 구현 단위로 좁힌 스펙.

5. [Phaser P2P Game Plan](./chicken_farm_phaser_p2p_game_plan.md)  
   전체 웹 게임 방향, P2P 방식, 플레이 루프, 구현 목표를 다루는 상위 기획서.

6. [Actual Play Observation Protocol](./chicken_farm_actual_play_observation_protocol.md)  
   실제 플레이 관찰이 가능해졌을 때 보스 순서, 체감 스탯, 웨이브 압박을 검증하기 위한 절차. 현재는 Warsmash behavior 관찰로 일부 대체한다.

## 핵심 분석 산출물

분석 스크립트는 파생 파일을 [chicken_farm_w3x_artifacts](./chicken_farm_w3x_artifacts/)에 생성한다.

주요 파일:

- [web_mvp_balance_reference.json](./chicken_farm_w3x_artifacts/web_mvp_balance_reference.json): 원본 참조값과 웹 MVP 변환값을 나란히 둔 밸런스 초안
- [unit_rawcode_crosscheck.tsv](./chicken_farm_w3x_artifacts/unit_rawcode_crosscheck.tsv): rawcode별 유닛/구조물 스탯 교차표
- [fence_candidate_rawcodes.tsv](./chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv): 펜스/벽/방어 건물 rawcode 후보
- [jass_wolf_order_flows.tsv](./chicken_farm_w3x_artifacts/jass_wolf_order_flows.tsv): 늑대 명령 함수의 좌표/대상 흐름 요약
- [jass_wolf_spawn_points.tsv](./chicken_farm_w3x_artifacts/jass_wolf_spawn_points.tsv): 늑대 외곽 스폰 rect 13개 좌표
- [jass_wolf_unit_tiers.tsv](./chicken_farm_w3x_artifacts/jass_wolf_unit_tiers.tsv): 일반 늑대 보충 배열 rawcode
- [jass_wolf_special_spawns.tsv](./chicken_farm_w3x_artifacts/jass_wolf_special_spawns.tsv): 난이도/보스 직접 생성 위치
- [jass_wolf_order_areas.tsv](./chicken_farm_w3x_artifacts/jass_wolf_order_areas.tsv): 늑대 공격/보스/난이도 rect 좌표
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
- 원본 참조 밸런스: [web_mvp_balance_reference.json](./chicken_farm_w3x_artifacts/web_mvp_balance_reference.json)

현재 중요한 구현 결론:

- 늑대는 고정 경로 적이 아니라 열린 지형에서 농장 가치 구역으로 들어오는 attack-move형 적으로 본다.
- JASS에는 구체적인 닭/건물/펜스 대상 우선순위가 직접 하드코딩되어 있지 않다.
- 펜스/벽은 최우선 타깃이 아니라, 이동을 막는 blocker 또는 가까운 fallback 타깃으로 구현한다.
- 원본 근접 테스트에서는 8인 접속과 원본 장기 타임라인을 기본으로 하고, 빠른 검증은 `timeScale`로 처리한다.
- 원본과 유사한 2D 맵, 시작 위치, 스폰, 거미/중립 배치를 관리하기 위해 Phaser Tilemap을 기본 후보로 둔다.
- 원본 에셋은 직접 사용하지 않고, 실루엣/색감/배치 감각만 새 에셋 제작 참고로 사용한다.
