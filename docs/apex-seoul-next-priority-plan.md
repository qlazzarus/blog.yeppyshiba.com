# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-13

## 현재 기준

`Bugak Ridge Downhill`의 고속 grip 주행과 의도적인 drift/counter-steer는 플레이 가능한 기반까지 도달했다. 드리프트 감각은 약 70점으로 유지하고, 다음 반복의 중심은 **속도감**과 **라인 선택이 있는 코너링**이다.

## 실행 순서

1. **속도 cue 재설계**
   - 저속·순항·최고속이 서로 다른 화면 밀도를 갖게 한다.
   - 상시 shader/FOV가 아니라 throttle, 내리막, drift 탈출 때의 짧은 burst를 쓴다.
   - guardrail reflector, chevron, 도시 불빛의 근거리 통과 흐름을 보강한다.
2. **코너 속도 예산과 라인 선택**
   - easy bend는 grip으로 빠르게 통과한다.
   - sharp bend는 진입 위치, 조향량, 짧은 drift, 탈출 정렬에 따라 속도 회복을 달리한다.
   - 단순 curve 상한 감속보다 라인과 입력을 우선한다.
   - 구현됨: `cornerLineQuality`에 따라 안쪽 라인은 속도 상한/감속을 보상하고, 바깥 라인은 손실을 키운다. 실제 주행 telemetry로 라인 방향과 수치를 확인한다.
3. **코스 리듬/road-side cue**
   - grip → drift → S 전환 → 회복 직선을 의도적으로 배치한다.
   - 코너 진입 전 표지, 반사판, 가드레일로 위험도를 읽게 한다.
4. **주행 피드백**
   - brake, drift entry, counter trim, drift exit에 tail light, shadow, smoke/glow, RPM cue를 연결한다.
5. **게임 루프**
   - checkpoint/time attack, 기록, 결과 화면.
   - AI, 교통, 충돌, 차량 선택은 이후 단계다.

## 당장 하지 않을 것

- drift 물리를 시뮬레이터 수준으로 확장
- 항상 켜진 강한 drift pose
- AI/교통/충돌을 통한 난이도 추가
- 차량 수 확장

## 다음 검증 지표

- straight/corner 평균 속도와 speed cue의 대비
- corner별 lateral offset 사용률과 entry/exit speed
- roadside object pass rate
- brake-to-drift 성공률, counter trim 유지 시간, drift exit 후 1초 가속 회복량
