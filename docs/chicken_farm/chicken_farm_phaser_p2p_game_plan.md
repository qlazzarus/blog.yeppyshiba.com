# Phaser 기반 양계장 디펜스 P2P 게임 기획안

> 작업명: **양계장 디펜스 P2P**  
> 참고 방향: 워크래프트3 유즈맵 `닭농장1.3a.w3x`의 **룰 감각과 플레이 루프만 분석**  
> 구현 방향: Phaser 기반 오리지널 웹 게임  
> 멀티 방식: **중간 게임 서버 없는 WebRTC 수동 Offer/Answer 방식**  
> 배포 목표: 친구끼리 브라우저에서 접속해서 가볍게 플레이 가능한 실시간 협동/경쟁 게임

---

## 1. 프로젝트 방향성

이 프로젝트는 워크래프트3 유즈맵 `닭농장1.3a.w3x`를 자동 포팅하거나 원본 에셋을 재사용하는 프로젝트가 아니다.

핵심 방향은 다음과 같다.

1. 기존 유즈맵의 게임 감각을 분석한다.
2. 유의미한 스크립트, 수치, 웨이브 구조, 생산 루프를 참고한다.
3. Phaser 기반으로 완전히 새 게임을 구현한다.
4. 그래픽, 사운드, UI, 이름, 아이콘은 새로 창작한다.
5. 친구끼리 플레이할 수 있도록 별도 중간 게임 서버 없이 WebRTC P2P 방식으로 구현한다.

즉, 이 프로젝트의 성격은 **원본 맵 복제**가 아니라 **추억의 유즈맵 감각을 현대 웹 게임으로 재해석하는 오리지널 구현**이다.

---

## 2. 원본 맵 활용 원칙

### 2.1 허용하는 활용

`닭농장1.3a.w3x` 파일은 다음 목적에 한해 참고한다.

- 게임 루프 분석
- 자원 생산 주기 파악
- 닭, 알, 늑대, 건물의 관계 파악
- 웨이브 시작 시간과 난이도 상승 구조 참고
- 플레이어가 초반에 어떤 선택을 하게 되는지 분석
- 타워, 울타리, 우물, 농장 등 시스템 간 상호작용 파악
- JASS 스크립트나 오브젝트 데이터에서 의미 있는 상수값 추출

### 2.2 금지하는 활용

다음은 하지 않는다.

- 원본 맵 자동 포팅
- 원본 에셋 사용
- 원본 아이콘, 모델, 사운드, UI 사용
- 원본 게임명 그대로 사용한 공개 배포
- 원본 스크립트 코드의 직접 복사
- 보호/난독화된 맵을 강제로 우회하여 복호화하는 방식

맵이 보호되어 있거나 스크립트 추출이 어렵다면, 강제로 우회하지 않고 실제 플레이 관찰과 공개된 설명을 바탕으로 룰을 재구성한다.

### 2.3 추출 분석 참조

현재 `docs/닭농장1.3a.w3x`는 표준 MPQ 해시 기반으로 일부 내부 파일 추출이 가능하다. 분석 결과와 참고 수치는 [닭농장 1.3A W3X 추출 분석 노트](./chicken_farm_w3x_analysis.md)를 기준으로 삼는다.

기획 수치 중 원본 분석에 근거한 항목:

| 항목 | 원본 분석 기준 | MVP 반영 |
|---|---:|---|
| 첫 늑대 안내 | 80초 | 첫 웨이브 60~80초 테스트 |
| 닭 생산 주기 | 30초 | 알/수익 생산 주기 30초 |
| 닭 등급별 수익 | 70 / 110 / 170 | 등급별 생산량 배율 참고 |
| 난이도 단계 | 쉬움~언리미트 8단계 | MVP는 쉬움/보통/어려움 3단계 |
| 점수 보너스 | 100~1000점 | 엘리트/보스 보너스 감각만 축소 반영 |

---

## 3. 게임 콘셉트

### 3.1 한 줄 설명

플레이어들이 각자의 양계장을 운영하며 닭을 키우고, 알을 팔거나 부화시키고, 울타리와 타워를 지어 밤마다 몰려오는 늑대를 막는 실시간 생존형 농장 디펜스 게임.

### 3.2 핵심 재미

- 초반 닭 수를 늘릴지, 방어를 먼저 지을지 선택하는 긴장감
- 알을 팔아 골드를 얻을지, 부화시켜 닭을 늘릴지 고민하는 경제 루프
- 늑대 웨이브가 올수록 방어선이 무너지는 압박감
- 친구끼리 서로의 농장 상황을 보며 돕거나 경쟁하는 재미
- 짧은 시간 안에 판단을 계속 요구하는 실시간 운영감

### 3.3 플레이 타임과 테스트 배속

