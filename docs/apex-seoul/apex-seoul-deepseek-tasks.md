# Apex Seoul — DeepSeek V4.1 Flash 실행 태스크

갱신일: 2026-11-23

이 문서는 **DeepSeek V4.1 Flash에 한 번에 한 태스크씩 전달**하기 위한 작업 지시서다. 해당 모델에서 실제 실행한 결과가 아니며 모델별 성능을 가정하지 않는다. 우선순위와 활성 상태는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)만 관리한다. 근거는 [현재 상태 점검](./apex-seoul-current-state-review.md)을 읽는다.

계획·결과 해석 담당은 **Astra**, 실제 구현·측정 담당은 **DeepSeek 4.1 Flash**다. [게임성 개선·자동 실행 계획](./apex-seoul-gameplay-automation-plan.md)의 역할, 측정 계약, 중단 조건을 함께 따른다. DS-18A는 Astra 계획 카드이며 DeepSeek 실행 큐에서 제외한다.

## 공통 작업 규칙

- 저장소 루트에서 시작한다. 아래 경로는 루트 기준이며 [game](../../games/apex-seoul/), [source](../../games/apex-seoul/src/game/), [scripts](../../games/apex-seoul/scripts/)를 기준으로 찾는다.
- 각 작업의 지정 파일과 직접 import하는 계약만 읽는다. 과거 telemetry/generated 자산과 archive 전체를 입력에 넣지 않는다.
- 한 태스크는 한 검증 가능한 변경으로 끝낸다. 명시되지 않은 물리 상수·기록 규칙·코스·자산을 바꾸지 않는다. 필요 파일이 예상보다 많아지면 후속 작업으로 분리한다.
- `src/game/`의 재수출 wrapper와 실제 `core/platform/phaser` 구현을 구별한다. wrapper에 중복 구현하지 않는다.
- 실행 전 git 상태를 확인하고 기존 변경을 보존한다. 실패 검사를 통과시키기 위해 assertion을 약화하지 않는다.
- 모든 npm 명령은 루트에서 `npm run <script> --workspace @games/apex-seoul`로 실행한다. 코드 변경 후 `typecheck`와 지정 회귀를 실행한다. build는 배포 산출물·asset·import 경계가 바뀌거나 통합 단계일 때 실행한다.
- 아래 “신규 검사”는 아직 존재하지 않는 제안이다. 구현 전부터 실행 가능한 기존 script로 보고하지 않는다.
- 결과는 변경 요약, 실행 명령과 종료 결과, 미검증 항목, 다음 태스크에 필요한 API를 남긴다. 단위 검사 PASS를 실기기 승인으로 쓰지 않는다.
- 외부 음원 선택·청음과 실기기 판단이 필요한 단계는 구현 산출물과 판단 대상을 먼저 준비한다. 미승인 자산을 runtime manifest에 넣지 않는다.

## 그대로 전달할 프롬프트

```text
Apex Seoul의 docs/apex-seoul/apex-seoul-deepseek-tasks.md에서 [DS-번호]만 수행해줘.
공통 작업 규칙과 해당 카드의 선행 조건, 읽을 파일, 범위, 완료 조건을 따라줘.
먼저 현재 git 상태와 실제 구현을 확인하고 이미 완료된 부분은 재구현하지 마.
다른 DS 태스크를 함께 처리하지 마. 물리 튜닝은 Astra가 확정한 DS-18D 카드의 범위에서만 수행해.
관련 검사를 실행하고 실행 불가/실패/통과를 구분해 보고해줘.
완료 시 해당 태스크 상태와 검증 근거를 apex-seoul-next-priority-plan.md에 갱신해줘.
```

## 태스크 카드

### DS-00 — 실행 환경과 기준 회귀 확보

