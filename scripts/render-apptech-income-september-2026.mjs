import fs from 'node:fs/promises';
import sharp from 'sharp';

// Historical published totals are intentionally preserved, not normalized.
const records = [
    { month: '5월', total: 18788, basis: '당시 결산 기준' },
    { month: '6월', total: 35789, basis: '당시 결산 기준' },
    { month: '7월', total: 22205, basis: '토스 수수료 차감 전' },
    { month: '8월', total: 23959, basis: '토스 수수료 차감 전' },
    { month: '9월', total: 34985, basis: '토스 수수료 차감 후' },
];
const output = 'public/images/posts/202610/apptech-income-trend-202605-202609';
const navy = '#13243b', blue = '#348dd1', teal = '#137e79';
const fmt = n => n.toLocaleString('en-US');
const x = i => 260 + i * 265;
const y = n => 650 - n / 40000 * 390;
const text = (x, y, content, size = 24, fill = navy, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${content}</text>`;
let parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1320" viewBox="0 0 1600 1320"><rect width="1600" height="1320" fill="#fcfbf8"/><g font-family="WenQuanYi Zen Hei, sans-serif">`,
    text(100, 75, 'YEPPYSHIBA BLOG  /  MONTHLY INCOME', 19, teal, 'letter-spacing="3"'),
    text(100, 146, '월별 앱테크 수익 추이', 52, navy, 'font-weight="bold"'),
    text(100, 194, '2026년 5–9월 · 각 월 결산에 기록한 합계 · MMF 수익 포함', 25, '#586777'),
    `<rect x="1207" y="99" width="292" height="54" rx="27" fill="#e1f0eb"/>`,
    text(1353, 135, '9월 결산 완료', 23, teal, 'text-anchor="middle"'),
];
for (let amount = 0; amount <= 40000; amount += 10000) {
    parts.push(`<path d="M190 ${y(amount)} H1455" stroke="#d8dfe2" stroke-dasharray="5 7"/>`, text(167, y(amount) + 8, fmt(amount), 22, '#586777', 'text-anchor="end"'));
}
parts.push(text(110, 240, '단위: 원', 19, '#586777'));
const points = records.slice(0, 4).map((r, i) => `${x(i)},${y(r.total)}`).join(' ');
parts.push(`<polyline points="${points}" fill="none" stroke="${blue}" stroke-width="5" stroke-linejoin="round"/>`);
parts.push(`<path d="M${x(3)} ${y(records[3].total)} L${x(4)} ${y(records[4].total)}" fill="none" stroke="${teal}" stroke-width="5"/>`);
records.forEach((r, i) => {
    const color = i === 4 ? teal : blue;
    parts.push(`<circle cx="${x(i)}" cy="${y(r.total)}" r="10" fill="${color}" stroke="${color}" stroke-width="4"/>`);
    parts.push(text(x(i), y(r.total) - 27, `${fmt(r.total)}원`, 29, color, 'text-anchor="middle" font-weight="bold"'));
    parts.push(text(x(i), 698, r.month, 27, navy, 'text-anchor="middle"'));
});
parts.push(`<rect x="100" y="751" width="1400" height="64" rx="12" fill="#e1f0eb"/>`);
parts.push(text(160, 793, '월', 24, navy, 'font-weight="bold"'), text(615, 793, '기록한 합계', 24, navy, 'text-anchor="end" font-weight="bold"'), text(710, 793, '집계 기준', 24, navy, 'font-weight="bold"'));
records.forEach((r, i) => {
    const top = 815 + i * 61;
    if (i === 4) parts.push(`<rect x="100" y="${top}" width="1400" height="61" fill="#eef6f2"/>`);
    parts.push(text(160, top + 40, `2026년 ${r.month}`, 24), text(615, top + 40, `${fmt(r.total)}원`, 25, i === 4 ? teal : navy, 'text-anchor="end" font-weight="bold"'), text(710, top + 40, r.basis, 23, '#586777'));
    parts.push(`<path d="M100 ${top+61} H1500" stroke="#d8dfe2"/>`);
});
parts.push(text(100, 1178, '월별 집계 기준이 달라 동일 조건의 수익률 비교가 아닙니다.', 23, '#586777'));
parts.push(text(100, 1219, '8월 수수료 차감 후 23,519원 → 9월 34,985원  (+11,466원)', 23, teal));
parts.push(text(100, 1260, '9월: 교통카드 캐시백 제외 · 모니모 수익 9,046원 포함 · 펀드 투자금 중복 합산 제외', 22, '#586777'));
parts.push('</g></svg>');
const svg = parts.join('\n');
await fs.writeFile(`${output}.svg`, svg);
await sharp(Buffer.from(svg)).webp({ quality: 92 }).toFile(`${output}.webp`);
console.log(output);
