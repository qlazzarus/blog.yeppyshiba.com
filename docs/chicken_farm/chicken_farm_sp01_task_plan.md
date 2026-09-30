# SP-01 목표와 현재 actual 상태

> 최종 갱신: 2026-09-30. 이 문서는 SP-01의 목표와 현재 코드 actual만 기록한다. W3X 정적 근거는 아래의 지정 artifact와 원본 분석을 따른다. task별 조사 과정과 이전 값은 Git 이력으로 관리한다.

## 목표

W3X `닭농장1.3a`의 기본 협동 늑대 방어를 웹의 단일 플레이 세션으로 구현한다. 한 판은 정상 시작 상태에서 농장 경제와 방어를 진행하고, 아키몬드 최종전 뒤 승리 또는 농부의 최종 사망 뒤 패배로 끝나며, 새 판을 깨끗하게 다시 시작할 수 있어야 한다.

웹판의 기본 모드는 W3X 원본을 그대로 멀티플레이로 재현하는 범위가 아니다. 선택한 하나의 시작 위치에서 농부와 개를 조작하는 싱글플레이로 변환한다.

## 확정된 목표 규칙

| 영역 | 목표 규칙 | 근거 또는 제품 결정 |
| --- | --- | --- |
| 기본 시작 자원 | normal `1500 gold / 0 lumber / supply cap 3 / supply used 0`, easy `1700 gold` | W3X `IIilii`의 시작 gold와 기본 branch, `H000` supply 값의 웹 변환 |
| 기본 시작 유닛·아이템 | 농부 `H000` 1기, 개 `n002` 1기. I003 5회, I009 1회, I00F 1회 | W3X `IIilii`의 기본 `illI=0` branch |
| 중립·중앙 배치 | 거미 8기, 늑대의 돌 13기, 고대 늑대의 돌 1기, 중앙 시장 `n006`, 행상인 `h01R`, 이벤트 NPC `n01J`를 원본 좌표에 배치 | `key_unit_placement_reference.tsv`, `phaser_object_position_crosscheck.tsv` |
| 농부 부활·패배 | 농부 HP 0은 총 2회까지 부활 대기다. 매 부활 때 gold/lumber 40%를 잃고 1분 무적이다. 2회를 소진한 뒤 농부가 사망하면 패배다. 개·닭·일반 건물의 상실만으로는 패배하지 않는다. | W3X 부활 트리거와 싱글플레이 규칙 결정 |
| 부활 위치 | 농부는 중앙 시장 `n006`의 `(1984, -2688)`에서 부활한다. | W3X/Phaser 위치 대조 artifact |
| 웨이브 시간 | 주요 단계는 `120 / 600 / 1100 / 1500 / 2000 / 2200 / 2400 / 2600 / 2800 / 3000`초다. `H012`, `H00X`, `H013`, `H01B`, `H01N` 보스는 각각 600, 1500, 2200, 2600, 3000초다. | `wolf_wave_phase_reference.tsv`와 JASS 정적 분석 |
| 승리 | 아키몬드와 추적된 웨이브 적·명시적 연결 소환체가 모두 제거되고 농부가 생존하면 승리한다. final 뒤 정규 보충 중단은 유한한 웹 싱글 세션을 위한 제품 결정이다. | W3X 보스 spawn + 웹판 종료 규칙 결정 |
| 동시 판정 | 같은 simulation tick에서 승리와 최종 패배가 함께 성립하면 패배가 우선한다. | 웹 싱글 규칙 결정 |
| debug 자원 | `10000 gold/lumber/supply cap`은 명시적 `debugEconomy`에서만 제공한다. | W3X의 별도 8000 gold 이벤트를 개발용으로 분리한 제품 결정 |

`H01O` 네더 드래곤의 변환 조건은 아직 실제 W3X 플레이 또는 분기 확인이 없다. 기본 승리 조건과 필수 잔여 적에는 넣지 않는다.

### 난이도

웹 난이도는 원본 8단계와 같은 순서와 효과를 사용한다. 임의 HP 보정이나 4단계 압축을 두지 않는다.

| 난이도 | 원본 기준 효과 |
| --- | --- |
| easy | 늑대 공격속도·이동속도·방어력 `-30%`, 시작 gold `+200` |
| normal | 추가 보정 없음 |
| hard | 늑대 공격속도 `+40%` |
| special | 늑대 공격속도 `+70%` |
| crazy | 늑대 공격력·공격속도 `+70%` |
| mad | 늑대 공격력·공격속도 `+100%`, 방어력 `+5` |
| impossible | 늑대 공격력·공격속도 `+150%`, 방어력 `+10` |
| unlimited | 늑대 능력 대폭 상승, 보스 특수 능력 사용. 구체 rawcode·수치는 W3X trigger/실제 플레이로 확정한 뒤 연결한다. |

## 현재 actual 상태