현재 내부 테스트 방향은 기존 닭농장 체험에 더 가깝게 맞추는 것이다. 따라서 기본 세션은 원본 장기 타이머를 유지하고, 빠른 검증은 별도 테스트 배속으로 해결한다.

기준:

- 기본 프로파일: 원본에 가까운 50분 이상 장기 세션
- 빠른 테스트 프로파일: 같은 타임라인을 `timeScale`로 압축
- 밸런스 데이터는 원본 초 단위를 기준으로 기록하고, 런타임에서 `effectiveDeltaSec = realDeltaSec * timeScale`로만 가속한다.

권장 테스트 배속:

| 프로파일 | timeScale | 용도 |
|---|---:|---|
| `original` | 1x | 최종 체감/장기 밸런스 검증 |
| `fast` | 3x | 50분 타임라인을 약 17분에 검증 |
| `smoke` | 10x | 웨이브 순서, 보스 생성, 질병/경제 이벤트 빠른 확인 |

---

## 4. 주요 게임 루프

```text
게임 시작
  ↓
농부 배치 / 시작 닭 지급
  ↓
닭이 주기적으로 알 생산
  ↓
알 판매 또는 부화 선택
  ↓
자원으로 울타리 / 타워 / 우물 / 농장 건설
  ↓
일정 시간 후 늑대 웨이브 시작
  ↓
늑대가 울타리, 닭, 농부를 공격
  ↓
방어 성공 시 보상 획득
  ↓
다음 웨이브 강화
  ↓
최후 생존 또는 제한 시간 종료
  ↓
점수 정산
```

---

## 5. 게임 모드

### 5.1 MVP 모드: 원본 근접 8인 생존전

- 최대 8인 접속을 1차 내부 테스트 목표로 둔다.
- 각자 독립된 농장 구역 보유
- 늑대 웨이브는 공통 시간 기준으로 발생
- 각 플레이어는 자신의 농장을 방어
- 점수 기준으로 순위 산정
- 네트워크/성능 부담 때문에 실제 공개 테스트는 2~4인으로 시작할 수 있지만, 데이터 구조와 맵 슬롯은 8인을 기준으로 잡는다.

### 5.2 추후 확장 모드

- 협동 모드: 하나의 큰 농장을 함께 방어
- 팀전 모드: 2 vs 2 농장 방어 경쟁
- 무한 웨이브 모드: 죽을 때까지 생존
- 타임어택 모드: 15분 동안 최고 점수 경쟁
- 커스텀 룰: 시작 닭 수, 웨이브 속도, 맵 크기 조절

---

## 6. 핵심 오브젝트

### 6.1 플레이어 / 농부

농부는 플레이어의 조작 캐릭터다.

역할:

- 이동
- 건물 건설
- 닭 구매 또는 배치
- 알 수집
- 수리
- 간단한 공격 또는 밀치기

MVP에서는 농부가 직접 전투를 강하게 수행하지 않도록 한다. 전투의 핵심은 타워와 울타리, 경제 운영에 둔다.

### 6.2 닭

닭은 게임의 핵심 생산 유닛이다.

역할:

- 일정 시간마다 알 생산
- 늑대의 주요 공격 대상
- 많이 보유할수록 경제력이 상승
- 방어가 부족하면 대량 손실 발생

기본 속성 예시:

```json
{
  "id": "chicken_basic",
  "name": "기본 닭",
  "hp": 30,
  "moveSpeed": 40,
  "eggIntervalSec": 30,
  "eggAmount": 1,
  "buyCostGold": 30
}
```

### 6.3 알

알은 판매하거나 부화시킬 수 있는 중간 자원이다.

선택지:

- 판매: 즉시 골드 획득
- 부화: 일정 시간 후 닭 증가

이 선택이 초반 운영의 핵심이 된다.

예시:

```json
{
  "id": "egg_basic",
  "sellGold": 10,
  "hatchTimeSec": 20,
  "hatchResult": "chicken_basic"
}
```

### 6.4 울타리

울타리는 늑대의 이동을 막는 기본 방어 건물이다.

역할:

- 늑대 경로 차단
- 농장 내부 보호
- 타워가 공격할 시간을 벌어줌
- 수리 가능

예시:

```json
{
  "id": "fence_wood",
  "name": "나무 울타리",
  "hp": 100,
  "costWood": 5,
  "buildTimeSec": 2,
  "repairCostWood": 1
}
```

### 6.5 타워

타워는 늑대를 공격하는 자동 방어 건물이다.

역할:

- 사거리 내 늑대 자동 공격
- 업그레이드 가능
- 울타리와 조합되어 방어선 형성

예시:

```json
{
  "id": "tower_basic",
  "name": "감시 타워",
  "hp": 150,
  "costGold": 20,
  "costWood": 15,
  "damage": 5,
  "range": 130,
  "attackCooldownMs": 900,
  "targetPriority": "nearest"
}
```

### 6.6 우물

우물은 농장 유지와 회복을 담당한다.

역할:

- 주변 닭 또는 건물 회복
- 농장 운영 안정화
- 초반 경제와 방어 사이의 선택지를 제공

MVP에서는 우물의 효과를 단순화한다.

예시:

```json
{
  "id": "well_basic",
  "name": "우물",
  "costGold": 30,
  "costWood": 20,
  "healRange": 120,
  "healPerSec": 1
}
```

### 6.7 늑대

늑대는 메인 적 유닛이다.

역할:

- 웨이브 단위로 출현
- 울타리, 닭, 농부를 공격
- 시간이 지날수록 체력/공격력/숫자 증가

예시:

```json
{
  "id": "wolf_basic",
  "name": "늑대",
  "hp": 40,
  "damage": 5,
  "moveSpeed": 55,
  "attackCooldownMs": 1000,
  "score": 10
}
```

---

## 7. 경제 시스템

### 7.1 자원

MVP 기준 자원은 3개로 시작한다.

| 자원 | 용도 |
|---|---|
| 골드 | 닭 구매, 타워 건설, 업그레이드 |
| 나무 | 울타리, 타워, 수리 |
| 알 | 판매 또는 부화 |

### 7.2 초반 의사결정

초반에는 다음 선택지가 경쟁해야 한다.

- 닭을 늘려 경제력을 키운다.
- 알을 팔아 빠르게 타워를 짓는다.
- 울타리를 먼저 지어 늑대 접근을 막는다.
- 우물로 장기 생존을 준비한다.

좋은 밸런스는 “한 가지 정답 빌드”가 아니라, 상황과 친구들의 플레이 스타일에 따라 선택이 갈리는 구조다.

---

## 8. 웨이브 시스템

### 8.1 기본 구조

- 게임 시작 후 80초부터 첫 늑대 웨이브 발생
- 이후 30~45초마다 웨이브 발생
- 시간이 지날수록 늑대 수, 체력, 공격력 증가
- 일정 웨이브마다 특수 늑대 등장 가능

예시:

```json
{
  "startSec": 80,
  "intervalSec": 35,
  "waves": [
    { "wave": 1, "wolf": "wolf_basic", "count": 3, "hpMultiplier": 1.0, "damageMultiplier": 1.0 },
    { "wave": 2, "wolf": "wolf_basic", "count": 5, "hpMultiplier": 1.1, "damageMultiplier": 1.0 },
    { "wave": 3, "wolf": "wolf_basic", "count": 7, "hpMultiplier": 1.2, "damageMultiplier": 1.1 }
  ]
}
```

### 8.2 난이도 설계

MVP에서는 다음 기준으로 조정한다.

- 초보자도 첫 3웨이브는 버틸 수 있어야 한다.
- 5웨이브부터 방어선 구성이 중요해진다.
- 8웨이브 이후에는 닭 경제가 충분하지 않으면 버티기 어렵다.
- 10웨이브 이후는 점수 경쟁 구간으로 본다.

---

## 9. 점수 시스템

점수는 다음 요소로 구성한다.

| 항목 | 점수 |
|---|---:|
| 늑대 처치 | +10 |
| 특수 늑대 처치 | +30 |
| 생존 시간 10초당 | +5 |
| 보유 닭 1마리당 최종 보너스 | +20 |
| 보유 골드 최종 보너스 | +소량 |
| 농부 사망 | -100 |
| 닭 사망 | -5 |

MVP에서는 점수 승리와 생존 승리를 함께 사용한다.

- 제한 시간까지 생존한 플레이어 중 점수 1등 승리
- 모든 플레이어가 사망하면 가장 오래 버틴 플레이어 승리

---

## 10. 멀티플레이 방향

## 10.1 방식 A: 완전 수동 WebRTC Offer/Answer

중간 게임 서버 없이 플레이어끼리 직접 연결한다.

기본 흐름:

```text
1. 방장이 방 생성
2. 방장 브라우저가 WebRTC Offer 생성
3. 방장이 Offer 코드를 복사해서 친구에게 전달
4. 친구가 참가 화면에 Offer 코드 붙여넣기
5. 친구 브라우저가 Answer 코드 생성
6. 친구가 Answer 코드를 방장에게 전달
7. 방장이 Answer 코드 붙여넣기
8. P2P 연결 완료
9. 게임 시작
```

전달 수단은 카카오톡, 디스코드, 메신저, 음성 채팅 등 외부 수단을 사용한다.

이 방식에서는 별도의 로비 서버, 매칭 서버, 게임 서버를 만들지 않는다.