- 선행: 없음
- 읽을 파일: [package.json](../../games/apex-seoul/package.json), [scripts/audit-adapter-boundaries.ts](../../games/apex-seoul/scripts/audit-adapter-boundaries.ts), [scripts/audit-runtime-qa-browser.mjs](../../games/apex-seoul/scripts/audit-runtime-qa-browser.mjs)
- 범위: Node/npm 버전을 기록하고 현재 상태 점검에 열거한 10개 검사를 실행한다. browser fixture별 dev server/브라우저 경로 전제도 확인한다. 설치가 필요하면 환경 정책을 따른다. 게임 코드는 수정하지 않는다.
- 완료 조건: 10개 결과를 evidence/에 명령·버전·커밋·exit code와 기록한다. 실패는 원인별 후속 항목으로 분리하고 환경 문제를 게임 결함으로 기록하지 않는다.
- 검증: 현재 상태 점검의 10개 기존 명령.

### DS-01 — 센서 유효값과 stale 상태 계약

- 선행: DS-00
- 읽을 파일: [src/game/platform/motionSteering.ts](../../games/apex-seoul/src/game/platform/motionSteering.ts), [src/game/platform/motionSteeringPermission.ts](../../games/apex-seoul/src/game/platform/motionSteeringPermission.ts)
- 범위: 주입 가능한 clock으로 마지막 유효 입력 시각과 ready/stale 상태를 노출한다. 첫 유효 sample에서 neutral을 잡고 NaN/Infinity/null을 무시한다. timeout은 명시적 상수로 두고 테스트에서 제어한다.
- 완료 조건: 센서 중단 시 steer=0; 첫 sample 전에는 ready가 아니며 reset/orientation 전환 뒤 재보정한다. destroy 뒤 listener가 남지 않는다. 물리와 filter tuning은 유지한다.
- 검증: 신규 qa:motion-steering: fake clock/source로 유효·무효·stale·재보정·destroy 검사. 기존 qa:adapter-boundaries.

### DS-02 — 센서 실패 시 가상 버튼 복귀

- 선행: DS-01
- 읽을 파일: [src/game/optionsScene.ts](../../games/apex-seoul/src/game/optionsScene.ts), [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), [src/game/platform/motionSteeringPermission.ts](../../games/apex-seoul/src/game/platform/motionSteeringPermission.ts), [src/game/phaser/virtualDriveControls.ts](../../games/apex-seoul/src/game/phaser/virtualDriveControls.ts)
- 범위: DS-01 상태를 소비해 sensor 준비 전 또는 stale일 때 4버튼을 유지/복원한다. 권한 승인과 실제 sample 준비를 구분한다. 새로고침 후 저장된 motion 설정도 준비 완료 전에는 fallback한다.
- 완료 조건: 권한 거부·무응답·중단·세로 전환에서 조작을 잃지 않는다. 복구 시 neutral 재보정 후 motion 사용. 비동기 권한 응답이 종료된 Options를 갱신하지 않는다.
- 검증: qa:game-settings, qa:mobile-display와 신규 browser 센서 stub 검사. 실제 iOS 권한 확인은 DS-17.

### DS-03 — 입력 우선순위 계약

- 선행: DS-00
- 읽을 파일: [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), [src/game/phaser/sceneInput.ts](../../games/apex-seoul/src/game/phaser/sceneInput.ts), [src/game/core/driveCommand.ts](../../games/apex-seoul/src/game/core/driveCommand.ts)
- 범위: keyboard steer가 활성일 때 virtual/motion steer보다 우선하도록 입력 adapter를 분리한다. keyboard가 중립일 때 virtual과 motion의 모드 정책을 명시한다. pedal의 OR 규칙은 유지한다.
- 완료 조건: keyboard +1/motion -1에서도 +1; 해제 후 현재 모드 복귀; accel/brake 유지. core의 일반 합산 API를 불필요하게 바꾸지 않는다.
- 검증: 신규 순수 입력 arbitration fixture, qa:vehicle-simulation-core, qa:adapter-boundaries.

### DS-04 — 결과 화면 모바일 hit area

- 선행: DS-00
- 읽을 파일: [src/game/resultScene.ts](../../games/apex-seoul/src/game/resultScene.ts), [src/game/platform/mobileDisplay.ts](../../games/apex-seoul/src/game/platform/mobileDisplay.ts), [src/game/uiTheme.ts](../../games/apex-seoul/src/game/uiTheme.ts)
- 범위: logical width 기반 compact 대신 CSS 표시 크기로 결과 layout을 정한다. Retry/Main의 hit area와 글자/기록 목록 배치를 조정한다.
- 완료 조건: 844×390, 667×375, 640×360에서 각 action이 최소 44×44 CSS px이고 겹치지 않는다. 한 tap에 한 번 전환하며 desktop 결과 비교를 유지한다.
- 검증: 신규 browser result-layout 검사: 실제 canvas 배율과 hit area 환산. qa:recovery-records-browser는 script의 실행 전제 확인 후 수행.

