# Apex Seoul Downhill Drift Direction

갱신일: 2026-07-13

## 게임의 한 문장

**서울 야간 산길을 고속 grip과 짧고 조절 가능한 drift로 내려가는 pseudo-3D 아케이드 레이서.**

`Bugak Ridge Downhill`은 실제 도로의 1:1 재현이 아니라, 긴 내리막·연속 코너·도시 전망·짧은 회복 직선을 게임용 리듬으로 재구성한 fictional course다.

## 화면/코스 원칙

- 차량은 화면 하단의 안정적인 조작 기준점이다.
- 커브와 고저차는 도로 원근, roadside flow, horizon/pitch로 먼저 읽힌다.
- 차량의 큰 상하 이동이나 지속적인 zoom은 사용하지 않는다.
- black/blue 야간 팔레트, 푸른 반사광, 먼 도시 불빛을 기본 방향으로 둔다.
- road-side object는 장식보다 속도와 코너 진입 시점을 전달하는 장치다.

## 주행 상태

| 상태 | 역할 | 화면 표현 |
| --- | --- | --- |
| Grip | 기본 고속 주행과 easy bend | center / steer-1 pose |
| Setup | brake 또는 throttle lift 뒤의 준비 | 약한 pose, traction 저하 |
| Drift | 코너 바깥으로 흐르는 momentum | steer-2 pose, drift shadow |
| Counter trim | 반대 조향으로 각도와 라인 조절 | 진입 방향 pose 유지, steer-2 → steer-1 완화 |
| Counter transition | lift 후 재가속으로 S 코너 반대 drift 연결 | 반대 pose로 한 번만 전환 |
| Recovery | 입력 해제, 저속, 커브 종료 뒤 정렬 | grip pose로 부드럽게 복귀 |

## drift 결정

- `driftDirection`은 차체가 향하는 방향이고, 실제 steering/lateral movement와 분리한다.
- counter만으로는 방향을 반전하지 않는다. 기존 drift momentum과 angle을 줄이는 입력이다.
- 반대 drift는 **counter 유지 → throttle lift → 재가속**일 때만 commit한다.
- drift는 모든 코너의 정답이 아니다. easy bend는 grip이 빠르고, sharp bend와 S 구간에서만 drift가 라인 선택지가 된다.

## 현재 판단

drift는 플레이 가능한 수준(약 70점)에 도달했다. 다음 문제는 drift 자체가 아니라 다음 두 가지다.

1. 고속 구간이 오래 유지되어 FOV/shader가 상시 최고 상태처럼 보인다.
2. straight와 corner의 평균 속도 및 lateral offset 사용량 차이가 작아 라인 선택의 압력이 약하다.

따라서 다음 구현은 드리프트 확장이 아니라 speed cue와 corner/line economy다.

## 수용 기준

- easy bend에서 grip이 불필요하게 감속되지 않는다.
- sharp bend에서 늦은 turn-in, 과한 조향, 나쁜 탈출은 분명한 손실을 만든다.
- drift entry는 강하지만 옆으로 순간이동하지 않는다.
- counter trim은 기존 drift 방향을 유지하며 line만 조절한다.
- S 전환은 명시적인 lift/re-accel 입력에서만 한 번 일어난다.