---

## 10.2 장점

- 서버 비용 없음
- 백엔드 없이 정적 호스팅만으로 배포 가능
- 친구끼리 가볍게 테스트 가능
- 개인 프로젝트/MVP로 부담이 작음
- Cloudflare Pages, GitHub Pages 같은 정적 배포와 잘 맞음

---

## 10.3 단점

- Offer/Answer 코드를 직접 주고받아야 하므로 UX가 불편함
- NAT 환경에 따라 연결 실패 가능
- 브라우저/네트워크 환경 영향을 받음
- 방장이 나가면 게임 유지가 어려움
- 방장 브라우저가 사실상 호스트 역할을 하므로 방장에게 부하가 집중됨

---

## 10.4 네트워크 모델

MVP에서는 **Host Authoritative P2P** 방식을 사용한다.

```text
방장 브라우저
  - 전체 게임 시뮬레이션 기준
  - 웨이브 생성
  - 늑대 AI 계산
  - 충돌/공격 판정
  - 자원/점수 판정
  - 주기적으로 상태 전송

참가자 브라우저
  - 입력 명령 전송
  - 방장 상태를 받아 화면 반영
  - 예측 처리는 최소화
```

참가자는 직접 게임 상태를 결정하지 않고, 명령만 보낸다.

예시 명령:

```json
{
  "type": "BUILD_REQUEST",
  "playerId": "p2",
  "buildingId": "fence_wood",
  "x": 12,
  "y": 8,
  "clientTick": 4210
}
```

방장이 검증 후 전체 상태에 반영한다.

방장 상태 브로드캐스트 예시:

```json
{
  "type": "STATE_SNAPSHOT",
  "serverTick": 4230,
  "players": [],
  "chickens": [],
  "wolves": [],
  "buildings": [],
  "resources": {},
  "scores": {}
}
```

---

## 10.5 통신 채널

WebRTC DataChannel은 목적별로 2개를 고려한다.

### reliable 채널

중요한 게임 명령을 전달한다.

- 건설 요청
- 판매 요청
- 부화 요청
- 수리 요청
- 게임 시작
- 준비 완료
- 결과 정산

### fast 채널

손실되어도 큰 문제가 없는 데이터를 전달한다.

- 커서 위치
- 핑 표시
- 간단한 감정표현
- 선택 표시

MVP에서는 reliable 채널 하나만 사용해도 된다.

---

## 10.6 동기화 주기

MVP 권장값:

| 항목 | 값 |
|---|---:|
| 시뮬레이션 tick | 20 tick/s |
| 상태 스냅샷 전송 | 5~10회/s |
| 명령 처리 | 즉시 큐 반영 |
| 핑 측정 | 2초마다 |

처음에는 부드러운 실시간 액션보다 **일관된 게임 상태**를 우선한다.

---

## 11. Phaser 구현 구조

### 11.1 기술 스택

- Phaser
- TypeScript
- Vite
- React 선택 적용
- WebRTC DataChannel
- 정적 배포: Cloudflare Pages 또는 GitHub Pages

React는 필수는 아니지만 다음 영역에 사용하면 좋다.

- 메인 메뉴
- 방 생성/참가 화면
- Offer/Answer 복사 UI
- 결과창
- 설정 화면

게임 본체는 Phaser Scene에서 처리한다.

---

## 11.2 폴더 구조 예시

```text
chicken-farm-defense/
  package.json
  vite.config.ts
  src/
    main.ts
    app/
      App.tsx
      routes/
        HomePage.tsx
        HostRoomPage.tsx
        JoinRoomPage.tsx
    game/
      PhaserGame.ts
      scenes/
        BootScene.ts
        PreloadScene.ts
        MenuScene.ts
        FarmScene.ts
        ResultScene.ts
      entities/
        Farmer.ts
        Chicken.ts
        Egg.ts
        Wolf.ts
        Building.ts
      systems/
        EconomySystem.ts
        BuildSystem.ts
        ChickenSystem.ts
        EggSystem.ts
        WaveSystem.ts
        TowerSystem.ts
        EnemyAISystem.ts
        ScoreSystem.ts
        NetworkSystem.ts
      network/
        WebRtcHost.ts
        WebRtcClient.ts
        MessageTypes.ts
        SnapshotSerializer.ts
      data/
        units.json
        buildings.json
        waves.json
        balance.json
      utils/
        Grid.ts
        MathUtil.ts
        Random.ts
        EventBus.ts
    assets/
      sprites/
      audio/
      ui/
```

---

## 12. 맵 구조

MVP에서는 타일 기반 2D 탑다운 맵을 사용한다. 원본과 유사한 2D 농장 배치, 시작 위치, 외곽 스폰, 정적 장애물, 거미/중립 유닛 배치를 유지하려면 Phaser Tilemap 기반이 가장 안전하다.

