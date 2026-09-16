# 차량 프로파일 비교 전 주행 기준선 점검

갱신일: 2026-09-16

후속 상태: [브라우저 주행 및 세 차량 성능 비교](./apex-seoul-vehicle-performance-review.md)를 완료했다. 아래의 직접 주행 대기 항목 중 자동화 브라우저 키 입력·화면 검증은 9개 시나리오로 확인했으며, 사람의 주관적 운전 체감 평가는 별개로 남는다.

## 우선 수정

### 공통 속도 단위

`getDisplaySpeedKmh()`는 세 차량 모두 내부 속도 비율 × 225km/h를 사용한다. 기존 Raven 보정을 보존하고 Seorin/Mirae의 smoothstep 표시와 차량별 표시 배율을 제거했다. 같은 내부 속도와 longitudinal scale이면 같은 계기판 속도와 코스 이동량을 갖는다. 물리 기어 RPM 환산도 공통 기준을 사용한다.

`VehicleEngineProfile.displayTopSpeedKmh`는 호환성을 위해 이름을 유지한 **튜닝 목표값**이다. 실제 최고속도를 보장하거나 계기판 배율을 바꾸지 않는다. 현재 공통 내부 속도 상한은 표시상 225km/h이므로 Seorin의 230 목표를 구현한 상태가 아니다. 차량별 실제 최고속도·기어·토크 비교와 목표값 필드 정리는 다음 프로파일 작업에서 처리한다. 코스의 world unit을 실제 미터로 재정의한 변경은 아니다.

### 코너 조향 방향

도로 회전으로 누적되는 상대 heading 오차는 `requiredRoadYawRate`이며 이를 상쇄할 운전자 조향은 반대 부호여야 한다. 기존 코드가 두 방향을 같게 취급해 정상 코너 조향에 바깥 조향 감속이 붙고, 회복 보조·안쪽 heading 제한이 잘못된 입력에 적용될 수 있었다.

`roadSteerDirection = sign(-requiredRoadYawRate)`로 수정했다. 기존 `corner-exit-steering` 검사는 조건 변경 없이 2/5에서 5/5로 통과했다. 앞선 검토의 “탈출 검사 방향 조건이 낡았다”는 판단은 이 결과로 정정한다.

`grip-outward-recovery`의 fixture는 무입력 heading 오차와 반대인 보정 입력을 주도록 곡률 부호를 수정했다. `world-line-cornering`의 투영 기대값은 기존 직접 조향 분담 계수를 반영했다. 별도 `qa:speed-units`에서 세 차량 × 좌우 코너의 무입력 바깥 방향, 정상 조향의 바깥 감속 부재, 바깥 조향의 감속을 확인한다.

### 기록 조건

조향 수정은 코너 속도와 랩타임에 영향을 주므로 `time-attack-v3`로 분리했다. 저장 schema는 유지하고 기존 v2 기록을 보존한다. 새 규칙 PB와 섞지 않으며 저장·재로딩 검증을 추가했다.

## 다음 차량 프로파일 작업의 TODO

- `VehicleHandlingProfile`을 차량 프로파일 설정으로 정의하고 catalog → runtime config로 연결한다. 차량 ID 분기나 controller 내부 차량별 상수로 구현하지 않는다.
- 조향 응답/힘, 고속 조향 한계, 제동, 코너 속도 예산, 드리프트 진입·유지·회복을 설정 후보로 삼는다. 중복·미사용 조정값은 연결 전에 정리한다.
- 기본 프로파일은 현재 공통 동작을 보존한다. Raven/Seorin/Mirae 차등 튜닝은 동일 조건 성능 비교 이후 수행한다.
- 실제 코스 이동량·가속·제동·코너 탈출 속도·구간 시간을 측정한다. 목표 최고속도나 선택 화면 설명을 측정 결과로 취급하지 않는다.

## 검증과 남은 범위

자동 검증은 직접 조향, 궤적, 바깥 heading 회복, 코너 탈출 조향/회복, world-line, 실제 코스 무입력 이탈, production corner, handling relations, powerband 및 새 공통 속도/방향 검사를 포함한다. 저장 검증은 이전 규칙 보존과 새 PB 분리를 포함한다.

실행 결과: 위 검사와 neutral-centering, heading-debt, guardrail-collision, standing-start, vehicle-catalog, local-save, recovery-records 및 Vite build 통과. top-speed-regression은 반올림된 `0.095 - 0.094`가 부동소수점 표현에서 `0.001`을 미세하게 초과하는 문제를 수정한 뒤 통과했다. 기존 허용 오차에 `1e-9`만 추가했으며 성능 허용 범위를 재조정하지 않았다.

확장 검사에서 남은 기존 문제:

- `qa:low-speed-steering`: 60km/h에서 2초 조향 시 횡이동 `182.9965`, 기존 기대 범위 `100~180` 밖이다. 변경 전 HEAD 소스를 별도 경로에서 실행해 동일 실패·동일 값을 확인했다. 다음 저속 조향 정비 때 공통 baseline fixture와 체감 기준을 먼저 정리하며, 이번에 통과를 위해 수치를 완화하지 않았다.
- 프로젝트 전체 `tsc --noEmit`: renderer/scene/preview 등의 기존 오류로 실패한다. 별도 HEAD 소스 검사와 대조해 이번 변경의 신규 오류가 없음을 확인했다. 타입 정비는 별도 품질 작업으로 남긴다.

자동 생성 telemetry는 작업 로그로 별도 보관하고 과거 기준선 파일을 일괄 교체하지 않았다. 명령은 `games/apex-seoul/package.json`의 `qa:*` scripts를 따른다. 신규 속도·방향 검증은 `npm run qa:speed-units --prefix games/apex-seoul`이다.

수동 주행으로 확인할 항목은 고속 키 입력의 체감, 가속 해제 시 의도치 않은 드리프트, 같은 코너의 grip/drift 구간 시간, 스프라이트·도로 곡률과 실제 궤적의 시각적 일치다. 자동 통과를 실주행 승인으로 간주하지 않는다. 이번 작업은 차량별 밸런스 조정이 아니다.