### DS-05 — 나머지 메뉴 모바일 회귀와 좁은 수정

- 선행: DS-04
- 읽을 파일: [src/game/mainScene.ts](../../games/apex-seoul/src/game/mainScene.ts), [src/game/vehicleSelectScene.ts](../../games/apex-seoul/src/game/vehicleSelectScene.ts), [src/game/recordsScene.ts](../../games/apex-seoul/src/game/recordsScene.ts), [src/game/assetNoticesScene.ts](../../games/apex-seoul/src/game/assetNoticesScene.ts), [src/game/optionsScene.ts](../../games/apex-seoul/src/game/optionsScene.ts)
- 범위: 3 viewport에서 action 크기·safe-area·scroll/back·garage 4단계를 먼저 측정한다. 결함을 화면별로 기록하고 한 변경에서 한 Scene만 수정한다. 문제가 여러 Scene이면 DS-05a/b 등 하위 카드로 나눈다.
- 완료 조건: 모든 메뉴를 pointer만으로 탐색하고 reset 확인/취소 가능. drag를 tap으로 오인하지 않으며 scene shutdown 뒤 입력이 남지 않는다.
- 검증: browser pointer flow와 CSS hit area 실측 결과. qa:mobile-display, qa:game-settings.

DS-05 측정에서 여러 Scene의 결함을 확인했다. 메인 메뉴는 DS-05에서 수정하고 아래 카드는 각각 해당 Scene만 수정한다. DS-05 전체 완료 조건은 모든 하위 카드와 통합 pointer flow 검증 후 판정한다.

#### DS-05a — Garage 모바일 조작

- 범위: `vehicleSelectScene.ts`의 4단계 선택·확인과 단계별 뒤로 가기, 메뉴 복귀의 모바일 hit area 및 safe-area를 수정한다.
- 완료 조건: 지정된 3 viewport에서 모든 action을 pointer로 조작하고 각 단계에서 뒤로 돌아갈 수 있다. drag 오인과 shutdown 후 입력을 검사한다.
- 검증: browser pointer flow, 실제 canvas 배율의 hit area 측정, `typecheck`, `qa:mobile-display`.

#### DS-05b — Records 모바일 조작

- 범위: `recordsScene.ts`의 목록 스크롤과 뒤로 가기 hit area 및 safe-area를 수정한다. DS-04에서 확인한 Records 회귀의 9개/10개 불일치 원인을 확인한다.
- 완료 조건: 3 viewport에서 목록 스크롤·복귀가 pointer로 가능하고 drag와 tap을 구분하며 종료 후 입력이 남지 않는다.
- 검증: browser pointer flow, hit area 측정, `qa:recovery-records-browser`, `typecheck`.

#### DS-05c — Credits 모바일 조작

- 범위: `assetNoticesScene.ts`의 목록 스크롤과 뒤로 가기 hit area 및 safe-area를 수정한다.
- 완료 조건: 3 viewport에서 목록 스크롤·복귀가 pointer로 가능하고 drag와 tap을 구분하며 종료 후 입력이 남지 않는다.
- 검증: browser pointer flow, hit area 측정, `typecheck`.

#### DS-05d — Options 모바일 조작

- 범위: `optionsScene.ts`의 설정·스크롤·뒤로 가기 및 reset 확인/취소를 모바일에서 조작할 수 있도록 수정한다.
- 완료 조건: 3 viewport에서 설정과 reset 확인/취소를 pointer로 조작하고 drag와 tap을 구분하며 종료 후 입력이 남지 않는다.
- 검증: browser pointer flow, hit area 측정, `qa:game-settings`, `typecheck`.

### DS-06 — PWA 설치 경로와 오류 복구

