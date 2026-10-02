# SP-05 건설 lifecycle — W3X/WPM 기준 비교

> 작성: 2026-10-02. 비교 대상은 `닭농장1.3a.w3x`와 그 내부 `war3map.wpm`이다. 원본 코드·에셋을 복사하지 않고, 추출된 메타데이터와 현재 웹 runtime을 대조한다.

## 판정 기준

SP-05의 완료는 웹 runtime 건설 lifecycle의 완료를 뜻한다. W3X와의 동일 구현 또는 원본 밸런스 복제를 뜻하지 않는다. 원본의 `war3map.w3u`는 표준 파일명으로 추출되지 않았다. 울타리·벽·결계 전 계열의 `4x4SimpleSolid`, 닫힌 대문의 `4x4SimpleSolid`, `h00G`의 `4x4unbuildable` pathTex는 확보했다. 대문의 runtime 전이, 건설 시간, 사용자 취소 환불은 미확정으로 남긴다.

근거는 [W3X 분석 노트](./chicken_farm_w3x_analysis.md), [건물/테크 표](./chicken_farm_w3x_artifacts/building_tech_reference.tsv), [울타리 후보](./chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv), [WPM 시작 구역](./chicken_farm_w3x_artifacts/wpm_start_pathing.tsv), 그리고 [SP-05 계획](./chicken_farm_sp05_task_plan.md)과 construction artifact다.

## 일치하거나 의도적으로 변환한 부분

| W3X/WPM 관찰 | 웹 SP-05 상태 | 판정 |
| --- | --- | --- |
| `H000` 농부는 시작 건설 목록을 보유한다. | normal P3의 `p3-farmer`만 builder로 허용하고 실제 build-card 입력을 검수했다. | 기능 일치 |
| 시작 슬롯 0~9는 반경 1024에서 건설 불가 비율이 0~0.499%인 열린 농장 구역이다. | WPM 기반 terrain blocker, world bounds, footprint 겹침 검사를 placement와 착공 직전에 모두 수행한다. | 구조 일치 |
| 울타리 `h003` → 청동 울타리 `h00L`은 high-confidence blocker·upgrade chain이다. 원본 비용은 gold 5/70, HP 200/300이다. | `fence_wood`/`fence_bronze`가 같은 rawcode 계보·HP·upgrade 관계를 보존한다. 웹 비용은 8/22 gold로 세션 길이에 맞춰 변환했다. | 원본 관계 보존, 수치 변환 |
| 닭장 `h00N` → `h00O` → `h01Z`은 W3X의 경제 라인이다. 원본 비용은 700/300, 800/500, 1200/800 gold/lumber다. | `coop_basic`/`mid`/`high`가 rawcode·명칭·HP·선행 건물 관계를 보존하고, 낮춘 web cost와 25/22/20초 건설 시간을 사용한다. | 원본 관계 보존, 수치 변환 |
| 원본은 대부분의 지형이 열려 있고, 울타리/건물을 방어선으로 쓴다. | 완공 `blocksPath` 건물만 동적 blocker가 되며, 새 blocker 우회·완전 차단의 유한 종료·제거 뒤 이동을 browser controls로 검수했다. | 구조 일치 |

## SP-05에서 실제로 검증한 lifecycle

