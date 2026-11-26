# Apex Seoul 현재 상태 점검

점검일: 2026-11-23 · 기준 커밋: `188cfee9` · 방식: 현재 소스와 기존 설계의 정적 대조

## 결론

세 차량 선택 → 주행 → 결과 → 재도전, HUD, 기록 저장·비교, core/platform/phaser 분리는 구현되어 있다. 다음 작업은 **입력 안정화 → 게임성 측정·필요한 개선 → 모바일 조작성·주행 오디오·배포 검증** 순서로 진행한다. 게임성은 release 이후로 미루지 않는다. Astra가 계획·기준·해석을 맡고 DeepSeek 4.1 Flash가 구현·측정을 맡는 [자동 실행 계획](./apex-seoul-gameplay-automation-plan.md)을 따른다. 구현이 존재한다는 사실과 release 검증 통과는 구분한다.

실행 순서는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md), 개별 작업 지시서는 [DeepSeek 실행 태스크](./apex-seoul-deepseek-tasks.md)를 따른다. 이 점검은 게임 코드를 변경하거나 배포하지 않았다.

## 구현 상태와 남은 일

| 영역 | 확인 근거 | 현재 판단 / 남은 일 |
| --- | --- | --- |
| 구조 분리 | [core](../../games/apex-seoul/src/game/core/), [platform](../../games/apex-seoul/src/game/platform/), [phaser](../../games/apex-seoul/src/game/phaser/), [QA scripts](../../games/apex-seoul/package.json) | R0~R4 구현과 전용 검사 존재. 추가 패키지화·ECS 전환 불필요. 이번 검사 통과 여부는 미확인 |
| 차량 개성 | [handling profile](../../games/apex-seoul/src/game/vehicleHandlingProfile.ts), [powertrain feedback](../../games/apex-seoul/src/game/powertrainFeedback.ts) | NA/싱글/트윈 profile과 실제 사건 계산 존재. 새로 만들지 말고 비교 주행으로 밸런스 확인 |
| 기록 | [저장소](../../games/apex-seoul/src/game/platform/runRecord.ts), [결과](../../games/apex-seoul/src/game/resultScene.ts) | PB/전체·차량별 checkpoint 비교와 저장 실패 표시 존재. 세 글자 이름 입력은 미구현 |
| 모바일 기반 | [display](../../games/apex-seoul/src/game/platform/mobileDisplay.ts), [motion](../../games/apex-seoul/src/game/platform/motionSteering.ts), [touch](../../games/apex-seoul/src/game/phaser/virtualDriveControls.ts) | 세로 guard, 가상 버튼, 센서 조향은 구현. 아래 입력 결함과 실제 CSS 터치 크기 검증 필요 |
| 설정 | [settings](../../games/apex-seoul/src/game/platform/gameSettings.ts), [Options](../../games/apex-seoul/src/game/optionsScene.ts) | 저장·권한 요청 UI 존재. 오디오 값 저장은 실제 게임 오디오 동작 완료를 뜻하지 않음 |
| 오디오 | [청음 실험](../../games/apex-seoul/src/engine-sound-lab.ts), [음악 manifest](../../games/apex-seoul/src/game/musicAssetManifest.ts) | 합성 청음 페이지만 존재. 게임 주행 오디오 controller/재생 연결과 승인된 BGM 파일은 없음 |
| PWA | [manifest](../../games/apex-seoul/public/manifest.webmanifest), [설치 adapter](../../games/apex-seoul/src/game/platform/pwaInstall.ts), [worker](../../games/apex-seoul/public/sw.js) | manifest/icon/등록/Options 설치 action 구현. worker는 빈 fetch handler이며 offline cache 미구현. 실기기 설치·iframe 경로·오류 처리 검증 필요 |
| 자산 고지 | [manifest](../../games/apex-seoul/src/game/assetAttributions.ts), [startup manifest](../../games/apex-seoul/src/game/startupAssetManifest.ts) | Credits 목록 존재. runtime 자산별 연결 ID·license URL·가공 이력 계약과 배포용 고지 생성/누락 검사 없음 |
| 배포 검사 | [workflow](../../.github/workflows/deploy.yaml), [scripts](../../games/apex-seoul/package.json) | build에 typecheck 포함. 전용 QA를 배포 workflow가 호출하지 않음 |

## 코드에서 확인한 우선 보완점

### 센서가 멈춘 뒤 마지막 조향값 유지

