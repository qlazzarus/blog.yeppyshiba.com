<!-- Use this template when creating PRs that improve /tools/* pages. -->

## 목적

이 PR은 `/tools/` 관련 페이지들의 콘텐츠 및 UX 개선을 위한 변경을 제안합니다. 목표는 평균 체류 시간 증가와 내부 클릭 전환 향상입니다.

## 변경 요약

- (예시) 툴 상단에 설명 문구 추가
- (예시) 예시 입력/결과 스니펫 추가
- (예시) 관련 기사로 연결하는 CTA 추가
- (예시) 모바일 UI 개선

## 작업 체크리스트

- [ ] 각 툴 페이지 상단에 1-2문장 설명 추가
- [ ] 입력 예시 + 결과 스니펫 추가
- [ ] 내부 링크(관련 기사) 2~3개 추가
- [ ] 모바일 뷰 확인 및 개선
- [ ] Lighthouse 성능 체크 (가능하면)

## 파일/경로

- 변경 대상(예): `/contents/tools/prepayment-fee-calculator.md` 또는 `/src/pages/tools/prepayment-fee-calculator.astro`

## 테스트 방법

- 로컬 서버에서 변경 확인: `npm run dev` 후 해당 툴 페이지 접속
- 모바일 뷰 확인: 브라우저 디바이스 툴 사용

## 참고: GA 인사이트

- 최근 GA(Last7Days)에서 `/tools/` 평균 체류가 낮음(약 3.8s). 내부 링크와 예시 추가가 우선 권장됩니다.

<!-- Reviewers: assign relevant frontend/content authors -->