- 선행: DS-00
- 읽을 파일: [src/game/platform/pwaInstall.ts](../../games/apex-seoul/src/game/platform/pwaInstall.ts), [src/game/optionsScene.ts](../../games/apex-seoul/src/game/optionsScene.ts), [public/manifest.webmanifest](../../games/apex-seoul/public/manifest.webmanifest), [public/sw.js](../../games/apex-seoul/public/sw.js)
- 범위: iframe에서는 독립 게임 URL 열기, standalone에서는 설치 숨김, prompt reject 안전 처리와 늦게 도착한 install event의 UI 갱신을 구현한다. offline cache는 추가하지 않는다.
- 완료 조건: accepted/dismissed/rejected에서 event를 한 번만 소비한다. iOS 안내와 embed 진입이 올바르고 listener 해제 가능. 게임 밖 scope를 등록하지 않는다.
- 검증: 신규 qa:pwa-install: stub event/standalone/embed/reject. build. 실제 설치는 DS-17.

### DS-07 — 기록 이름 갱신 저장 계약

- 선행: DS-00
- 읽을 파일: [src/game/platform/runRecord.ts](../../games/apex-seoul/src/game/platform/runRecord.ts), [src/game/saveDefaults.ts](../../games/apex-seoul/src/game/saveDefaults.ts), [src/game/resultScene.ts](../../games/apex-seoul/src/game/resultScene.ts), [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), [scripts/audit-local-save.ts](../../games/apex-seoul/scripts/audit-local-save.ts)
- 범위: 저장 완료 runId를 결과 payload에 전달하고 동일 runId의 이름만 갱신하는 API를 추가한다. 마지막 확정 이름을 profile에 호환 저장한다. UI는 추가하지 않는다.
- 완료 조건: a-z 세 글자를 A-Z로 정규화, 잘못된 값 거부; recent/PB 이름 일치; 중복 호출에도 count/time 불변; excluded run이나 다른 run을 수정하지 않음. 구버전/거부 storage 정책 보존.
- 검증: qa:local-save에 이름 수정·중복·실패 계약 추가, qa:recovery-records.

### DS-08 — 세 글자 이름 입력 UI

- 선행: DS-07, DS-04
- 읽을 파일: [src/game/resultScene.ts](../../games/apex-seoul/src/game/resultScene.ts), [src/game/platform/runRecord.ts](../../games/apex-seoul/src/game/platform/runRecord.ts), [src/game/uiTheme.ts](../../games/apex-seoul/src/game/uiTheme.ts)
- 범위: 결과에 글자 선택/이동/확정/건너뛰기를 붙인다. 마지막 확정 이름 복원과 저장 실패 안내를 연결한다.
- 완료 조건: 키보드·touch 모두 3글자만 확정; 닫기/건너뛰기에도 기존 완주 보존. 확정 후 Retry/Main 정상; 이름 입력 중 전역 shortcut 중복 처리 없음.
- 검증: qa:local-save, 신규 browser 이름 입력/skip/retry/저장 실패 시나리오.

### DS-09 — runtime 자산 고지 연결 계약

- 선행: DS-00
- 읽을 파일: [src/game/assetAttributions.ts](../../games/apex-seoul/src/game/assetAttributions.ts), [src/game/startupAssetManifest.ts](../../games/apex-seoul/src/game/startupAssetManifest.ts), [src/game/vehicleCatalog.ts](../../games/apex-seoul/src/game/vehicleCatalog.ts), [src/game/assetNoticesScene.ts](../../games/apex-seoul/src/game/assetNoticesScene.ts)
- 범위: 실제 runtime 자산과 provenance를 대조하고 attribution ID, license URL, 가공 설명/원본 metadata 참조를 추가한다. 외부 자산과 자체 제작 자산을 명시적으로 구분한다.
- 완료 조건: 모든 외부 runtime 자산에 근거 연결. 모르는 저자/취득일/license를 만들어 채우지 않으며 unresolved 목록을 별도로 남긴다. 실제 쓰이지 않는 source/POC를 runtime으로 오인하지 않는다.
- 검증: typecheck, qa:vehicle-catalog. 누락 검증 자동화는 DS-10.

### DS-10 — 배포 고지 생성과 누락 검사