| 웹 lifecycle | 검증 근거 | W3X와의 관계 |
| --- | --- | --- |
| preview → pending → 농부 도착 뒤 비용 차감·착공 | arrival/start-rejection artifact | 원본 농부 건설 감각과 맞지만, 원본의 비용 차감 시점은 정적 추출만으로 확정하지 못했다. |
| Stop·이동 명령·농부 사망 뒤 pause, 명시적 우클릭 resume 및 같은 소유자 worker handoff | pause/resume artifact | 원본 명령 취소 의미를 직접 관찰하지 않았으므로 웹의 명시 정책이다. |
| Shift FIFO, 착공 직전 terrain·overlap·wallet 재검증 | queue/start-rejection artifact | W3X의 이동·건설 pathing 제약과 부합하지만, 원본 queue 세부 규칙은 미관찰이다. |
| 유료 건설 중 취소는 비용의 75% 내림 환불, skipCost는 0 환불 | refund artifact | W3X 취소/환불 비율의 추출 근거가 없다. 웹 정책이며 원본 동등성으로 표시하지 않는다. |
| 완공 1회 전이, blocker·vision·economy 등록; 제거 시 참조 정리; same-page restart 격리 | completion/removal/restart artifact | 원본 건물 파괴·복구 흐름의 직접 대조는 SP-07 이후 실제 피해 연결이 필요하다. |
| normal P3의 `B → F → 배치 → Stop → 재개 → 완공` | [통합 artifact](./chicken_farm_w3x_artifacts/construction_check_integration.json) | W3X 원본 좌표를 복사하지 않은 웹 맵 좌표에서 검증했다. |

## 차이와 다음 작업

| 우선순위 | 차이 | 근거와 영향 | 담당 |
| --- | --- | --- | --- |
| 높음 | `requires` 데이터는 template에 있으나 placement/착공 검증은 builder·자원·bounds·terrain·overlap만 검사한다. | W3X의 `h001 → h00H → h015`, 닭장·벽·타워·연구소 선행 조건이 실제 build rejection으로 강제되지 않는다. | SP-09 |
| 높음 | 완공 닭장은 economy adapter에 등록되지만, 닭·알·입고·판매·wallet 수량의 실제 한 바퀴는 미검수다. | W3X는 30초마다 럼버 밀 등급별 70/110/170 목재 수익을 준다. 웹은 이를 닭/알 경제로 변환할 계획이다. | SP-06 |
| 높음 | 실제 적 피해는 공용 `removeCompletedBuilding` 경로로 아직 연결되지 않는다. | W3X 울타리·타워는 적의 공격 대상이며 방어선 파괴 뒤 경로가 다시 열려야 한다. | SP-07 |
| 중간 | 원본 build time과 취소 환불 규칙이 미확정이다. | build-time field는 추출 테이블에 없으므로 현재 1~40초와 75% 환불은 웹 정책이다. | [Warsmash 검증 계획](./chicken_farm_w3x_warsmash_construction_validation_plan.md) 후 SP-09/15 |
| 중간 | W3X fence는 `h003 → h00L → h00K → h00Y → h014 → h01D → h01G`, gate 후보는 `h006/h00G`다. | 벽 계열은 모두 4x4 solid pathTex로 확인했다. `h006` solid와 `h00G` unbuildable의 실제 open/close 전이는 미구현·미관찰이다. | SP-09, [Warsmash 검증](./chicken_farm_w3x_warsmash_construction_validation_plan.md) |
| 낮음 | 원본은 최대 10인 농장이고 현재 검수는 single normal P3다. | 이번 프로젝트의 싱글플레이 범위 결정에 따른 의도적 차이이다. | 멀티 범위 재개 시 별도 계획 |

## SP-06 착수 기준

SP-06은 SP-05 lifecycle을 다시 구현하지 않는다. 완공 건물의 `id`·`ownerPlayerId`·wallet 차감/환불 기록을 유지한 채, 다음을 검수한다.

1. `coop_basic` 완료 뒤 닭/알 수량이 해당 building ID에 연결되는지.
2. 수집·입고·부화 또는 판매에서 inventory와 wallet이 한 번만 변하는지.
3. 취소·제거·restart 뒤 그 건물의 수량·timer·view 참조가 남지 않는지.
4. 원본 30초 생산 주기와 70/110/170 등급 관계는 웹 변환값임을 명시하고, 실제 수량 흐름을 artifact로 남기는지.

SP-05의 핵심 lifecycle 결함은 이 비교에서 새로 발견되지 않았다. 위 항목은 범위 차이 또는 원본 근거 미확정이며 SP-05 완료 판정을 낮추지 않는다.