### 12.1 맵 구성

- 플레이어별 농장 구역
- 중앙 또는 외곽 늑대 스폰 지점
- 건설 가능 영역
- 건설 불가 영역
- 길 또는 자연 장애물
- 원본 참조 거미/중립 유닛 배치
- 장식/장애물 레이어

### 12.2 8인 기준 배치 방향

```text
+---------------------------------------+
| P5 농장       | P3 농장       | P7 농장 |
|               |               |         |
| P10 농장      |  중앙/공통 압박 | P8 농장 |
|               |               |         |
| P9 농장       | P6 농장       | P1/P2  |
+---------------------------------------+
```

원본 시작 좌표는 `map_start_locations.tsv`를 기준으로 하되, 8인 테스트에서는 슬롯 0~7을 우선 사용한다. 원본에는 10개 유저 슬롯이 확인되지만, 브라우저 P2P 내부 테스트의 현실적인 상한은 8명으로 잡는다.

MVP에서는 농장 구역을 완전히 분리한 대칭 맵보다, 원본 시작 위치의 거리감과 외곽 스폰 압박을 더 살린 단일 공유 맵을 우선한다. 공정성 문제가 크면 이후 테스트 전용 대칭 맵을 별도 프리셋으로 둔다.

### 12.3 Phaser Tilemap 검토

결론: 원본 근접 테스트 프로파일은 Phaser Tilemap 사용을 권장한다.

| 선택지 | 장점 | 단점 | 판단 |
|---|---|---|---|
| 수동 좌표/도형 맵 | 빠르게 시작 가능, 의존 구조 단순 | 원본형 지형/장애물/장식 레이어가 커질수록 관리가 어려움 | smoke prototype에만 적합 |
| Phaser Tilemap | 타일 레이어, collision layer, object layer, spawn marker 관리가 자연스러움 | Tiled/JSON 파이프라인과 좌표 변환 규칙이 필요 | 원본 근접 MVP 기본값 |
| 완전 절차 생성 | 반복 테스트와 대칭성 확보 쉬움 | 원본 농장 배치 감각이 약해짐 | 후속 커스텀 모드 후보 |

권장 Tilemap 레이어:

| 레이어 | 용도 |
|---|---|
| `ground` | 잔디/흙/길 등 시각 타일 |
| `buildable` | 플레이어 건설 가능 여부 |
| `collision_static` | 바위, 절벽, 물, 장식 장애물 |
| `farm_zones` | 플레이어별 농장/시작 권역 |
| `spawns` | 늑대 외곽 스폰, 보스 스폰, 거미/중립 배치 |
| `decor` | 직접 충돌하지 않는 장식 |

거미 배치:

- `unit_rawcode_crosscheck.tsv` 기준 거미 후보는 `n01B` 독 거미, `n01C` 독 거미 새끼, `n01D` 거미다.
- 원본과 동일한 경험을 원하면 거미를 단순 장식이 아니라 중립/지역 위험 요소로 둔다.
- 좌표는 별도 산출물로 분리한다. 우선 `jass_create_units.tsv`, `unit_rawcode_crosscheck.tsv`, 필요하면 추가 파서로 unit placement를 보완한다.
- 구현에서는 `spawns` object layer에 `type: "spider"`와 `sourceRawcode`를 남기고, 에셋은 새로 제작한다.

---

## 13. w3x 분석 계획

### 13.1 목적

원본 맵을 그대로 옮기는 것이 아니라, 다음 항목을 참고하기 위해 분석한다.

- 시작 자원
- 시작 닭 수
- 닭 생산 주기
- 알 판매 가치
- 알 부화 시간
- 늑대 첫 등장 시간
- 웨이브 간격
- 늑대 체력/공격력 증가 방식
- 건물 가격
- 타워 사거리/공격 속도 감각
- 게임 종료 조건

---

## 13.2 추출 대상 파일

`.w3x` 내부에서 다음 파일을 우선 확인한다.

| 파일 | 목적 |
|---|---|
| war3map.j | JASS 트리거/타이머/웨이브/게임 로직 확인 |
| war3map.wts | 문자열 테이블, 유닛/건물 이름 확인 |
| war3map.w3i | 맵 기본 정보 확인 |
| war3map.w3u | 커스텀 유닛 데이터 확인 |
| war3map.w3a | 커스텀 능력 데이터 확인 |
| war3map.w3t | 아이템 데이터 확인 |
| war3mapUnits.doo | 배치 유닛/오브젝트 확인 |

---

## 13.3 분석 결과물

분석 결과는 다음 JSON으로 재정리한다.