| 영역 | 현재 코드 actual | 목표와의 차이 | 다음 작업 |
| --- | --- | --- | --- |
| 시작 wallet | `CHICKEN_FARM_BALANCE.economy`는 `1500 / 0 / 3`을 가진다. `getStartingGold()`은 기본 normal을 반환하며 easy bonus는 `+200`이다. `FarmScene#createEconomyPoc()`은 현재 난이도 선택값을 넘기지 않아 실제 새 판은 normal로 시작한다. | 난이도 선택·저장·UI가 없다. | SP-03, SP-15 |
| debug wallet | `CHICKEN_FARM_POC_FLAGS.debugEconomy`는 기본 `false`다. true이면 `createEconomyPoc()`이 gold/lumber/supply cap 각각 10000으로 덮어쓴다. | 명시적 개발 flag뿐이며 debug 전환 UI·telemetry 분리는 없다. | SP-03, SP-15 |
| 시작 유닛·아이템 | 현재 시작 생성 경로는 농부 1기와 개 1기를 만들고, 살아 있는 농부에게 I003 5회·I009 1회·I00F 1회를 지급한다. | 선택 start와 새 run 초기화가 단일 정상 preset으로 정리되지 않았다. | SP-03 |
| 원본 중립·중앙 배치 | 25개 manifest/registry와 ID·좌표 geometric view가 있다. | 목표의 중립 유닛, 중앙 NPC, 늑대의 돌이 실제 gameplay entity·전투·상호작용으로 생성되지 않았다. | SP-07, SP-08, SP-12 |
| 전투 | `combat`과 `combatSmoke` flag는 기본 `false`다. Combat PoC와 관련 데이터는 존재한다. | 기본 한 판의 실제 공격·피해·사망·경로 연결이 없다. | SP-07 |
| 웨이브 | `balance.ts`는 원본 시간표와 보스 rawcode에 맞춘 timeline 데이터를 가진다. | 웨이브 생성, 적 registry, 보충, final 전이와 18티어 population은 runtime에 연결되지 않았다. | SP-08, SP-10 |
| 난이도 스탯 | 타입·balance 데이터는 8단계다. `getScaledEnemyStats()`은 원본의 공격력·공격속도·이동속도·방어력 보정을 적용한다. | 난이도 선택과 실제 적 생성 경로가 없으며, Unlimited의 보스 특수 능력은 flag만 있고 실행하지 않는다. | SP-08, SP-10, SP-15 |
| 부활·패배·승리 | `reviveResourceLossPct: 40` 데이터만 있다. `FarmScene#update()`은 매 프레임 기존 시스템을 계속 갱신한다. | 부활 횟수·중앙 귀환·무적·종료 판정·동시 판정 우선순위·게임플레이 정지가 구현되지 않았다. | SP-07, SP-11 |
| 재시작·pause | scene shutdown cleanup은 input/tween/debug API와 현재 unit/building/placement/initial entity/fog/economy view state를 비운다. | 같은 page 새 run orchestration, 종료 상태, wave/결과 state와 hidden pause의 논리 시간 정책은 없다. | SP-03, SP-11, SP-13, SP-16 |
| 검증 | `npm run build --workspace @games/chicken-farm`은 통과했다. | 브라우저 smoke와 정상 속도 한 판 검증은 아직 하지 않았다. 전체 `build:games`는 chicken-farm 이전의 apex-seoul TypeScript 오류로 통과하지 못한다. | SP-02, SP-16 |

## 모드 범위

| W3X 모드 | 현재 범위 |
| --- | --- |
| 기본 협동 늑대 방어 | **구현 대상.** 웹에서는 1인 normal/easy 방어 세션으로 먼저 완성한다. |
| 네버 엔딩 | 보류. 3000초 이후 지속 보충, 결과·생존 점수 규칙을 별도 설계한다. |
| 경쟁 모드 | 보류. 다중 플레이어, 독립 farm/wallet, 순위와 동기화가 필요하다. |
| 울프 헌팅 | 보류. 늑대의 돌 파괴, 점수와 다인 순위가 필요하다. |
| 타이쿤 | 보류. 늑대 없는 경제 전용 목표와 종료 규칙을 별도 정의한다. |
| 전쟁 모드 | 현재 싱글 및 첫 멀티 범위에서 제외한다. |
| web debug mode | 게임 모드가 아닌 개발 설정이다. 기본 경제·결과와 섞지 않는다. |

난이도 선택 UI·저장, 실제 적 생성 경로의 적용, Unlimited 보스 특수 능력은 아직 구현되지 않았다.

## SP-01 판정과 인계

SP-01은 **진행 중**이다. 목표 규칙과 시작 데이터는 정리됐지만, 기본 방어 세션의 핵심 lifecycle이 아직 actual이 아니다.

| 후속 ID | 완료에 필요한 결과 |
| --- | --- |
| SP-02 | 재현 가능한 실행·브라우저 smoke 경로와 타입 기준선 |
| SP-03 | normal/debug 시작 preset, 선택 start, 유닛·아이템·중립 배치, 새 판 초기화 경로 |
| SP-07 | 실제 전투와 농부 사망 event |
| SP-08 | 원본 위치·시간표에 따른 실제 웨이브와 final 전이 |
| SP-10 | 18티어/보스·보상·연결 소환체 관리 |
| SP-11 | 부활·승패·종료 lock·재시작 |
| SP-12 | 보류 모드 및 중앙 NPC/이벤트 등 콘텐츠 범위 분해 |
| SP-13 | pause/hidden 동안 논리 시간 동결 |
| SP-15 | debug 없이 정상 난이도 경제·방어 밸런스 검증 및 난이도 매핑 |
| SP-16 | 승리·최종 패배·반복 재시작·성능 회귀 |

## 참조

- [현재 실행 현황](./chicken_farm_current_context.md)
- [구현 backlog](./chicken_farm_implementation_backlog.md)
- [웨이브·상점·질병 명세](./chicken_farm_wave_shop_disease_mvp_spec.md)
- W3X 분석 artifact: `map_start_locations.tsv`, `initial_farmer_inventory_reference.tsv`, `key_unit_placement_reference.tsv`, `phaser_object_position_crosscheck.tsv`, `wolf_wave_phase_reference.tsv`