- 선행: DS-09
- 읽을 파일: [src/game/assetAttributions.ts](../../games/apex-seoul/src/game/assetAttributions.ts), [src/game/startupAssetManifest.ts](../../games/apex-seoul/src/game/startupAssetManifest.ts), [package.json](../../games/apex-seoul/package.json), 신규 scripts/generate-asset-attributions.ts 및 scripts/audit-asset-attributions.ts
- 범위: 같은 manifest에서 배포 ATTRIBUTIONS.md를 생성하고 runtime 자산 coverage 및 금지/미확정 license를 검증한다. 생성 위치는 게임 public로 두어 Vite 복사 경로를 사용한다.
- 완료 조건: 생성 결과가 deterministic하고 고지와 Credits가 일치. 누락·unknown license가 검사 실패하며 사용하지 않는 실험 파일은 검사 대상 제외. 미해결 provenance가 있으면 release blocker로 보고.
- 검증: 신규 qa:asset-attributions 및 생성 명령, build 산출물에 고지 포함 확인.

### DS-11 — 오디오 bus와 lifecycle

- 선행: DS-00
- 읽을 파일: [src/game/platform/gameSettings.ts](../../games/apex-seoul/src/game/platform/gameSettings.ts), [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), [src/engine-sound-lab.ts](../../games/apex-seoul/src/engine-sound-lab.ts), 신규 runtime audio adapter
- 범위: 주입 가능한 audio backend와 master/SFX/music gain, 사용자 gesture unlock, pause/hidden/finish/retry/destroy를 구현한다. 첫 단계는 fake backend로 계약을 검증한다. 실제 음원 추가는 하지 않는다.
- 완료 조건: mute/volume 즉시 적용, unlock 실패해도 주행 지속, 10회 생성/종료 후 node/listener 증가 없음. core는 WebAudio/DOM을 import하지 않는다.
- 검증: 신규 audio lifecycle fixture, qa:game-settings, qa:adapter-boundaries.

### DS-12 — 엔진 지속음 연결

- 선행: DS-11
- 읽을 파일: [src/engine-sound-lab.ts](../../games/apex-seoul/src/engine-sound-lab.ts), [src/game/powertrainFeedback.ts](../../games/apex-seoul/src/game/powertrainFeedback.ts), [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), DS-11 audio adapter
- 범위: 합성 실험의 필요한 voice만 추출해 실제 RPM/load 기반 엔진·spool 지속음을 연결한다. 세 차의 NA/single/twin capability를 사용한다. 외부 sample 채택은 별도 자산 근거가 있을 때만 한다.
- 완료 조건: 출력 음향은 물리를 바꾸지 않음. idle/가속/lift/shift에서 값이 추적되고 mute·pause 정상. 청음 후보를 준비하되 청음 미확인 상태를 완료 승인으로 쓰지 않음.
- 검증: DS-11 lifecycle, qa:powertrain-feedback, 세 차량 청음 체크리스트와 결과.

### DS-13 — 사건 SFX와 타이어·충돌

- 선행: DS-12
- 읽을 파일: [src/game/powertrainFeedback.ts](../../games/apex-seoul/src/game/powertrainFeedback.ts), [src/game/guardrailCollision.ts](../../games/apex-seoul/src/game/guardrailCollision.ts), [src/game/timeAttackScene.ts](../../games/apex-seoul/src/game/timeAttackScene.ts), audio adapter
- 범위: event sequence별 one-shot과 실제 slip 기반 tire loop를 연결한다. guardrail enter만 impact를 재생하고 stay는 반복하지 않는다. 원음 확보가 안 된 사건은 placeholder shipping 대신 미완료로 표시한다.
- 완료 조건: 같은 sequence는 1회, retry 뒤 과거 사건 재생 없음. 정지·무접촉 시 타이어/충돌음 없음. 설정·pause·shutdown 계약 유지.
- 검증: 신규 event consumer fixture, qa:powertrain-feedback, qa:guardrail-collision, 청음 확인.

### DS-14 — 음악 후보 검수와 선택 자료