```text
data/extracted/
  original_summary.md
  original_units_summary.json
  original_buildings_summary.json
  original_waves_summary.json
  original_triggers_summary.md
```

이 파일들은 직접 구현에 복사해 넣는 것이 아니라, 밸런스 참고 자료로만 사용한다.

최종 게임 데이터는 별도 파일로 관리한다.

```text
data/game/
  units.json
  buildings.json
  waves.json
  economy.json
  scoring.json
```

---

## 13.4 스크립트 분석 시 주의점

JASS 스크립트에서 다음 패턴을 찾는다.

- TimerStart
- CreateUnit
- UnitAddAbility
- SetPlayerState
- GetTriggerUnit
- TriggerRegisterTimerEvent
- TriggerRegisterUnitEvent
- IssuePointOrder
- SetUnitLifeBJ
- AdjustPlayerStateBJ

단, 원본 함수를 그대로 이식하지 않고 다음 식으로 의미만 정리한다.

예시:

```text
원본에서 80초 후 늑대 생성 트리거 확인
→ Phaser WaveSystem의 firstWaveDelaySec = 80 으로 참고
```

```text
원본에서 닭이 특정 주기로 알 생성
→ Phaser ChickenSystem의 eggIntervalSec 후보값으로 참고
```

---

## 14. MVP 범위

### 14.1 1차 MVP: 원본 근접 로컬 시뮬레이션

목표는 원본 감각의 최소 게임 루프를 검증하는 것이다. 1차는 네트워크 없이도 8개 슬롯, 원본형 타임라인, Tilemap 배치, 늑대/거미/펜스 상호작용을 로컬에서 돌릴 수 있어야 한다.

포함:

- Phaser 프로젝트 생성
- Phaser Tilemap 기반 탑다운 맵
- 8개 플레이어 슬롯/시작 위치
- 농부 이동
- 닭 배치
- 알 자동 생산
- 알 판매
- 알 부화
- 울타리 건설
- 타워 건설
- 늑대 웨이브
- 거미/중립 위험 요소 배치
- 타워 자동 공격
- 늑대가 울타리/닭 공격
- 테스트 배속 설정
- 점수 계산
- 게임 오버

제외:

- 멀티플레이
- 복잡한 업그레이드
- 고급 AI
- 예쁜 그래픽
- 모바일 대응

---

### 14.2 2차 MVP: 수동 WebRTC 멀티

포함:

- 방장 모드
- 참가자 모드
- Offer/Answer 복사 UI
- P2P 연결
- 플레이어 입장/준비
- 방장 기준 게임 시작
- 참가자 명령 전송
- 방장 상태 브로드캐스트
- 2인 플레이 검증
- 데이터 구조는 8인까지 확장 가능한 형태로 유지

---

### 14.3 3차 MVP: 친구 테스트 버전

포함:

- 2~8인 플레이
- 결과창
- 점수판
- 간단한 사운드
- 기본 픽셀 아트 또는 임시 창작 에셋
- 밸런스 조정
- Cloudflare Pages 배포

---

## 15. 초기 밸런스 초안

초기 기획값은 아래와 같았다. 이후 W3X 분석을 통해 원본 참조값과 MVP 변환값을 별도 산출물로 분리했다.

```json
{
  "game": {
    "maxPlayers": 4,
    "targetPlayTimeMin": 15,
    "firstWaveDelaySec": 80,
    "waveIntervalSec": 35
  },
  "start": {
    "gold": 50,
    "wood": 30,
    "chickens": 3
  },
  "economy": {
    "eggSellGold": 10,
    "eggHatchTimeSec": 20,
    "chickenEggIntervalSec": 30
  },
  "buildings": {
    "fence": {
      "costWood": 5,
      "hp": 100
    },
    "tower": {
      "costGold": 20,
      "costWood": 15,
      "damage": 5,
      "range": 130,
      "cooldownMs": 900
    },
    "well": {
      "costGold": 30,
      "costWood": 20,
      "healPerSec": 1,
      "range": 120
    }
  },
  "wolf": {
    "hp": 40,
    "damage": 5,
    "speed": 55,
    "score": 10
  }
}
```

### 15.1 W3X 분석 반영 후 밸런스 산출물

현재 구현 기준은 아래 파일을 따른다.

| 파일 | 용도 |
|---|---|
| `docs/chicken_farm/chicken_farm_w3x_artifacts/web_mvp_balance_reference.json` | 원본 참조값과 MVP 변환값을 나란히 기록한 근거 파일 |
| `games/chicken-farm/src/game/balance.ts` | Phaser 런타임에서 import할 타입/상수 데이터 |
| `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md` | 웨이브/상점/질병 구현 단위 스펙 |

핵심 변경:

