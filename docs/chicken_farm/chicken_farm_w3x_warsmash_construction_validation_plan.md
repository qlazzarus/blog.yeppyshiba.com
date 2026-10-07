# W3X 건설·울타리·대문 — Warsmash 검증 계획

> 작성: 2026-10-02. 목적은 원본 `닭농장1.3a.w3x`의 행동을 관찰해 웹 값을 보정할 근거를 얻는 것이다. Warsmash 소스·원본 게임 데이터·원본 에셋을 프로젝트에 포함하거나 복사하지 않는다.

## 현재 확인된 것과 미확정인 것

| 항목 | 현재 근거 | 상태 |
| --- | --- | --- |
| Human build의 비용 차감 시점 | 기존 Warsmash 소스 관찰에서 `CAbilityHumanBuild`가 build order 시작 시 차감하고, `CBehaviorHumanBuild`가 구조물 생성 직전 부지를 재검사해 실패 때 환불한다. | 동작 모델 확인 |
| 울타리·벽·결계 | 재실행한 `unit_rawcode_crosscheck.tsv`에서 `h003,h00L,h00K,h00Y,h014,h01D,h01G` 모두 `unit_data.pathTex = PathTextures\\4x4SimpleSolid.tga`다. | 4x4 minor cell solid footprint 확정 |
| 대문 후보 | `h006`는 `4x4SimpleSolid`, `h00G`는 `4x4unbuildable`이며, 같은 `A00G`, 모델·HP·비용과 각각 `_`/`fly` move type을 가진다. | 닫힘/열림 상태인지 별도 유닛인지, ground blocker 전이는 Warsmash 관찰 필요 |
| 건설 시간 | 현재 익명 SLK/INI crosscheck TSV가 build time 필드를 저장하지 않는다. | 미확정 |
| 사용자가 Cancel을 눌렀을 때 환불 | 원본 map trigger 또는 ability의 보정 여부가 정적 분석에 없다. | 미확정 |

## 1. 재실행 가능한 정적 추출

`scripts/analyze_chicken_w3x.py`의 unit crosscheck 출력에 원본 데이터 필드 후보를 추가하고 재실행했다. 후보는 `builtime`/`buildTime`과 `pathTex`/`pathtex`이며, 값이 없으면 빈값이 아니라 `unavailable_in_extracted_tables`로 기록한다. 대상 rawcode는 `h003,h00L,h00K,h00Y,h014,h01D,h01G,h006,h00G`와 실제 build-card 대상이다.

산출물은 다음 두 파일로 한정한다.

- `construction_reference_static.tsv`: rawcode, 원본 비용, HP, 요구조건, build-time field, pathTex field, 추출 출처, confidence
- `gate_candidate_reference.tsv`: `h006/h00G`의 ability, move type, pathTex field, state-transition 관찰 필요 여부

결과로 울타리·벽·결계의 `4x4SimpleSolid`, 닫힌 대문의 `4x4SimpleSolid`, `h00G`의 `4x4unbuildable`을 확보했다. build time은 모든 대상에서 `unavailable_in_extracted_tables`다. 정적 필드가 확보돼도 대문 엔진 상태 전이와 map trigger 수정 가능성은 확정하지 않는다. 다음 Warsmash 관찰이 그 기준이다.

## 2. Warsmash 실행 전제

