# SP-07 실제 맵 전투 — W3X 기준 비교

> 갱신: 2026-10-08. `닭농장1.3a.w3x` 추출 artifact와 SP-07 완료 코드·browser 검증을 대조한다. 이 문서는 원본 전투 전체의 재현 선언이 아니라, SP-08 전 차이와 재사용 가능한 계약을 고정하는 감사 기록이다.

## 대조 근거와 결론

| 근거 | 확인한 원본 사실 | 웹 SP-07 판정 |
| --- | --- | --- |
| `combat_unit_stats_reference.tsv` | 농부 `H000`, 개 `n002`, 팀버 울프 `n007`은 지상·구조물 공격 대상이며 팀버 울프는 HP 450, armor 0, speed 330, 1.35초 공격 간격, `11+1d2` 피해다. | 팀버 울프는 HP 450/armor 0/speed 330/cooldown 1.35를 보존한다. 확률 피해는 고정 13으로 변환했다. |
| `jass_wolf_order_flows.tsv` | Player(10) 늑대는 농장 영역에 `attack` 명령을 받고 60초마다 임의 지점 attack 명령을 다시 받는다. JASS에는 농부·닭·건물의 일반 우선순위가 없다. | runtime enemy의 ID·owner·HP·spawn/remove와 attack-move/repath를 구현했다. wave scheduler와 60초 refresh는 SP-08로 남는다. |
| `fence_candidate_rawcodes.tsv`, `wpm_cells.tsv` | `h003` 울타리는 4×4 pathing footprint 후보이며 방벽 계열이다. | `fence_wood`는 rawcode `h003`, 128×128(4×4) solid dynamic blocker로 변환했다. 실제 파괴 뒤 stale focus 제거·repath를 browser에서 확인했다. |
| `wolf_wave_phase_reference.tsv`, `wolf_ability_reference.tsv` | 120~3000초의 18 일반 티어 보충, 600/1500/2200/2600/3000초 보스, 능력·소환이 존재한다. | 미구현이며 SP-08(일반 wave), SP-10(보스·보상), SP-12(콘텐츠) 범위다. |

## 현재 수치·동작 차이

| 영역 | W3X | 웹 SP-07 | 영향과 처리 |
| --- | --- | --- | --- |
| 농부 `H000` | HP 220, armor 1, damage `30+1d4`, cooldown 1.5, speed 240 | HP 100, armor 0, damage 10, cooldown 0.9, speed 240 | 이동속도만 보존했다. HP·피해·cooldown은 현재 MVP 밸런스 변환이며 SP-15에서 재조정한다. |
| 개 `n002` | HP 600, armor 7, damage `35+1d2`, cooldown .95, speed 290 | HP 220, armor 2, damage 18, cooldown .8, speed 290 | 이동속도만 보존했다. 생존력·DPS는 원본과 다르며 SP-15 밸런스 항목이다. |
| 팀버 울프 `n007` | HP 450, armor 0, speed 330, cooldown 1.35, damage `11+1d2` | HP 450, armor 0, speed 330, cooldown 1.35, fixed damage 13 | 확률 주사위만 평균 고정 피해로 변환했다. |
| 울타리 `h003` | 원본 footprint/방벽 계열 | HP 200, armor 1, 128×128 blocker, 늑대 targetable | pathing 역할은 보존했다. 원본 비용·건설 시간과 완전한 대문 상태는 SP-09/SP-15에서 재검토한다. |
| 정찰 타워 계열 | `h00D` 원본 사거리 650 War3 units | `tower_scout` 사거리 384px, damage 23, fixture와 runtime 적으로 검증 | 좌표계·게임 길이에 맞춘 사거리 변환이다. 정상 생산/테크 접근은 SP-09다. |
| 목표 우선순위 | JASS에 일반 우선순위 없음 | owner·생존·시야·거리·공격선 및 건물/닭/유닛 정책 | 원본 사실이 아닌 웹 MVP 정책이다. 실제 wave 압력에서 SP-08이 재검증한다. |

## 검증 범위와 SP-08 인계

- [combat all artifact](./chicken_farm_w3x_artifacts/combat_check_all.json)는 fixture 없는 baseline, runtime 적 lifecycle, player/타워/늑대 피해, attack-move 복귀, blocker 파괴·repath, same-page restart, actual P3 통합을 통과했다. 이는 자연 wave가 아닌 명시적 fixture 검증이다.
- [blocker artifact](./chicken_farm_w3x_artifacts/combat_check_blocker.json)는 열린 우회, 밀폐 펜스의 `attack_blocker`, 펜스 제거 뒤 `repath`, 도달 불가 좌표의 유한 재시도를 기록한다.
- SP-08은 W3X의 13 spawn rect, 120초 이후 phase/tier 보충, 60초 attack refresh를 웹 world 좌표로 변환하고, normal 시작에서 자동 fixture가 생기지 않는 조건을 유지해야 한다.
- SP-09는 건물 production/tech/upgrade 접근을, SP-10은 보스·능력·보상을, SP-11은 농부 사망의 패배/재시작을, SP-13은 hidden/pause 동안 전투 시간 정책을 맡는다.

## W3X 유사성 복원 배치 검토

SP-07의 canonical HP/lifecycle·pathing·명령 모델은 원본값을 적용할 기반이므로 되돌리지 않는다. SP-08에서 모든 차이를 한꺼번에 바꾸면 wave defect와 밸런스/테크 defect를 구별할 수 없으므로, 아래처럼 원본 사실을 해당 기능 SP에 분산한다.

| 배치 | 원본과 맞출 항목 | SP-08에서 처리하지 않는 이유 |
| --- | --- | --- |
| SP-08 | 13 spawn rect의 좌표 변환, 120~3000초 phase, 일반 늑대 rawcode/tier 선택, 부족 수량 보충, 60초 `attack` refresh, wave 적의 run lifecycle | 이는 wave scheduler의 입력·시간·생성 계약이다. 일반 늑대는 우선 팀버 울프부터 phase rawcode를 보존해 생성한다. |
| SP-09 | 건물 원본 cost/build time, 요구조건, 업그레이드, tower 정상 생산 접근, gate 상태 | wave와 독립적인 건물 성장 규칙이며 현재 fixture tower의 수치를 wave와 함께 변경하면 원인 추적이 어렵다. |
| SP-10 | tier 7~18의 능력, 600~3000초 boss rawcode, 소환체, 보상/드롭, 중복 처치 방지 | 보스 능력과 보상은 단순 spawn보다 별도 lifecycle·UI·승리 조건을 요구한다. |
| SP-11 | 농부 2회 부활, 중앙 시장 귀환, 40% 자원 손실, 1분 무적, 최종 패배와 simulation lock | wave가 농부를 죽일 수 있어도 게임 종료 정책은 독립적으로 한 번만 판정돼야 한다. |
| SP-13 | hidden/pause 시 wave clock·attack cooldown·economy timer의 동결/복귀 정책 | W3X timer 유사성은 browser visibility 정책과 함께 결정해야 하며 scheduler만으로 고정하면 회귀 위험이 있다. |
| SP-15 | 농부/개/울타리/타워의 HP·armor·DPS, fixed-damage 변환, 실제 첫 wave 대응 시간 | 현재 수치 차이는 의도된 MVP 변환이다. 정상 경제·테크·wave가 연결된 뒤에만 원본 수치와 비교해 조정할 수 있다. |

따라서 SP-08의 완료 기준은 “원본 wave schedule과 spawn/rawcode를 재현 가능한 형태로 연결”하는 것이며, 원본 전투 수치·테크·보스·승패까지 같은 카드에서 완료했다고 기록하지 않는다.