| 항목 | 초기 초안 | W3X 분석 반영 |
|---|---:|---:|
| 목표 세션 | 15분 | 원본 근접은 3000초 이상, 테스트는 `timeScale`로 압축 |
| 첫 웨이브 | 80초 | 원본 체감 우선, 빠른 테스트에서도 논리 시간 80초 유지 |
| 수익 주기 | 30초 | 30초 유지 |
| 수익 건물 | 단일 닭/알 경제 | `coop_basic`/`coop_mid`/`coop_high` 3단계 |
| 일반 늑대 | 단일 `wolf` | `timber_wolf`/`frost_wolf`/`giant_wolf` |
| 보스 | 미정 | `blood_wolf` -> `wild_wolf` -> `hell_hound` -> `doom_guard` -> `archimonde`, `nether_dragon` 후속 후보 |
| 난이도 | 3단계 | `easy`/`normal`/`hard`/`crazy` |
| 플레이어 수 | 2~4인 | 내부 테스트 기준 8인 슬롯 |
| 맵 구현 | 단순 타일 그리드 | Phaser Tilemap + object layer |

### 15.2 Phaser 데이터 스키마

`games/chicken-farm/src/game/balance.ts`는 다음 런타임 데이터를 제공한다.

```ts
import {
  CHICKEN_FARM_BALANCE,
  getScaledEnemyStats,
  getStartingCoins,
} from './game/balance';
```

주요 타입:

- `DifficultyId`
- `EnemyId`
- `DefenderId`
- `IncomeBuildingId`
- `ShopItemId`
- `ChickenFarmBalance`
- `WaveEvent`

주요 데이터:

- `CHICKEN_FARM_BALANCE.session`
- `CHICKEN_FARM_BALANCE.economy`
- `CHICKEN_FARM_BALANCE.shopItems`
- `CHICKEN_FARM_BALANCE.incomeBuildings`
- `CHICKEN_FARM_BALANCE.defenders`
- `CHICKEN_FARM_BALANCE.enemies`
- `CHICKEN_FARM_BALANCE.waves.timeline`
- `CHICKEN_FARM_BALANCE.disease`
- `CHICKEN_FARM_BALANCE.pathing`

구현 규칙:

- Phaser 씬/시스템은 `web_mvp_balance_reference.json`을 직접 읽지 않는다.
- 런타임에서는 `CHICKEN_FARM_BALANCE`만 import한다.
- 원본 rawcode는 `source.rawcode` 추적용으로만 사용한다.
- 실제 플레이 후 보스 순서가 바뀌면 `web_mvp_balance_reference.json`과 `balance.ts`를 함께 갱신한다.

---

## 16. 개발 우선순위

### 16.1 우선 구현

1. 게임 루프
2. 타일/그리드 기반 건설
3. 닭/알 경제
4. 늑대 웨이브
5. 타워 공격
6. 게임 오버/점수
7. 수동 WebRTC 연결
8. 멀티 명령 동기화

### 16.2 나중에 구현

- 업그레이드 트리
- 특수 닭
- 특수 늑대
- 스킨
- 사운드 개선
- 모바일 조작
- 관전 모드
- 리플레이
- 랭킹

랭킹은 서버가 필요하므로 MVP에서는 제외한다.

---

## 17. 에셋 방향

### 17.1 아트 스타일

MVP 추천 스타일:

- 2D 탑다운
- 저해상도 픽셀 아트
- 밝고 가벼운 농장 분위기
- 닭과 늑대는 귀엽지만 구분이 명확하게
- 전투 이펙트는 단순하게

### 17.2 에셋 제작 원칙

- 원본 워크래프트3 모델/아이콘/사운드 사용 금지
- 직접 제작 또는 라이선스 안전한 에셋 사용
- 최종적으로는 프로젝트 고유 캐릭터성 확보

### 17.3 임시 에셋

초기 개발에서는 도형 기반으로 충분하다.

| 오브젝트 | 임시 표현 |
|---|---|
| 농부 | 파란 원 |
| 닭 | 노란 원 |
| 알 | 작은 흰 원 |
| 늑대 | 회색 원 |
| 울타리 | 갈색 사각형 |
| 타워 | 진한 사각형 |
| 우물 | 파란 사각형 |

게임성이 확인된 후 에셋을 교체한다.

---

## 18. UX 흐름

### 18.1 메인 화면

```text
[혼자 테스트]
[방 만들기]
[방 참가]
[설정]
```

### 18.2 방 만들기

```text
1. 방 만들기 클릭
2. 방장 Offer 코드 생성
3. 친구에게 코드 전달
4. 친구 Answer 코드 붙여넣기
5. 연결 완료 표시
6. 준비 완료
7. 게임 시작
```

### 18.3 방 참가

