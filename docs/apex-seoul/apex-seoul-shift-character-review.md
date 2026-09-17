# 차량별 변속 특성 검증 (v4 기록)

2026-09-16 · `time-attack-v4`. [이전 v3 비교](./apex-seoul-vehicle-performance-review.md) 이후의 구현 기록이다. 이후 Raven 최종 기어와 세 차량 limiter를 조정한 현재 규칙은 `time-attack-v5`이며 [우선순위 계획](./apex-seoul-next-priority-plan.md#2026-09-16-터보-차량-red-zone-limiter-조사)을 따른다.

## 구현

Seorin 7단과 Mirae 5단의 표시 RPM 상한이 공통 상승 변속 RPM보다 낮아 마지막 기어에 도달하지 못했다. Arcade 구동계는 차량별 속도 경계로 변속하고, physical 구동계인 Raven은 기계적 RPM 기준을 유지한다. 감속 변속의 히스테리시스는 유지했다.

변속 시간·최대 토크 차단율·변속 중 과급 부하·속도 경계 여유를 `VehicleEngineProfile.shift`로 설정한다. 차량 ID 분기로 성격을 결정하지 않는다.

| 차량 | 상승 변속 시간 | 최대 토크 차단 | 변속 중 과급 부하 | 의도한 성격 |
| --- | --- | --- | --- | --- |
| Raven / NA | 0.22초 | 42% | 과급 없음 | 7,400RPM까지 사용하는 고회전 성격, 과급 재형성 지연 없음 |
| Mirae / single | 0.26초 | 50% | 입력의 12% | 회전을 더 유지하고, 변속 후 압력을 다시 쌓는 뚜렷한 끊김 |
| Seorin / twin | 0.14초 | 24% | 입력의 65% | 조금 이른 변속, 압력을 유지하는 짧고 부드러운 연결 |

과급 부하는 목표 압력 계산에만 적용하며 운전자 throttle을 바꾸지 않는다. 따라서 변속 자체가 가속 해제 드리프트를 발생시키지 않는다. 위 부하 비율은 실제 압력 유지율과 다르다.

추가로 한 physics tick에서 엔진 업데이트에 시간 간격을 두 번 전달하던 문제를 수정했다. RPM·과급·변속 타이머는 한 번만 진행하고, 속도 적분 뒤에는 시간 진행 없이 기어·fuel-cut 경계만 다시 확인한다. 이 수정으로 Raven의 가속 시간도 소폭 달라진다.

## 측정 결과

Production 설정, 평지 직선, 출발 보너스 없음, 60Hz. 80–120은 과급 압력 0에서 시작한다. 기존 가속 배율·토크 곡선은 변경하지 않았다.

| 차량 | 0–100초: v3 → v4 | 80–120초: v3 → v4 | 도달 기어: v3 → v4 |
| --- | --- | --- | --- |
| Raven | 8.0909 → 8.1500 | 4.9380 → 4.9675 | 6 → 6 |
| Seorin | 9.1682 → 9.1318 | 3.0314 → 3.0002 | 7 → 8 |
| Mirae | 10.8312 → 11.0077 | 3.5009 → 3.5858 | 5 → 6 |

별도 2→3단 고정 속도 fixture에서 60Hz 기준 Mirae는 변속 전 압력의 약 71%, Seorin은 약 91%를 유지했다. 변속 시작부터 기존 압력의 90% 회복까지 각각 약 0.45초와 0.17초였다. 이는 조건을 통제한 비교값이며 모든 속도·기어에서 동일한 수치라는 뜻은 아니다.

[성능 비교 JSON](./evidence/2026-09-16-shift-character/performance.json) · [변속·압력 검증 JSON](./evidence/2026-09-16-shift-character/shift-character.json)

## 검증 및 한계

- 30/60/120Hz에서 전 기어 순차 도달(6/8/6), 감속 후 1단 복귀, 경계 반복 변속 없음, 압력 범위, 변속 지속 시간, 단일 tick 과급 적분을 검증했다.
- 실제 Chromium WebGL에 Playwright 키 입력을 전달해 Raven 4→5, Seorin 7→8, Mirae 5→6을 확인했다. 세 시나리오 모두 충돌·드리프트·페이지 오류가 없었다. Scene update 60Hz, 화면 제출 10Hz, 입력 관측 100ms의 제어된 브라우저 시험이며 사람의 주관적 플레이테스트는 아니다.
- 코너 진입·탈출·회복·production 코너·world-line·handling 관계·최고속도·powerband·HUD·launch·속도 단위·저장 회귀와 build가 통과했다. 엔진 시간 수정에 따른 직선 수치는 별도 v4 reference에 기록했으며 과거 TSE-6 기준 파일과 허용 오차는 유지했다. Production 코너 fixture는 느려진 무입력 주행이 끝까지 도달하도록 제한 시간을 70→120초로 늘리고 종료 지점 도달을 명시적으로 검사했다.
- TypeScript 전체 검사는 기존 23종 진단으로 실패하며 수정 전후 진단 집합은 같다. 기존 저속 조향 fixture 실패도 별도 미해결 사항이다. 빌드는 chunk 크기 경고와 함께 성공했다.

[브라우저 결과](./evidence/2026-09-16-shift-character/browser-summary.json) · [Raven 5단](./evidence/2026-09-16-shift-character/raven-coupe-shift-0-exit.png) · [Seorin 8단](./evidence/2026-09-16-shift-character/seorin-gt-shift-0-exit.png) · [Mirae 6단](./evidence/2026-09-16-shift-character/mirae-gt-shift-0-exit.png)

당시 물리 변경에 맞춰 기록 규칙은 v4로 분리했다. v2/v3 기록은 보존하지만 당시 PB와 섞지 않았으며 저장·재로드 검증을 통과했다. 현재 v5는 v2/v3/v4 기록을 모두 legacy로 분리한다.

차량별 반응 차이는 확보했지만 Mirae의 성능상 이점까지 확보한 것은 아니다. 공통 225km/h 상한과 차량별 목표 최고속도 정합성, Mirae가 유리한 구간 검증은 후속이다. 차량별 핸들링 차이는 요청대로 `VehicleHandlingProfile` TODO로 유지한다.
