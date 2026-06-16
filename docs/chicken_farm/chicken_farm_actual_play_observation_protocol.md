# Chicken Farm Actual Play Observation Protocol

> 목적: 정적 분석으로 추정한 보스 등장 순서와 스탯 체감이 실제 플레이와 일치하는지 확인한다.

현재 작업공간에는 Warcraft III 실행 환경이나 리플레이 파일이 없다. 따라서 이 문서는 실제 플레이 관찰을 수행할 때 기록할 항목, 예상 순서, 불일치 가능성이 높은 포인트를 정리한다.

참조 산출물:

- `docs/chicken_farm_w3x_artifacts/unit_rawcode_crosscheck.tsv`
- `docs/chicken_farm_w3x_artifacts/jass_create_units.tsv`
- `docs/chicken_farm_w3x_artifacts/jass_score_events.tsv`
- `docs/chicken_farm_w3x_artifacts/jass_function_labels.tsv`
- `docs/chicken_farm_w3x_artifacts/web_mvp_balance_reference.json`

---

## 1. Static Hypothesis To Verify

정적 분석 기준 보스 관련 흐름은 다음과 같다.

| 예상 순서 | rawcode | 이름 | 생성 라인 | HP | 방어 | 속도 | 처치 점수 | 실제 관찰 상태 |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | `H012` | 블러드 울프 | 5752 | 5200 | 0 | 330 | 150 | 미관찰 |
| 2 | `H00X` | 와일드 울프 | 5786 | 8500 | 28 | 330 | 300 | 미관찰 |
| 3 | `H013` | 헬 하운드 | 5819 | 13000 | 50 | 330 | 450 | 미관찰 |
| 4 | `H01B` | 둠 가드 | 5852 | 24000 | 56 | 330 | 700 | 미관찰 |
| 5 | `H01N` | 아키몬드 | 5885 | 24000 | 55 | 330 | 미확인 | 미관찰 |
| 변환/후속 | `H01O` | 네더 드레곤 | 3488 | 36000 | 90 | 330 | 1000 | 미관찰 |

핵심 가설:

- `H01N` 아키몬드는 후반 보스 등장 메시지와 함께 직접 생성된다.
- `H01O` 네더 드레곤은 `lilili` 함수에서 사망 유닛 위치에 생성되고, 죽은 유닛 레벨을 이어받는다.
- 실제 플레이에서는 아키몬드를 잡거나 특정 조건을 만족했을 때 네더 드레곤으로 이어지는 변환/후속 보스일 가능성이 높다.
- 따라서 MVP 최종 보스는 `nether_dragon` 단독보다 `archimonde -> nether_dragon` 2단계 최종전으로 보는 편이 더 안전하다.

---

## 2. What To Record In A Real Play Session

가능하면 한 명은 플레이하고 한 명은 관찰 기록을 맡는다. 혼자 테스트할 경우 화면 녹화 후 아래 항목을 되감아 채운다.

| 기록 항목 | 예시 |
|---|---|
| elapsed time | `08:42` |
| difficulty | `normal` |
| event text | `블러드 울프가 등장했습니다.` |
| observed unit name | `블러드 울프` |
| observed model/icon | timber wolf / spirit wolf 등 |
| visible HP estimate | 실제 수치가 보이면 기록, 안 보이면 체감 단계 |
| damage feel | 낮음/보통/높음/즉사급 |
| defense feel | 빨리 녹음/보통/매우 단단함 |
| special ability | 소환, 변신, 오라, 회복, 광역 등 |
| kill text | `... 150점을 얻으셨습니다.` |
| score gained | `150` |
| next event after kill | 네더 드레곤 생성 여부 등 |

---

## 3. Playtest Checklist

### 3.1 Boss Order

확인할 순서:

1. 블러드 울프가 먼저 등장하는가?
2. 와일드 울프가 블러드 울프 이후 등장하는가?
3. 헬 하운드가 와일드 울프 이후 등장하는가?
4. 둠 가드가 헬 하운드 이후 등장하는가?
5. 아키몬드가 둠 가드 이후 등장하는가?
6. 네더 드레곤은 독립 등장인가, 아키몬드/다른 유닛 사망 후 변환인가?

불일치가 생기면 MVP JSON의 `waves.mvp.timeline`을 수정한다.

### 3.2 Stat Feel

정적 스탯 기준 체감 예측:

| 유닛 | 체감 예측 |
|---|---|
| 블러드 울프 | 첫 보스. HP는 높지만 방어가 낮아 집중 공격에 녹아야 함 |
| 와일드 울프 | HP와 방어가 모두 상승. 블러드보다 훨씬 단단해야 함 |
| 헬 하운드 | 방어 50, 쿨다운 0.85. 초기에 못 잡으면 피해 압박이 커야 함 |
| 둠 가드 | HP 24000, 방어 56. 장기전과 소환/특수 능력 압박이 있어야 함 |
| 아키몬드 | 둠 가드급 HP/방어에 능력 압박이 추가되어야 함 |
| 네더 드레곤 | HP 36000, 방어 90. 최종 단계로 가장 단단해야 함 |

실제 체감이 다르면 다음 중 하나를 의심한다.

- 난이도 선택으로 다른 rawcode 변형이 쓰임: `H018`, `H019`, `H01A`, `H01C` 등.
- 보스가 시간이 지나며 레벨업하거나 능력으로 강화됨.
- 플레이어 수에 따른 보정이 있음.
- 점수 조건과 생성 조건이 다른 유닛을 가리킴.

### 3.3 Nether Dragon Specific Check

정적 근거:

```text
line 3487: death location에 h005 계열 유닛 생성
line 3488: death location에 H01O 네더 드레곤 생성
line 3489: 새 유닛 레벨을 죽은 유닛 레벨로 설정
line 3490: roar 명령
line 3491: 죽은 유닛 제거
```

실제 확인 질문:

- 어떤 유닛이 죽을 때 네더 드레곤이 생성되는가?
- 생성 직후 레벨이 이전 유닛과 같은가?
- 네더 드레곤 처치 시 1000점 메시지가 뜨는가?
- 아키몬드 처치 메시지는 별도로 있는가, 아니면 네더 드레곤으로 이어지는가?

---

## 4. Observation Template

`docs/chicken_farm_w3x_artifacts/play_observation_template.tsv`에 같은 컬럼의 빈 템플릿을 둔다.

권장 최소 1회차:

- 난이도: normal
- 플레이어 수: 1
- 목표: 패배하지 않고 둠 가드/아키몬드/네더 드레곤 구간까지 진행
- 녹화: 가능하면 전체 화면 녹화

권장 2회차:

- 난이도: hard 또는 crazy
- 목표: 보스 rawcode 변형 가능성 확인
- 관찰 포인트: HP/방어 체감이 normal과 다르게 rawcode 변형처럼 보이는지 확인

---

## 5. How To Apply Findings

관찰 후 수정 대상:

- `docs/chicken_farm_w3x_artifacts/web_mvp_balance_reference.json`
  - `waves.mvp.timeline`
  - `units.bosses`
  - `score.mvp`
- `docs/chicken_farm_wave_shop_disease_mvp_spec.md`
  - Wave timeline
  - 최종 보스 승리 조건
  - 보스 2단계 전환 여부
- `docs/chicken_farm_w3x_analysis.md`
  - 실제 플레이 관찰 결과 요약

현재 정적 분석만 기준으로는 MVP 최종전을 `archimonde` 등장 후 `nether_dragon` 변환/후속 단계로 설계하는 것이 가장 보수적이다.