```text
1. 방 참가 클릭
2. 방장이 보낸 Offer 코드 붙여넣기
3. Answer 코드 생성
4. Answer 코드를 방장에게 전달
5. 연결 완료 대기
6. 준비 완료
```

---

## 19. 네트워크 메시지 타입 초안

```ts
export type NetworkMessage =
  | HelloMessage
  | ReadyMessage
  | StartGameMessage
  | PlayerInputMessage
  | BuildRequestMessage
  | SellEggMessage
  | HatchEggMessage
  | RepairRequestMessage
  | StateSnapshotMessage
  | GameOverMessage;
```

예시:

```ts
export interface BuildRequestMessage {
  type: 'BUILD_REQUEST';
  playerId: string;
  buildingId: string;
  gridX: number;
  gridY: number;
  clientTick: number;
}

export interface StateSnapshotMessage {
  type: 'STATE_SNAPSHOT';
  hostTick: number;
  state: SerializedGameState;
}
```

---

## 20. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 원본 맵 저작권/IP 문제 | 룰 감각만 참고, 에셋/명칭/코드 재사용 금지 |
| 맵 분석 실패 | 실제 플레이 관찰 기반으로 재구성 |
| WebRTC 연결 실패 | 우선 수동 방식, 추후 선택적으로 신호 서버 도입 검토 |
| 방장 이탈 | MVP에서는 게임 종료 처리 |
| 싱크 불일치 | 방장 권위 방식으로 상태 결정 |
| 밸런스 붕괴 | 모든 수치를 JSON화하여 빠르게 조정 |
| 개발 범위 확장 | 싱글 MVP → 2인 P2P → 4인 테스트 순서 고정 |

---

## 21. Codex 작업 지시용 요약

아래 방향으로 프로젝트를 생성한다.

```text
Phaser + TypeScript + Vite 기반으로 2D 탑다운 양계장 디펜스 게임을 구현한다.
원본 워크래프트3 유즈맵은 자동 포팅하지 않고, 룰 감각만 참고한다.
에셋은 임시 도형 또는 새 창작 에셋으로 구성한다.
1차 목표는 원본 근접 로컬 시뮬레이션이다.
2차 목표는 WebRTC DataChannel 기반 수동 Offer/Answer P2P 멀티플레이 구현이다.
서버, DB, 매칭 시스템은 만들지 않는다.
게임 상태는 방장 브라우저가 권위적으로 관리한다.
참가자는 입력 명령만 전송하고, 방장의 StateSnapshot을 받아 화면을 갱신한다.
내부 테스트 기준은 8인 슬롯, 원본 논리 타임라인, 테스트 배속 지원이다.
```

---

## 22. 1차 개발 체크리스트

```text
[ ] Vite + TypeScript + Phaser 프로젝트 생성
[ ] FarmScene 생성
[ ] Phaser Tilemap 로더 구현
[ ] Tilemap 레이어 설계: ground/buildable/collision_static/farm_zones/spawns/decor
[ ] 8인 시작 위치 배치
[ ] 테스트 배속 timeScale 구현
[ ] 농부 이동 구현
[ ] 닭 엔티티 구현
[ ] 알 생산 타이머 구현
[ ] 알 판매 구현
[ ] 알 부화 구현
[ ] 울타리 건설 구현
[ ] 타워 건설 구현
[ ] 늑대 스폰 구현
[ ] 거미/중립 유닛 배치 구현
[ ] 늑대 AI 구현
[ ] 타워 자동 공격 구현
[ ] 점수 시스템 구현
[ ] 게임 오버 구현
[ ] 밸런스 JSON 분리
[ ] Host/Client 네트워크 타입 정의
[ ] WebRTC Offer 생성 UI 구현
[ ] WebRTC Answer 생성 UI 구현
[ ] DataChannel 연결 테스트
[ ] 2인 명령 동기화 구현
[ ] 2인 상태 스냅샷 구현
[ ] 4인 확장 검토
[ ] 8인 접속/성능 검토
```

---

## 23. 최종 목표 이미지

최종적으로는 다음과 같은 경험을 목표로 한다.

```text
친구에게 링크를 보낸다.
방장이 방을 만들고 초대 코드를 공유한다.
친구가 코드를 붙여넣고 접속한다.
내부 테스트에서는 최대 8명이 각자 농장을 운영한다.
닭을 늘리고, 알을 팔고, 울타리와 타워를 짓는다.
늑대 웨이브를 막으면서 점수를 경쟁한다.
원본 논리 타임라인을 따라 장기 생존을 검증하고, 빠른 테스트 때는 배속으로 결과창까지 확인한다.
```

이 게임의 성공 기준은 그래픽 완성도가 아니라, **원본 닭농장의 긴장감과 운영 압박을 브라우저에서도 다시 느끼게 하는 것**이다.