Warsmash는 원본 Warcraft III 게임 데이터를 가리키는 `warsmash.ini`가 필요하며, 공식 README는 `runGame -Pargs="-loadfile WorldEditTestMap.w3x -window"`로 지정 맵을 창 모드에서 반복 실행하는 방법을 제공한다. [Warsmash README](https://github.com/Retera/WarsmashModEngine/blob/main/README.md)를 기준으로 실행한다.

필요한 로컬 전제는 다음뿐이다.

1. 사용자가 합법적으로 보유한 Warcraft III Classic 호환 데이터 경로
2. 별도 임시 경로의 Warsmash checkout 또는 release binary
3. 원본 W3X를 Warsmash가 읽는 Maps 경로에 배치한 사본
4. 화면 녹화 또는 frame timestamp를 기록할 수단

현재 workspace에는 Warsmash checkout과 Warcraft III 데이터 경로가 없으므로, 이 전제가 확보되기 전에는 결과를 원본 관찰로 표시하지 않는다.

## 3. 관찰 매트릭스

모든 사례는 난이도·플레이어 수·게임 경과 시간·rawcode·시작/종료 gold/lumber와 영상 timestamp를 한 행에 남긴다. map trigger가 자원을 변경할 수 있으므로 같은 조건의 무행동 control도 기록한다.

| 사례 | 입력 | 기록 | 판정 |
| --- | --- | --- | --- |
| 건설 시간 | `H000` 농부로 `h003`, `h00N`, `h006` 각각 3회 건설 | build order 시점, scaffold/공사 시작, 완료 frame; median/sec | 3회 값의 범위가 5% 이하이면 web build time 보정 후보 |
| 착공 비용·실패 환불 | 자원이 충분한 경우와, 이동 중 자원을 소진해 착공 직전 실패한 경우 | order 전/착공 뒤/실패 뒤 gold·lumber | 기존 Warsmash 모델과 map-specific trigger 차이를 분리 |
| 사용자 취소 환불 | 0%, 약 50%, 약 90% 진행에서 Cancel; 완료 뒤 제거도 별도 | cost, refund, 진행률별 delta, 건물 존속 여부 | 동일 비율이면 web 정책 후보, 진행률 의존이면 함수로 기록 |
| `h003` footprint | 열린 평지에 울타리 배치 뒤 네 방향/대각선에서 농부 이동 명령 | 통과/차단 cell, 배치 가능 cell, 구조물 중심 | `4x4SimpleSolid`와 실제 overlay가 일치하는지 확인 |
| 벽/결계 체인 | `h00L,h00K,h00Y,h014,h01D,h01G`를 같은 절차로 관찰 | static 4x4 solid overlay와 실제 이동 차단의 일치 여부 | 추출된 pathTex와 engine overlay가 일치하는지 확인 |
| 대문 상태 | `h006`/`h00G`를 각각 놓고 `A00G`의 가능한 order를 실행 | order 전후 rawcode/model/move type, 통과/차단, 선택 카드 | open/close state machine인지, 별도 pathing variant인지 구분 |

### 대문 관찰의 실패 방지 규칙

- `h006`와 `h00G` 중 하나가 editor data의 잔여 행일 수 있으므로, 원본 농부/팅커의 실제 build list 또는 생성 trigger에서 도달 가능한지를 먼저 확인한다.
- `A00G`가 자가 시전인지, 대상 지정인지, transform인지 영상과 order string을 함께 기록한다.
- gate 양쪽에 동일한 이동 명령을 내리고, 최소 3회 통과/차단을 재현한다. 모델만 보고 open/closed를 판정하지 않는다.

## 4. 결과 반영 규칙

| 관찰 결과 | 웹 반영 |
| --- | --- |
| 확정된 build time | `buildingTemplates.ts`의 해당 `buildTimeSec`과 W3X reference field를 분리해 기록한다. 웹 세션 압축이 필요하면 원본초와 변환초를 모두 남긴다. |
| 확정된 pathTex footprint | `footprintCells`와 dynamic blocker overlay를 그 값에 맞춘다. 변경 전 fence/tower/gate pathing browser 사례를 추가한다. |
| 확정된 취소 환불 | `cancelConstruction`에 원본 정책을 적용하고 paid/skipCost/반복 cancel/restart 회귀를 갱신한다. 원본 관찰이 없는 동안 현재 75%는 웹 정책으로 유지한다. |
| gate open/close 확인 | `gate_wood`에 상태·order·pathing overlay 전이를 추가한다. open은 blocker 제거, close는 footprint 재등록이며, 유닛이 겹치는 때의 정책도 별도 검수한다. |
| 원본과 의도적으로 다른 웹 정책 | 비교표에 이유와 수치를 남기고 원본 동등성으로 표시하지 않는다. |

## 5. 작업 분리

이 계획은 SP-06 경제 작업을 막지 않는다. Warsmash 관찰 결과가 나오면 독립 ID를 만든다.

- `SP-09`: build requirement, 벽/결계 전체 tech chain, gate 상태와 build-card 연결
- `SP-07`: 적 피해와 blocker 제거/재경로 연결
- `SP-15`: 원본 build time·비용을 반영한 정상 자원 한 판의 밸런스 검수

기존 SP-05의 web lifecycle 완료 판정은 유지한다. Warsmash 관찰은 수치와 원본 행동 근거를 보강하는 후속 검증이다.
