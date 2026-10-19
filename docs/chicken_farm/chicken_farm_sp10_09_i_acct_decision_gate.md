# SP-10-09-i-2-c — ACct 데이터 확정 또는 웹 대체 정책 결정 게이트

작성일: 2026-10-19. 상태: **W1 사용자 승인 완료 / 구현 대기**. 사용자 승인: “좋아 해당 방향으로 진행해서 세부 task 로 terra medium 으로 하도록 진행해”.

## 전제

i-2-b는 ACct 실제 base-data 행을 확보하지 못했다. 따라서 다음 두 경로의 근거와 결과 표기를 섞지 않는다.

| 경로 | 결과 표기 | i-2 완료 조건 |
| --- | --- | --- |
| S — 라이선스 데이터셋 복구 | 선택한 데이터셋 기준 ACct 값 | 버전·hash·상속/override 합성이 재현되고 필수 필드가 모두 해소됨 |
| W — 웹 대체 정책 | 원본 재현이 아닌 웹 설계값 | 아래 모든 승인값과 사용자 승인 기록이 있음 |

둘 중 하나가 충족되기 전에는 n00C의 blocked_source_data, ACct artifact의 미확정 상태, 상위 i의 보류를 유지한다.

## S — 데이터셋 복구 계약

사용자가 합법적으로 접근 가능한 Warcraft III 데이터셋을 제공하거나 읽기 경로를 지정하면, 원본 자산은 repository에 복사하지 않고 다음 절차만 수행한다.

1. manifest에 제품/patch/locale, 제공 경로, archive mount 우선순위, 파일별 SHA-256, 접근 허가 범위를 기록한다. Warsmash engine commit과 게임 데이터 버전은 분리한다.
2. Units/AbilityData.slk의 ACct row와 해당 AbilityFunc/Strings profile section을 추출한다. war3map.w3a, skin, campaign 변경분은 존재·우선순위·필드별 override를 별도 기록한다.
3. 최소 파생 artifact에만 필드값을 기록하고 원본 SLK, MPQ/CASC, profile 전체는 commit하지 않는다.
4. base와 map override를 필드별로 합성하고, 모든 최종값이 원문 행·hash·level로 역추적되는지 검사한다.

| 필수 영역 | 기록/판정 |
| --- | --- |
| 식별·상속 | ACct alias, code, levels, profile section, dataset/locale/patch, archive 우선순위 |
| 공격 효과 | DataA1~DataE1 각각의 원문값·타입·단위·level, DataB의 배수 의미 |
| 대상·부수 효과 | targets, BuffID, Dur/HeroDur, DataC bonus, DataD/E, 명시적 0과 누락의 구분 |
| map 합성 | 필드별 base, override 존재/값, 최종값, source location |
| 재현성 | SLK/profile/변경 파일 SHA-256, 추출 명령/종료 코드, 파생 artifact SHA-256 |

중단 조건: 권리·버전·hash가 불명확하거나 필수 필드 하나라도 읽히지 않으면 값을 보간하지 않는다. map 제작 버전 일치가 증명되지 않으면 선택한 데이터셋 의미론으로 표기하며 원본 재현이라고 부르지 않는다.

## W1 — 승인된 웹 대체 정책 (2026-10-19)

사용자 요청으로 Warsmash 공개 동작을 활용한 대체 가능성을 재검토했다. 15%·2배와 아래 전체 W1을 사용자에게 제시한 뒤 채택 승인을 받았다. 기존 W 양식은 역사적 대안이며 빈칸을 별도로 채울 필요가 없다.