- 선행: DS-09
- 읽을 파일: [src/game/musicAssetManifest.ts](../../games/apex-seoul/src/game/musicAssetManifest.ts), [src/engine-sound-lab.ts](../../games/apex-seoul/src/engine-sound-lab.ts), docs/apex-seoul/apex-seoul-audio-music-plan.md
- 범위: 기존 후보 중 라이선스 근거/loop/BPM/key/브라우저 decode를 확인해 청음 가능한 비교 자료를 준비한다. 승인된 선택이 없으면 최종 runtime import하지 않는다.
- 완료 조건: 출처·license·가공 내역·loop 길이·청음 결과와 선택 대상을 제시. 다른 BPM 곡을 동기 stem으로 간주하지 않음. 다운로드/청음 불가 시 필요한 외부 입력을 명시.
- 검증: 자산 metadata 확인과 browser decode; 실제 선택 여부를 인계 기록에 명시.

### DS-15 — 승인된 음악 연결

- 선행: DS-11, DS-14 선택 완료, DS-10
- 읽을 파일: [src/game/musicAssetManifest.ts](../../games/apex-seoul/src/game/musicAssetManifest.ts), audio adapter, [src/game/loadingScene.ts](../../games/apex-seoul/src/game/loadingScene.ts)
- 범위: 선택된 runtime 곡만 load한다. 동일 계약의 stem만 동기화하고 적합한 stem이 없으면 승인된 단일 loop를 사용한다. menu/race/result와 music volume을 연결한다.
- 완료 조건: 없는 파일을 요청하지 않음. gesture 뒤 재생; pause/resume/retry와 ducking 정상. 누락/decode 실패 시 silent fallback. source 원본은 번들 제외.
- 검증: audio lifecycle, qa:asset-attributions, build, Android/iOS decode 및 clipping/loop 청음.

### DS-16 — 핵심 QA의 CI gate

- 선행: DS-00, DS-10
- 읽을 파일: [package.json](../../games/apex-seoul/package.json), [../../.github/workflows/deploy.yaml](../../games/apex-seoul/../../.github/workflows/deploy.yaml)
- 범위: 검증된 순수 QA 묶음을 별도 script로 정의하고 배포 build 전에 실행한다. 외부 analytics secret·Windows Edge 경로가 필요 없는 검사부터 묶는다.
- 완료 조건: 순수 core/storage/settings/input/attribution 회귀가 실패하면 배포 중단. clean npm ci 환경에서 실행. browser suite는 환경 전제를 명시한 별도 단계로 유지.
- 검증: 새 aggregate script, build. workflow YAML 및 실제 CI 실행 결과는 구분해서 기록.

### DS-17 — playable release 통합 검증

2026-11-26 사용자 지시로 DS-13·DS-16의 잔여 작업과 사람 확인은 DS-17 이후에 진행한다. DS-17 결과에 해당 미검증 항목을 기록하고, 후속 순서와 상태는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)를 따른다.

- 선행: DS-02~06, DS-08, DS-10, DS-18E(후보가 없으면 기준 회귀와 Astra의 변경 불필요 판단), DS-18F의 구현 또는 보류 판단; 음악 포함 release면 DS-15
- 읽을 파일: [scripts/audit-driving-browser.mjs](../../games/apex-seoul/scripts/audit-driving-browser.mjs), [scripts/audit-retry-visual-lifecycle-browser.mjs](../../games/apex-seoul/scripts/audit-retry-visual-lifecycle-browser.mjs), [scripts/audit-local-save-browser.mjs](../../games/apex-seoul/scripts/audit-local-save-browser.mjs), docs/apex-seoul/apex-seoul-hud-plan.md
- 범위: 세 차량×네 색상에서 pointer garage/run/result/retry; 3 viewport; 세로 전환; 저장 거부/손상; 10회 retry; production debug 차단을 검증한다. Android/iOS 기기·OS·browser·설치·motion·audio 결과와 frame time을 기록한다.
- 완료 조건: 미실행 기기를 PASS 처리하지 않음. 30/60/120Hz 순수 sim 계약과 실제 화면 FPS 측정을 분리. blocker마다 재현 절차·증거·후속 카드. build/fixture 통과만으로 release 승인하지 않음.
- 검증: 관련 기존 browser QA, qa:vehicle-simulation-core, build 및 실기기 체크리스트.

### DS-18 — 게임성 작업 묶음 (직접 실행하지 않음)