[motion steering](../../games/apex-seoul/src/game/platform/motionSteering.ts)은 마지막 입력 시각을 저장하지 않고 `getCommand()`에서 마지막 `steerAxis`를 그대로 반환한다. 유효한 입력 후 센서 event가 중단되면 reset 또는 mode 변경 전까지 조향이 남을 수 있다. `getLandscapeTilt()`도 `typeof number`만 검사하므로 NaN/Infinity 방어가 없다. 유효 sample, 준비 상태, timeout을 구분하고 stale이면 가상 버튼으로 복귀시키는 검사가 필요하다. 권한 승인만으로 센서 정상 작동을 보증할 수 없다.

### 키보드 우선 계약과 현재 입력 합산 불일치

[TimeAttackScene](../../games/apex-seoul/src/game/timeAttackScene.ts)의 `getDriveCommand()`는 keyboard/virtual/motion을 [mergeDriveCommands](../../games/apex-seoul/src/game/core/driveCommand.ts)에 함께 넘긴다. steerAxis를 합산하므로 keyboard +1과 motion -1은 0이 된다. 기존 P3-4의 키보드 우선 계약과 다르다. 우선순위는 입력 adapter에서 정하고 순수 차량 물리 수치를 바꾸지 않는다.

### 결과 버튼의 실제 터치 크기 부족

[ResultScene](../../games/apex-seoul/src/game/resultScene.ts)의 버튼 높이는 logical 42px이고 `compact` 판정도 logical width를 쓴다. 기본 [설정](../../games/apex-seoul/src/game/apexSeoulConfig.ts)은 1200×760이다. FIT로 667×375에 표시하면 높이 배율 기준 버튼은 약 20.7 CSS px이며 기존 44×44 CSS px 목표에 못 미친다. 이는 정적 계산이며 실측 결과가 아니다. 결과 화면부터 고치고 나머지 메뉴는 실제 display scale로 측정한다.

### PWA 완료 표기와 실제 범위 분리

[설치 adapter](../../games/apex-seoul/src/game/platform/pwaInstall.ts)는 standalone/iOS/deferred prompt를 구분하지만 iframe 분기가 없다. `requestPwaInstall()`의 prompt reject도 내부에서 처리하지 않으며 [Options](../../games/apex-seoul/src/game/optionsScene.ts)는 `.then()`으로 소비한다. embed에서는 독립 경로 열기, 실패 시 재사용 불가 event 정리와 안내가 필요하다. 설치 event가 Options 진입 후 도착하는 경우 UI 갱신도 검증한다. offline과 주행 중 update 정책은 별도 보류 범위로 유지한다.

## 제품 후속 범위

- [로컬 저장 TODO](./apex-seoul-local-save-plan.md#todo--경기-종료-후-영문-세-글자-이름-입력): 이름 수정은 같은 runId를 대상으로 하고 완주 횟수/PB를 재집계하지 않는다. 현재 결과 payload에는 runId가 없어 전달 계약부터 필요하다.
- [오디오 계획](./apex-seoul-audio-music-plan.md): mixer lifecycle → 엔진 → 사건 SFX → 승인 음악 순서로 나눈다. 청음 실험 코드를 그대로 Scene에 복사하지 않는다.
- 구간 비교는 이미 존재하므로 P2 전체를 재구현하지 않는다. 이름 있는 section 및 설명 가능한 개선 팁, grip/drift 비교와 medal은 실제 완주 자료를 확보한 뒤 진행한다.
- D-08 차량 개성과 D-17 기록 비교는 이미 활성 범위에 일부 흡수됐다. ghost·traffic·새 코스·offline은 첫 배포의 필수조건으로 추가하지 않는다.

## 검증 범위와 한계

이번 환경에는 `node`와 `npm` 실행 파일이 없어 다음 명령 모두 시작 단계에서 `npm: command not found`로 종료됐다. 테스트 실패나 PASS로 해석하지 않는다.

`typecheck`, `qa:adapter-boundaries`, `qa:vehicle-simulation-core`, `qa:pseudo3d-core`, `qa:local-save`, `qa:recovery-records`, `qa:game-settings`, `qa:mobile-display`, `qa:vehicle-handling-balance`, `qa:powertrain-feedback` (`npm run <script> --workspace @games/apex-seoul`).

브라우저 실주행, production build, 성능·청음, Android/iOS 실기기 검사는 수행하지 않았다. 과거 문서의 PASS는 이번 커밋에서 재실행한 근거가 아니다. 후속 첫 태스크에서 Node 환경과 기준 검사 결과를 확보한다.