결론: [Warsmash README](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/README.md)는 게임 자산을 포함하지 않는다고 명시한다. [공개 passive 정의](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/assets/abilityBehaviors/generalPassives.json#L228)는 대상 검사·확률 비교·배수 적용의 참고 근거다. ACct alias의 실제 code와 수치는 여전히 외부 데이터가 필요하다. 따라서 **공개 동작을 참고한 독립 웹 구현은 가능**, **공개 저장소에서 ACct 원본 수치를 가져와 대체하는 것은 확인된 자료로 불가능**하다. 기존 공개 후보 조사도 전체 인터넷에 데이터가 없음을 증명한 것은 아니다.

| 항목 | W1 제안 |
| --- | --- |
| 적용 | n00C/dire_frost_wolf 일반 공격만. n00E는 별도 작업으로 남긴다. |
| 확률·배수 | 매 적격 타격 15%, 총 피해 2배. 두 값 모두 신규 웹 밸런스 제안이며 Warsmash/Warcraft III 원본값이라는 근거는 없다. |
| 수치 선택 이유 | 방어 적용 전 평균 피해가 기본 대비 15% 증가하는 출발점. 현재 base 32에서 일반 32, proc 64, 기댓값 36.8이다. 플레이 밸런스 검증은 i-4에서 수행한다. |
| 대상 | 기존 공격 adapter가 허용하는 살아 있는 적대 unit(경제 닭·조종 가능 unit), 지상/공중 구분은 기존 공격 가능 여부를 따른다. 건물·울타리·시체·아이템·동맹/자기 자신에는 치명타를 적용하지 않는다. 건물의 기본 공격은 유지한다. 중립 공격 확대는 하지 않는다. 이 제한은 웹 정책이다. |
| 발동 | cooldown 및 대상 재검사를 통과한 일반 타격 처리 시 1회 판정. 시간 경과형 buff나 시전 clock은 추가하지 않는다. |
| RNG | 치명타 전용 seeded stream을 사용하고 동일 seed·동일 적격 타격 순서에서 재현한다. seed/state를 snapshot에 노출하고 새 run/reset에서 초기화한다. UI·이동 RNG와 분리한다. Java 난수열과의 일치는 요구하지 않는다. |
| 난수 소비·경계 | 살아 있는 공격자/적격 대상/공격 가능 여부를 먼저 확인하고 그 뒤 타격당 1회 소비한다. invalid/miss/금지 대상/취소된 타격은 소비하지 않는다. 이미 판정한 뒤 damage callback이 실패하면 상태를 되감지 않고 실패를 기록한다. roll은 [0,1), roll < 0.15이면 proc, 동등값은 non-proc다. |
| 부수 효과 | 추가 고정 피해 0, 기절·buff·회피 보너스·필중 효과 없음. 이는 DataC~E 기본값 복구가 아닌 웹 설계다. |
| 중첩 | 같은 타격에는 1회만 적용. ACct 중복 등록은 효과를 추가하지 않는다. 다른 critical 효과와의 합성은 이번 범위에서 지원하지 않는다. |
| 피해 순서 | 기존 fixed-average base → 기존 difficulty damage 보정/반올림 1회 → proc 시 ×2 → 기존 target damage adapter의 방어/최소 피해/HP 처리 → 기존 death/reward. adapter 밖에서 방어를 중복 차감하지 않는다. |
| 난이도 | 모든 난이도에서 15%·2배 고정. difficulty 보정은 기존 base damage 경로에만 1회 적용한다. |
| 종료·reset | 즉시 효과이므로 지속시간은 0. dead/despawn된 공격자와 대상에는 새 판정을 하지 않는다. reset 때 RNG와 판정 카운터/중복 처리 키를 초기화한다. |
| 관측·사망 | 공격 ID·target ID·roll·proc·전달 damage·적용 성공 여부를 검사 가능하게 기록한다. 실제 HP 감소량을 확인해 전달값과 구분한다. 기존 death/reward/corpse 경로의 1회 처리 검증을 유지한다. |

W1의 승인 기록은 **공개 동작 참고 + 신규 웹 수치**로 남긴다. source의 미확정 DataA/B는 계속 미확정으로 보존하며 웹 정책 필드에만 15/2를 기록한다. 별도의 Warcraft III 설치 없이 i-3 구현 계약을 정할 수 있다. 원문 코드를 게임에 복사하지 않고 기존 TypeScript 구조에 맞춰 구현한다.

W1 채택 입력은 완료됐다. 동일 계약의 구현에는 추가 승인이 필요하지 않다. [Terra medium 실행 카드](./chicken_farm_sp10_09_i_w1_execution_plan.md)에 따라 i-3-a부터 진행한다. source 원본값의 미확정 상태는 유지한다.

## W — 기존 웹 대체 정책 승인 양식 (개별 수정이 필요한 경우)

다음 TBD는 값이 아니라 승인 전 빈칸이다. 이 양식은 W1 채택 전의 참고 양식이며 승인된 W1을 제한하지 않는다.

### 1. 적용 범위

| 승인 항목 | 승인값 |
| --- | --- |
| 적용 actor | n00C/dire_frost_wolf만, 또는 확장 rawcode 목록 (TBD) |
| n00E | 영향 없음 / 같은 계약 / 별도 후속 카드 (TBD) |
| 공격 종류·시점 | 일반 공격의 명중 damage event / 다른 시점 (TBD) |
| 허용/금지 target | 현재 웹 target category의 명시 목록 (TBD) |
| despawn/reset/death | effect 제거와 예약 damage 취소 규칙 (TBD) |

### 2. 수치·부수 효과

| 승인 항목 | 승인값 |
| --- | --- |
| proc chance | 0~100 유한 값 또는 difficulty 표 (TBD) |
| multiplier | 0 이상 유한 값 또는 difficulty 표 (TBD) |
| DataC 대응 | 없음 명시 / 유한 값·단위·순서 (TBD) |
| 기절/buff/duration | 없음 명시 / buff ID·대상·normal/hero duration (TBD) |
| DataD/E 대응 | 사용 안 함 명시 / 회피·miss 해제 규칙 (TBD) |
| stacking | 같은 공격과 다른 critical/buff의 중첩·우선순위 (TBD) |
| difficulty | chance/multiplier/bonus와 현재 enemy damage 보정의 순서 (TBD) |

### 3. 결정성·피해 순서

| 승인 항목 | 승인값 |
| --- | --- |
| RNG | simulation-scoped deterministic stream의 seed·reset/replay 규칙 (TBD) |
| RNG 소비 | invalid target, miss, proc 불가일 때 draw 여부 (TBD) |
| 경계 | roll < chance 등 동등값의 proc 여부와 roll domain (TBD) |
| 순서 | fixed-average base damage, difficulty 보정, critical multiplier, bonus, armor adapter, HP/death/reward의 순서 (TBD) |
| 사망 | critical lethal hit의 death/reward/corpse transition 정확히 1회 보장 (TBD) |
| 관측 | crit 표시/telemetry 필요 여부와 기록할 실제 damage 값 (TBD) |

## 승인 문구

> **S 승인:** 위 S manifest로 추출한 ACct 최종 artifact를 선택한 데이터셋 구현 계약으로 승인한다. map 원본과 동일하다는 주장은 artifact 증거 범위를 넘지 않는다.

> **W 승인:** 위 W의 모든 TBD를 웹 설계값으로 확정하고 n00C에만 적용한다(확장 범위가 따로 없으면). 이 값은 Warcraft III 원본 ACct 값으로 주장하지 않는다.

개별 W 양식 사용 시에는 빈 TBD를 승인으로 간주하지 않는다. 승인된 W1에는 적용하지 않는다.

## i-3 인계 기준

- S 또는 W 하나가 승인되어 모든 필수 필드가 유한값 또는 명시적 부재로 해소됨
- 적용 actor·target·RNG·damage 순서·difficulty·despawn 규칙 확정
- source 사실, 웹 설계값, test fixture 값을 서로 다른 artifact field로 분리
- i-3은 pure resolver와 test만 수정하고 runtime/browser 연결은 i-4에 남김

## 이번 카드 결과·검증

- 변경: 이 결정 게이트, i-2 상태 문서, 상위 task plan. ACct JSON에 승인된 web policy를 별도 기록하고 source 미확정 필드는 보존했다.
- 확인: W3X artifact의 A/B 미상태, Warsmash engine behavior, i-2-b 후보 부적합 기록, 현재 웹 모델의 fixed average damage와 difficulty enemy damage 보정.
- 한계: 정책 선택과 수치 승인은 사용자 권한이다. 사용자의 W1 승인 기록을 반영했으며 구현과 원본 데이터 복구는 별도 상태다.

다음 상태: **SP-10-09-i-3-a 실행 가능**. i-2/c는 웹 대체 정책 경로로 완료이며 상위 i는 구현 대기다.