기존 단일 DS-18은 아래 A~F로 대체한다. DS-17 선행 조건을 제거하고 입력 안정화 직후 시작한다. 자동화 계약은 [게임성 계획](./apex-seoul-gameplay-automation-plan.md)을 따른다.

### DS-18A — 측정 계약과 가설 확정 (Astra)

- 선행: DS-00, DS-02, DS-03.
- 읽을 파일: [handling balance](../../games/apex-seoul/scripts/audit-vehicle-handling-balance.ts), [vehicle comparison](../../games/apex-seoul/scripts/compare-vehicle-performance.ts), [road](../../games/apex-seoul/src/game/core/road.ts), [핸들링 기준](./apex-seoul-speed-band-handling-plan.md).
- 범위: 실제 코너·진입 상태·입력 전략·실패 조건·Hz·측정 지표를 지정한다. 그립/드리프트 선택, 차량별 장단점, 재도전 정보 중 무엇을 검증하는지 가설로 적는다.
- 완료 조건: DeepSeek가 임의 해석 없이 구현할 수 있는 versioned 측정 계약과 결과 schema. 기준 측정 전에는 개선 수치를 추정하지 않는다. 후보 구현 전에는 Astra가 기준 결과를 읽고 수치 임계값·허용 파일/상수·후보 한도를 추가 확정한다.
- 검증: 기존 QA가 현재 production config를 사용하는지 대조하고 자료/계약 누락 검사 항목을 정의한다. 게임 코드는 변경하지 않는다.

### DS-18B — 측정 runner와 판정기 (DeepSeek)

- 선행: DS-18A의 측정 계약 확정.
- 읽을 파일: DS-18A 계약, [vehicle comparison](../../games/apex-seoul/scripts/compare-vehicle-performance.ts), [runtime config](../../games/apex-seoul/src/game/playerVehicleDefaults.ts), [simulation](../../games/apex-seoul/src/game/core/vehicleSimulation.ts).
- 범위: production 설정을 재사용하는 작은 CLI 측정 runner, 결과 JSON/요약, 필수 결과 누락·실패 판정기를 만든다. 기존 script의 사용 가능한 부분부터 재사용한다. 모델 API 호출은 제외한다.
- 완료 조건: 차량/구간/전략/Hz/config/seed가 결과에 남는다. 실제 drift 진입을 판별하며 미완주를 누락하지 않는다. 계약 누락·timeout·기준 hash 불일치는 성공 처리하지 않는다.
- 검증: 신규 runner/schema 검사와 실패·누락·drift 미진입 fixture, `qa:vehicle-simulation-core`, `qa:adapter-boundaries`, typecheck. 신규 npm 명령 이름과 인자를 인계 기록에 확정한다.

### DS-18C — 기준 측정과 문제 분류 (DeepSeek → Astra)

- 선행: DS-18B.
- 읽을 파일: 확정 계약, DS-18B 실행 명령, [run comparison](../../games/apex-seoul/src/game/runComparison.ts).
- 범위: 세 차량·grip/drift·지정 코너의 기준 측정과 30/60/120Hz 회귀를 수행한다. 고정 입력 회귀와 전략 비교를 구분한다. 물리·코스는 변경하지 않는다.
- 완료 조건: 원시 결과와 비교표, 실패 run 포함, 기준 commit/diff/config hash 보존. 차량의 전 구간 우위 여부와 전략별 손익을 보고하되 “재미있음”으로 자동 결론 내리지 않는다.
- 검증: DS-18B runner, `qa:vehicle-handling-balance`, `compare:vehicle-performance`. Astra가 입력 정책 편향을 검토하고 DS-18D의 수치 기준을 확정하거나 변경 불필요를 기록한다.

### DS-18D — 한 가지 게임성 개선 후보 (DeepSeek)

