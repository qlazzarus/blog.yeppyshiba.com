export function formatNumber(value: number, digits = 1) {
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(value);
}

export function formatDuration(hours: number) {
    return `${Math.floor(hours)}시간 ${Math.round((hours % 1) * 60)}분`;
}
