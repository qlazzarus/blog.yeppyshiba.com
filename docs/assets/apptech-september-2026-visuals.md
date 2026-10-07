# 2026년 9월 앱테크 결산 시각 자료

표지는 내장 `image_gen` 도구로 생성했다. 생성 결과를 WebP로 인코딩해 블로그에 연결했다.

- 표지: `public/images/posts/202610/apptech-income-202609-cover.webp`
- 그래프: `public/images/posts/202610/apptech-income-trend-202605-202609.webp`
- 그래프 벡터 원본: 같은 파일명의 `.svg`
- 그래프 재생성: `node scripts/render-apptech-income-september-2026.mjs`

## 표지 생성 프롬프트

Use case: stylized-concept. Create a new wide 16:9 editorial cover illustration for Yeppyshiba Blog, September 2026 monthly app rewards income report. Refined soft 3D clay and frosted glass style, cream background, navy smartphone, mint teal savings vessels, golden coins, subtle golden ginkgo leaves for early autumn. Show a clear visual journey from small rewards emerging from a smartphone into two modest savings vessels, then a small healthy plant symbolizing long-term investing. Balanced spacious composition, soft studio light, tactile materials, sophisticated calm Korean personal finance blog aesthetic. No text, no letters, no numbers, no logos, no charts, no watermark. Do not imply guaranteed returns or extravagant wealth. Polished landscape blog cover with main objects safely inside central margins.

## 그래프 기준

5~8월은 기존 연재의 기록값 18,788원 / 35,789원 / 22,205원 / 23,959원을 유지했다. 9월은 최종 합계 34,985원으로 표시했다. 월별 수수료·혜택 집계 기준이 동일하지 않으므로 이를 이미지와 본문에 명시했다. 작성자 확인에 따라 모니모 앱 이벤트 적립 5,598원과 별도 주식 매도금 3,448원을 합산했다. 펀드 투자금은 수익에 다시 더하지 않았다. 그래프는 수치 정확성을 위해 코드로 SVG와 WebP를 생성했다.