- 선행: DS-18C 결과 및 Astra의 허용 파일/수치 범위·목표/회귀 한도 확정.
- 읽을 파일: Astra 변경 카드에서 지정한 구현 파일만. [handling profile](../../games/apex-seoul/src/game/vehicleHandlingProfile.ts), [simulation](../../games/apex-seoul/src/game/core/vehicleSimulation.ts), [road](../../games/apex-seoul/src/game/core/road.ts)은 문제에 따라 선택한다.
- 범위: 한 가설에 대해 한 후보만 구현한다. 조향·드리프트·차량 응답·코스 수정 중 카드가 허용한 범위로 제한한다. 서로 다른 축을 동시에 조정하지 않는다.
- 완료 조건: baseline을 보존한 후보 diff, 변경 이유와 예상 지표. 시간/경로를 바꾸면 Astra 카드에 지정된 기록 호환성 처리를 포함한다. UI/오디오/이름 입력을 섞지 않는다.
- 검증: typecheck와 카드가 지정한 회귀. 비교 판정은 DS-18E에서 수행한다. 후보별 D→E 반복은 계약의 최대 후보 수까지만 허용한다.

### DS-18E — 후보 비교와 회귀 판정 (DeepSeek → Astra → 사용자)

- 선행: DS-18D.
- 읽을 파일: baseline/candidate 결과, DS-18A 확정 임계값과 해당 변경 카드.
- 범위: 동일 시나리오/입력/환경으로 전후를 비교한다. 개선 지표와 회귀를 모두 보고하고 회귀 초과 시 중단한다. 측정 controller나 판정 임계값은 바꾸지 않는다.
- 완료 조건: 자동 PASS/FAIL/BLOCKED 근거와 비교 주행 가능한 후보. Astra가 tradeoff를 해석하고 사용자에게 그립/드리프트 선택·차량 공략·실패 가독성 비교를 요청한다. 체감 미확인은 REVIEW_REQUIRED로 남긴다.
- 검증: DS-18B 판정기와 `qa:vehicle-handling-balance`, `qa:vehicle-simulation-core`; 물리/코스 변경 시 `qa:world-line-cornering`, `qa:neutral-production-corners`, `qa:guardrail-collision`, `qa:top-speed-regression`, build. 관련 기존 회귀는 변경 카드에서 추가한다.

### DS-18F — 구간 목표와 재도전 피드백 (DeepSeek)

- 선행: DS-18E 후보 검토 완료, 또는 DS-18C에서 Astra가 tuning 불필요 판단 및 기준 회귀 확인. Astra가 UI/데이터 범위를 먼저 확정한다.
- 읽을 파일: [course run](../../games/apex-seoul/src/game/courseRun.ts), [comparison](../../games/apex-seoul/src/game/runComparison.ts), [result](../../games/apex-seoul/src/game/resultScene.ts), [save](../../games/apex-seoul/src/game/platform/runRecord.ts).
- 범위: 기존 checkpoint/PB를 재사용해 개선 대상 구간 하나와 근거 delta를 보여준다. section metadata가 필요하면 DS-18F-1 데이터, DS-18F-2 결과 UI로 나눠 순차 실행한다. medal·새 코스는 추가하지 않는다.
- 완료 조건: 최초 기록/미완주/비교 불가에는 거짓 팁 없음. 누적 checkpoint 시간을 구간 시간으로 변환해 비교하며 전체 PB와 차량 PB 중 기준을 명시한다. 시간 데이터만 있으면 원인 단정 없이 개선 대상 구간만 표시한다.
- 검증: 신규 구간 delta/팁 fixture, `qa:recovery-records`, `qa:local-save`, 결과 화면 browser 검사. 작은 화면의 터치 크기 문제는 DS-04로 연결하고 물리 수치를 바꾸지 않는다.

## 인계 결과 형식

```text
담당 모델 / 태스크: DS-xx
기준 commit / working diff hash / 계약 버전 / 변경 파일:
구현한 계약:
검증 명령 / PASS·FAIL·NOT RUN / 근거 경로:
자동 판정: PASS / FAIL / BLOCKED / REVIEW_REQUIRED
미검증 및 blocker:
다음 태스크가 소비할 API 또는 결정:
```

`evidence/`에는 날짜·태스크 ID로 결과를 저장한다. 원시 로그 대량 복사보다 명령, 환경, 핵심 assertion 결과, 필요한 screenshot/telemetry 경로를 남긴다. 선행 태스크가 끝났다는 근거가 없으면 코드를 확인하고 완료 여부부터 판정한다.
