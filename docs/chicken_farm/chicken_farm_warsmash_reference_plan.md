# Chicken Farm Warsmash Reference Plan

> 목적: `닭농장1.3a.w3x`의 원본 수치뿐 아니라 Warcraft III 엔진 위에서 느껴지는 늑대 이동, 공격, blocker 전환, 펜스 방어 감각을 Phaser MVP에 재현하기 위한 Warsmash 기반 참고 계획.

이 문서는 Warsmash 코드를 프로젝트에 복사하거나 이식하기 위한 문서가 아니다. Warsmash는 Warcraft III 에뮬레이션 엔진이므로 동작 구조와 관찰 포인트를 참고하고, Phaser 구현은 새 코드로 작성한다.

참조:

- Warsmash Mod Engine: `https://github.com/Retera/WarsmashModEngine`
- 현재 W3X 분석: `docs/chicken_farm_w3x_analysis.md`
- Phaser 구현 스펙: `docs/chicken_farm_wave_shop_disease_mvp_spec.md`
- Phaser 밸런스 데이터: `games/chicken-farm/src/game/balance.ts`
- Warsmash 동작 관찰 노트: `docs/chicken_farm_warsmash_behavior_notes.md`

---

## 1. Why Warsmash

Warsmash는 Warcraft III를 에뮬레이션하는 오픈소스 엔진이다. README 기준으로 원본 Warcraft III 자산을 포함하지 않고, 사용자가 합법적인 Warcraft III 설치 자산을 설정해야 한다. 이 프로젝트에서는 자산/코드를 가져오는 것이 아니라 다음 감각을 확인하는 데 쓴다.

- 유닛이 명령을 받았을 때 이동/공격 상태가 어떻게 전환되는가
- 목표까지 pathing이 막혔을 때 우회와 공격 전환이 어떻게 일어나는가
- 사거리, 공격 쿨다운, acquisition range가 실제 체감에 어떻게 작용하는가
- 건물/벽/blocker가 유닛 이동과 공격 우선순위에 어떤 영향을 주는가
- Warcraft III식 RTS 명령 루프를 Phaser tick 기반 시스템으로 어떻게 단순화할 것인가

---

## 2. Legal And Repository Rules

규칙:

- Warsmash 소스 코드를 이 저장소에 vendoring하지 않는다.
- AGPL-3.0 코드 조각을 Phaser 구현에 복사하지 않는다.
- 필요한 경우 외부 checkout은 `/tmp` 또는 로컬 임시 경로에 둔다.
- 이 저장소에는 관찰 노트, 의사코드, 재구현 규칙만 남긴다.
- 원본 Warcraft III 자산은 사용하지 않는다.

허용:

- 공개 README/문서 링크
- 함수/클래스 이름 수준의 참조
- 동작 흐름 요약
- 독자적으로 작성한 Phaser 상태 머신/데이터 스키마

금지:

- Warsmash 소스 파일 복사
- 원본 워3 모델/텍스처/사운드 복사
- 닭농장 JASS 원문 전문 저장
- 원본 게임을 그대로 자동 포팅하는 접근

---

## 3. Warsmash에서 확인할 핵심 영역

### 3.1 Unit Order And Behavior

확인할 것:

- move/order 명령이 현재 behavior를 어떻게 바꾸는가
- attack order와 smart order가 target을 어떻게 정하는가
- target이 죽거나 사라졌을 때 다음 target을 찾는 규칙
- stop/hold/attack-move에 해당하는 상태가 어떻게 나뉘는가

Phaser 재구현 목표:

```text
Idle
  -> AcquireTarget
  -> MoveToTarget
  -> AttackTarget
  -> RepathOrAttackBlocker
  -> AcquireTarget
```

### 3.2 Pathing And Blocker

확인할 것:

- pathing grid가 ground/building blocker를 어떻게 판정하는가
- 이동 실패 시 재경로 계산 주기
- 건물/벽이 막고 있을 때 공격 대상으로 전환되는 조건
- 유닛 collision이 좁은 길목에서 어떻게 처리되는가

Phaser 재구현 목표:

- 기본 맵은 열린 지형으로 둔다.
- 펜스와 건물만 동적 blocker로 둔다.
- 늑대가 목표까지 갈 수 없으면 가까운 blocker cell을 공격한다.
- blocker 파괴 후 즉시 목표를 재탐색한다.

### 3.3 Combat Loop

확인할 것:

- attack cooldown과 backswing/point를 단순화할 방법
- acquisition range와 attack range의 관계
- armor/damage type을 MVP에서 얼마나 버릴 수 있는가
- 다수 유닛이 같은 blocker를 때릴 때 체감이 어떤가

Phaser 재구현 목표:

- 공격은 `elapsedSec >= nextAttackAtSec`로 처리한다.
- damage type/armor type은 MVP에서는 숫자 armor로만 축약한다.
- 공격 전 windup/backswing은 애니메이션용으로만 둔다.

### 3.4 Fence-Like Object

원본에서 확인된 직접 단서:

- `war3mapImported\GreenGrass_Wall.mdx`
- `war3map.wpm`의 높은 open ground 비율
- doodad/pathing상 맵 자체가 미로형은 아님

Warsmash 참고로 확인할 것:

- 건물이 pathing map에 blocker로 반영되는 방식
- 유닛이 막힌 건물을 공격 대상으로 삼는 흐름
- 공격 가능한 blocker와 공격 불가능한 terrain doodad의 차이

Phaser 펜스 목표:

| 속성 | MVP 값 |
|---|---|
| id | `fence` |
| pathing | 1 grid cell blocker |
| hp | 70~100 |
| armor | 0 |
| build cost | 15~25 coins |
| targetableByWolves | true |
| repair | MVP 후순위 |

---

## 4. Chicken Farm Specific Translation

### 4.1 Wolf Target Priority

원본 감각을 위한 우선순위:

1. 공격 가능한 수익 건물
2. 가까운 닭/가축 역할 오브젝트
3. 방어 유닛
4. 농부/핵심 건물
5. 경로를 막는 펜스/건물 blocker

주의: blocker가 항상 최우선이면 늑대가 농장으로 파고드는 감각이 약해진다. 목표는 농장 내부의 가치 오브젝트로 두고, blocker 공격은 경로 실패 후 전환으로 둔다.

### 4.2 Wolf Movement Pattern

Phaser용 의사 규칙:

```text
if target exists and path is open:
  move toward target
else if target exists and path is blocked:
  if blocker found near path:
    attack blocker
  else:
    repath after short delay
else:
  acquire nearest valuable target
```

튜닝값:

| 항목 | 값 |
|---|---:|
| repath interval | 0.5 sec |
| target acquire interval | 0.35 sec |
| blocker search radius | 2~3 grid cells |
| give-up-to-blocker time | 1.0 sec |
| ordinary wolf speed | 108~115 px/s |

### 4.3 Attack Pattern

Phaser용 의사 규칙:

```text
if distance <= attackRange:
  stop movement
  if elapsedSec >= nextAttackAtSec:
    apply damage
    nextAttackAtSec = elapsedSec + attackCooldownSec
else:
  move into range
```

원본의 공격 point/backswing까지 완전 재현하지 않는다. 대신 다음 체감만 살린다.

- 늑대가 사거리 안에 들어오면 이동을 멈추고 물어뜯는다.
- target이 사라지면 바로 멍하니 있지 않고 다음 목표를 찾는다.
- 펜스가 버티는 동안 농장 내부가 잠깐 숨 쉴 시간을 얻는다.

---

## 5. Proposed Artifacts

Warsmash 트랙에서 만들 산출물:

| 파일 | 목적 |
|---|---|
| `docs/chicken_farm_warsmash_reference_plan.md` | 현재 문서 |
| `docs/chicken_farm_warsmash_behavior_notes.md` | Warsmash 코드/동작 관찰 요약 |
| `docs/chicken_farm/chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv` | 원본 데이터에서 벽/펜스/방어 건물 후보 분리 |
| `games/chicken-farm/src/game/ai.ts` | Phaser용 늑대 target acquisition/behavior 구현 후보 |
| `games/chicken-farm/src/game/pathing.ts` | grid blocker/repath/blocker attack 구현 후보 |

---

## 6. Immediate Next Steps

1. 완료: Warsmash 외부 checkout을 `/tmp/WarsmashModEngine`에 두고 관련 클래스/패키지 이름을 조사했다.
2. 완료: 조사 결과를 `docs/chicken_farm_warsmash_behavior_notes.md`에 요약했다.
3. 완료: 원본 `unit_rawcode_crosscheck.tsv`와 `doo_*` 산출물에서 펜스/벽/방어 건물 후보를 `docs/chicken_farm/chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv`로 분리했다.
4. Phaser MVP에는 Warsmash식 동작을 축약한 `Acquire -> Move -> Attack -> RepathOrAttackBlocker` 상태 머신을 구현한다.

완료 기준:

- 원본과 유사하게 늑대가 열린 지형에서 농장 목표로 접근한다.
- 펜스가 경로를 막으면 우회하거나 공격한다.
- 펜스가 무너지면 늑대가 내부 목표로 다시 들어간다.
- 공격 쿨다운/속도/HP가 `balance.ts`와 맞물려 10~15분 세션 안에서 압박감을 만든다.
