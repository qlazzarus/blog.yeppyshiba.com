# Chicken Farm Playtest Telemetry Plan

이 문서는 Phaser PoC/MVP에서 실제 플레이 테스트 데이터를 수집하고, 원본 닭농장 감각과 비교하는 방식을 정리한다.

## 목적

원본 닭농장 감각은 기억 기반 판단만으로 맞추기 어렵다. 특히 초반 거미 처리, 첫 방어선 완성, 80초 경고, 120초 첫 압박 사이의 시간 관계는 실제 조작 로그로 검증해야 한다.

Telemetry는 다음 질문에 답하기 위한 최소 장치다.

- 플레이어별 시작 위치에서 거미 타워 건설 지점까지 도착 시간이 적절한가?
- 스카우트 타워로 거미를 잡고 시작 아이템을 사용하는 흐름이 첫 밤 전에 가능한가?
- 울타리/타워 배치 후 늑대가 의도한 우회/공격 전환 패턴을 보이는가?
- `timeScale` 테스트와 실제 1배속 플레이의 체감 차이가 어디서 생기는가?

## 구현 상태

- 런타임 시스템: [telemetryRecorder.ts](../../games/chicken-farm/src/game/systems/telemetryRecorder.ts)
- 포맷: JSON Lines
- Export: 게임 중 `T` 키를 누르면 브라우저에서 다운로드
- 기본 파일명: `chicken-farm-poc_{sessionId}.jsonl.gz`
- 압축: 브라우저 `CompressionStream('gzip')` 사용
- fallback: `CompressionStream` 미지원 브라우저에서는 비압축 `*.jsonl` 다운로드

현재는 서버 업로드 없이 로컬 다운로드만 사용한다. 내부 테스트 단계에서는 플레이어가 직접 압축 로그를 공유하고, 분석 스크립트에서 합치는 흐름이 가장 단순하다.

## 현재 기록 이벤트

| 이벤트                       | 기록 시점                              | 주요 payload                                         |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------- |
| `session_start`              | TelemetryRecorder 생성                 | `gameId`, `mapId`, `userAgent`                       |
| `tilemap_loaded`             | Phaser scene 생성 후 tilemap 로드 완료 | `mapWidth`, `mapHeight`, `worldScale`                |
| `player_start_selected`      | 시작 슬롯 선택/변경                    | `player`, `x`, `y`                                   |
| `combat_poc_created`         | 전투 PoC 배치 생성                     | `anchorSlotId`, `layout`, `player`                   |
| `build_grid_toggled`         | `G` 키로 그리드 표시 전환              | `visible`                                            |
| `player_position_sample`     | 5초 간격 샘플링                        | `player`, `x`, `y`, `cameraScrollX`, `cameraScrollY` |
| `telemetry_export_requested` | `T` 키 export 직전                     | `eventCountBeforeExport`                             |

## JSONL 예시

```jsonl
{"payload":{"gameId":"chicken-farm-poc","mapId":"assets/tilemaps/chicken_farm_poc_01.json","userAgent":"..."},"sessionId":"2026-06-19T12-00-00-000Z_ab12cd","t":0,"type":"session_start"}
{"payload":{"mapWidth":214,"mapHeight":197,"worldScale":1},"sessionId":"2026-06-19T12-00-00-000Z_ab12cd","t":0.184,"type":"tilemap_loaded"}
{"payload":{"player":"P3","x":512,"y":5888},"sessionId":"2026-06-19T12-00-00-000Z_ab12cd","t":0.231,"type":"player_start_selected"}
```

## 다음에 추가할 이벤트

초반 빌드 타임라인 검증을 위해 다음 이벤트를 우선 추가한다.

- `arrive_spider_tower_site`: 거미 사정거리 밖 타워 건설 지점 도착
- `building_started`: 건설 시작, `buildingId`, `x`, `y`
- `building_completed`: 건설 완료, `buildingId`, `buildTimeSec`
- `spider_attack_started`: 스카우트 타워가 거미 공격 시작
- `spider_dead`: 거미 처치 완료
- `start_item_used`: 불터키트/닭분양서/시장건설 등 시작 아이템 사용
- `wave_warning`: 원본 기준 80초 경고 대응 이벤트
- `wave_pressure_started`: 첫 늑대 압박 시작
- `first_wave_survived`: 첫 웨이브 생존 판정

## 로그 보관 규칙

공유받은 테스트 로그는 필요할 때 다음 형태로 보관한다.

```text
docs/chicken_farm/playtest_logs/YYYY-MM-DD_session-id.jsonl.gz
```

로그에는 브라우저 userAgent와 조작 좌표가 들어갈 수 있으므로, 공개 커밋 전에는 개인정보와 불필요한 환경 정보를 확인한다. 기본 운영은 원본 로그를 저장소에 대량 커밋하지 않고, 요약 TSV/JSON만 산출물로 남기는 방향이다.

## 분석 연결

Telemetry 로그는 다음 표와 비교한다.

- [player_to_unique_spider_assignment.tsv](./chicken_farm_w3x_artifacts/player_to_unique_spider_assignment.tsv)
- [scout_tower_spider_clear_time.tsv](./chicken_farm_w3x_artifacts/scout_tower_spider_clear_time.tsv)
- [early_opening_build_order_timing.tsv](./chicken_farm_w3x_artifacts/early_opening_build_order_timing.tsv)

핵심 비교 지표:

- 거미 안전 타워 위치 도착 시간
- 스카우트 타워 건설 완료 시간
- 거미 처치 완료 시간
- 불터키트/닭분양서/시장건설 사용 완료 시간
- 기본 울타리 완성 시간
- 추가 스카우트 타워 완성 시간
- 80초 경고 시점의 준비 상태
- 120초 첫 주요 압박 생존 여부

## 구현 메모

TelemetryRecorder는 게임 로직과 느슨하게 연결한다. 시스템은 이벤트를 축적하고 다운로드만 담당하며, 이벤트 해석은 별도 분석 스크립트에서 처리한다. 이렇게 두면 이후 P2P/멀티플레이 단계에서 클라이언트별 로그를 합쳐 비교하기 쉽다.
