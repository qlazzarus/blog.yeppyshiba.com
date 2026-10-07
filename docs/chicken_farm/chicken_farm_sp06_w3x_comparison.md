# SP-06 닭·알 경제 — W3X 기준 최종 비교

> 갱신: 2026-10-07. 이 문서는 `닭농장1.3a.w3x`의 추출 근거와 웹 MVP의 완료된 경제 루프를 비교한다. 웹 구현의 통과는 **SP-06 범위의 동작 검증**이며, 원본 W3X의 경제 전체를 복제했다는 뜻은 아니다.

## 완료 판정

SP-06은 완료다. fixture를 끈 normal P3에서 실제 입력으로 시작 아이템 설치, 시장 교환, 닭장 건설, 두 마리 분양, 실제 산란, 수집, 닭장 입고, 부화, 시장 판매를 한 run에서 완료했다. `economy_check_full_loop.json`의 여섯 개 검사는 모두 `true`이고 browser console/page/request/response 오류는 모두 비어 있다. 이어 `CHICKEN_FARM_ECONOMY_CASE=all`의 top-level `pass`도 `true`다.

| 검증 | 근거 | 결과 |
| --- | --- | --- |
| 정상 전체 루프 | [full-loop artifact](./chicken_farm_w3x_artifacts/economy_check_full_loop.json) | fixture off, `1500/0 → 1400/70 → 1280/18 → 1292/18`, 닭 `2 → 3`, HUD 일치 |
| 경제 사례 묶음 | [all artifact](./chicken_farm_w3x_artifacts/economy_check_all.json) | baseline, 분양, bootstrap, 산란, 수집, drop/입고, 부화, 판매, 주문 취소까지 pass |
| 순수 경제 불변식 | [economy metrics](./chicken_farm_w3x_artifacts/economy_poc_metrics.json) | 32개 사례 통과 기록 |

## 원본 근거와 웹 구현

| 영역 | W3X 추출 근거 | 웹 SP-06 구현·검증 | 판정 |
| --- | --- | --- | --- |
| 닭 분양 | `I002`/`I003`은 사용 시 사용자 위치에 닭 한 마리를 생성한다. `I003`은 시작·부활 지급용 charged item이다. | normal P3는 `I003 ×5`를 받고, 실제 HUD 슬롯 입력으로 basic chicken을 생성한다. spawn 불가 시 charge를 보존한다. | 기능 보존 |
| 시작 운영 아이템 | `I009`은 불터 키트, `I00F`는 시장 건설 아이템이다. | 같은 rawcode 계열의 시작 아이템을 actual targeting으로 설치한다. MVP normal loop에서는 둘을 skip-cost complete building으로 제공한다. | 역할 보존, 비용 정책 변환 |
| 금·목재 교환 | JASS 3185–3186은 `-100 gold, +70 lumber`를 기록한다. 이후 500/400, 1500/1200, 3000/2400 tier도 있다. | own complete market의 한 번의 `100 gold → 70 lumber` 교환만 구현한다. 첫 닭장 자금 경로를 위한 최소 tier다. | 첫 tier 보존, 상위 tier 미구현 |
| 닭장 계열 | `h00N → h00O → h01Z`, 비용은 각각 `700/300`, `800/500`, `1200/800` gold/lumber다. | `coop_basic/mid/high`의 계열·이름·HP·선행 데이터는 보존한다. SP-06 normal loop는 `coop_basic`의 MVP 비용 `120 gold/52 lumber`, 25초 건설만 사용한다. | 계열 보존, 수치·시간 변환 |
| 알 | `I006`은 알이며 부화장 입력 또는 판매 대상으로 설명되고, 원본 item gold cost는 170이다. | field → farmer 6-slot → coop 6-slot 이동, drag drop, owner 검증, 한 번의 부화 또는 `12 gold` 판매를 구현한다. | 흐름 보존, 가격 변환 |
| 30초 경제 cadence | 럼버 밀 세 계열은 JASS 9358–9360에서 30초마다 70/110/170 lumber를 만든다. | 현재 basic/mid/high 닭의 30초 egg production만 구현돼 있다. 럼버 밀 owner wallet 수입은 아직 연결되지 않았으며 SP-06.5에서 원본 값으로 복원한다. | 수정 대기 |
| 시장 판매 | 시장 `h00E`는 금·목재 교환과 닭 구매 역할을 가진다. | own complete market 도착 뒤에만 I006 stack 전체를 판매하며, 타 owner·미완공·삭제 시장·반복 판매를 거부한다. | 역할 보존, 현재는 알 판매만 구현 |
| 부화 | `I006` 설명은 부화장 투입 후 닭 부화를 명시한다. | coop의 알 한 개를 job 하나로 원자 변환하고 20초 후 basic chicken을 만든다. 출구가 막히면 job을 유지하고 해제 후 한 번만 완료한다. | 기능 보존, 세부 확률·종 미구현 |

## 의도된 차이와 후속 범위

| 차이 | 영향 | 후속 |
| --- | --- | --- |
| 원본의 럼버 밀 30초 수입이 runtime에 없다. | `h00A/h00J/h00W`의 owner별 목재 `70/110/170` 지급을 복원해야 한다. | SP-06.5 |
| 상위 환전 tier와 시장 구매 목록을 구현하지 않았다. | SP-06의 첫 경제 루프는 가능하지만 원본의 장기 자원 경제와 같지 않다. | SP-09, SP-12, SP-15 |
| 원본 가격·건설 시간·알 가치·생산 단위를 웹 세션 길이에 맞게 축소했다. | progression 속도와 장기 밸런스는 원본 재현 값이 아니다. | SP-15 |
| requires, supply, coop upgrade/production queue, research를 runtime에서 완전 강제하지 않는다. | 경제 루프 밖의 성장 gate는 아직 검증되지 않았다. | SP-09 |
| 특수 닭, 가족/용병, 질병·치유, 중앙 NPC/상점 이벤트를 포함하지 않는다. | 원본의 콘텐츠 폭과 보상 루프는 미구현이다. | SP-12 |
| 적의 공격으로 farmer/chicken/building이 제거되는 실제 연결이 없다. | 경제 제거 정책은 테스트됐지만 방어 게임 안의 파괴 루프는 아직 미검증이다. | SP-07, SP-08 |
| pause/hidden 탭에서 산란·부화·명령 시간을 어떻게 처리할지 확정하지 않았다. | wall-clock 기반 장시간 플레이의 시간 정책은 보류 상태다. | SP-13 |

SP-06은 위 차이를 숨기지 않는다. 완료 판정은 원본 수치 복제가 아니라, 추출 근거를 가진 웹 MVP 경제 경로가 normal P3에서 소유권·수량·wallet·HUD를 보존하며 한 바퀴 동작한다는 데 있다.
