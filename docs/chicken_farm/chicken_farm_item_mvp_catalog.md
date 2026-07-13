# Chicken Farm Item MVP Catalog

> 원본 `item_catalog_reference.tsv`, `item_acquisition_reference.tsv`, `initial_farmer_inventory_reference.tsv`를 웹 MVP의 구현 상태로 번역한 목록이다.

## 시작 아이템

| Rawcode | 아이템 | 원본 효과 | MVP 상태 |
| --- | --- | --- | --- |
| I003 | 닭 분양서 | 사용자 위치에 기본 닭 생성, 시작/재시작 시 5/6/7 charges | 구현: 시작 5 charges, 슬롯 클릭으로 농부 근처 기본 닭 소환 |
| I009 | 불터 키트 | 목표 지점에 불터 건설, 식량 +2 및 주변 닭 급식 | 구현: 1 charge, 슬롯 클릭 후 지점 지정으로 즉시 불터 생성. 기본 우물과 같은 닭 유인/급식 MVP 역할 |
| I00F | 시장건설 | 목표 지점에 시장 건설 | 구현: 1 charge, 슬롯 클릭 후 지점 지정으로 즉시 시장 생성 |
| I008 | 질병 치료제 | 질병 치료, 10 charges | 보류: 질병 시스템 도입 시 구현 |

## 경제·상점 우선 아이템

| Rawcode | 아이템 | MVP 처리 |
| --- | --- | --- |
| I002 | 닭 분양서 | 시장 구매용 기본 닭 분양서. 상점 구현 시 I003과 동일한 소환 효과를 재사용 |
| I006 | 알 | 구현: field item, 농부/닭장 inventory, 부화 입력 |
| I005 | 고기상자 | 보류: 동물 처리·시장 판매와 함께 구현 |
| I007 | 치킨 | 보류: 조리/회복/판매 루프와 함께 구현 |

## 구현 규칙

- charged 시작 아이템은 inventory slot을 클릭하면 `targeting` 상태가 되고, 지점 클릭 성공 때만 charge를 소비한다.
- 키트 건물은 시작 아이템 효과이므로 건설비와 농부 건설 시간을 요구하지 않는다.
- `start_item_targeting_started`, `start_item_used`, `start_item_placement_rejected` telemetry를 통해 사용·실패를 기록한다.
- 취소(`Esc`) 및 buildable/pathing validation은 다음 polish에서 construction placement validator와 공용화한다.
