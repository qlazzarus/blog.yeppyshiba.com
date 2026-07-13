# Chicken Farm Current Context

> 목적: 다음 작업자가 전체 문서를 다시 읽지 않고도 현재 구현 경계, 기준 문서, 우선순위를 파악하는 압축 컨텍스트다. 2026-07-13 기준.

## 1. 3분 컨텍스트

Chicken Farm은 `닭농장1.3a.w3x`의 에셋·코드 복제가 아니라, 원본의 **닭 경제 + 늑대 압박 + Warcraft III식 명령 감각**을 Phaser 웹 게임으로 새로 해석하는 프로젝트다.

- 원본 사실의 기준은 `chicken_farm_w3x_analysis.md`와 `chicken_farm_w3x_artifacts/`다.
- Warcraft III 엔진 동작의 기준은 `chicken_farm_warsmash_behavior_notes.md`다.
- 현재 구현과 두 기준의 차이는 `chicken_farm_gap_analysis.md`를 먼저 읽는다.
- 코드 기준의 실제 통합 상태와 검증 실패는 `chicken_farm_runtime_audit_2026-07-13.md`를 따른다.
- 현재 런타임은 단일 플레이어 PoC다. `combat`과 `combatSmoke` 기본값은 모두 꺼져 있다.
- 조작/건설/지형 pathing, 알·우물·닭장·부화의 순수 economy PoC는 존재한다. 그러나 이들은 아직 한 개의 경제 상태와 실제 늑대 웨이브로 완전히 통합되지 않았다.

## 2. 지금의 구현 경계

| 영역 | 상태 | 주 파일 | 다음에 필요한 일 |
| --- | --- | --- | --- |
| 선택·이동·공격·Shift 이동/건설 예약 | 최소 구현 | `controllableUnitSystem.ts`, `constructionPlacementSystem.ts` | attack-move 처치 후 목적지 복귀, 생산 queue |
| WPM 지형·동적 blocker·늑대 blocker fallback | 최소 구현, 전투 플래그 off | `terrainBlocker.ts`, `combatPocSystem.ts`, `wolfAiStateMachine.ts` | 실제 맵 웨이브와 fence/tower/coop 통합 |
| 건설 | PoC 통과 | `buildingSystem.ts`, `buildingTemplates.ts` | 경제 상태와 지갑·tech·생산 card 통합 |
| 알·우물·닭·부화 | 순수 simulation + 임시 presenter 통과 | `economyTypes.ts`, `economySystem.ts`, `main.ts` | 건설/상점/업그레이드/판매와 같은 player state로 통합 |
| 시야 | 단일 플레이어 기준 연결 | `visibilitySystem.ts`, `buildingSystem.ts` | player-slot별 시야와 네트워크 모델 |
| 웨이브·보스·P2P | 데이터/계획 위주 | `balance.ts`, P2P/네트워크 문서 | 원본 population 모델, deterministic command replay, host authority |

현재 economy presenter는 건설/전투 월드와 분리된 별도 PoC entity를 직접 만든다. 따라서 “경제 PoC 통과”는 건설한 닭장이 실제로 경제·전투에 연결됐다는 뜻이 아니다.

## 3. 다음 우선순위

1. **경제 상태 통합:** `BuildingSystem.economy`의 임시 gold/coins와 `ChickenFarmEconomyState.players[].coins`를 하나의 player economy로 합친다. 건설, 판매, 부화, 구매·업그레이드가 같은 wallet을 사용해야 한다.
2. **기준값 정규화:** coop 비용·rawcode trace·시작 자원을 하나의 canonical balance로 정하고, 템플릿/상점/측정값에 파생시킨다.
3. **실제 맵 늑대 웨이브:** combat을 다시 켜고 P3 farm zone에서 늑대의 spawn → attack-move → acquire → path-failure blocker attack을 검증한다.
4. **명령 완결성:** attack-move resume, 생산 queue, 완성 건물 command card와 rally UX를 추가한다.

## 4. 문서 사용 규칙

- 새 구현 전: 이 문서 → `chicken_farm_gap_analysis.md` → 해당 시스템의 짧은 PoC 계획만 읽는다.
- 구현 변경 전: 위 순서 뒤 [Runtime Audit](./chicken_farm_runtime_audit_2026-07-13.md)에서 P0 통합 경계를 확인한다.
- 원본 수치/근거가 필요할 때만 `chicken_farm_w3x_analysis.md`와 artifact TSV/JSON을 연다.
- 엔진 감각이 필요할 때만 Warsmash 동작 노트를 연다. Warsmash는 구현 사양이 아니라 behavior 참고 기준이다.
- `chicken_farm_next_priority_plan.md`의 세부 체크리스트와 `chicken_farm_phaser_p2p_game_plan.md`는 설계 이력도 포함한다. 현재 상태 판정은 이 문서와 gap analysis가 우선한다.

## 5. 검증 명령

```bash
npm run chicken:economy:measure
npm run chicken:wolfai:measure
npm run chicken:perf:measure
```

각 측정 artifact는 `chicken_farm_w3x_artifacts/`에 남긴다. 수치가 문서의 기준값과 달라지면 gap analysis와 canonical balance를 함께 갱신한다.
