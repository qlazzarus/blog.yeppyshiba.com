export type RideIntensity = 'easy' | 'normal' | 'hard';
export type SweatRate = 'low' | 'normal' | 'high';

export type RideFuelingInput = {
    distanceKm: number;
    durationMinutes: number;
    elevationGainM?: number;
    temperatureC: number;
    intensity: RideIntensity;
    bodyWeightKg?: number;
    sweatRate: SweatRate;
};

export type RideFuelingResult = {
    waterMlMin: number;
    waterMlMax: number;
    carbGramMin: number;
    carbGramMax: number;
    electrolyteRecommended: boolean;
    gelCount: number;
    barCount: number;
    bottleCount500ml: number;
    preRideAdvice: string[];
    duringRideAdvice: string[];
    postRideAdvice: string[];
    warnings: string[];
};

const GEL_CARB_GRAMS = 25;
const BAR_CARB_GRAMS = 35;

export function calculateRideFueling(input: RideFuelingInput): RideFuelingResult {
    const distanceKm = normalizePositiveNumber(input.distanceKm);
    const durationMinutes = normalizePositiveNumber(input.durationMinutes);
    const elevationGainM = normalizeNonNegativeNumber(input.elevationGainM ?? 0);
    const temperatureC = Number(input.temperatureC);
    const bodyWeightKg = normalizePositiveNumber(input.bodyWeightKg ?? 70);

    if (!distanceKm || !durationMinutes || !Number.isFinite(temperatureC)) {
        throw new Error('거리, 예상 시간, 기온을 올바르게 입력해 주세요.');
    }

    const durationHours = durationMinutes / 60;
    const [hourlyWaterMin, hourlyWaterMax] = getHourlyWaterRange(temperatureC);
    const sweatMultiplier = getSweatMultiplier(input.sweatRate);
    const waterMlMin = roundToNearestTen(hourlyWaterMin * durationHours * sweatMultiplier.min);
    const waterMlMax = roundToNearestTen(hourlyWaterMax * durationHours * sweatMultiplier.max);

    const [hourlyCarbMin, hourlyCarbMax] = getHourlyCarbRange(durationHours);
    const carbRange = adjustCarbRangeForIntensity(
        hourlyCarbMin * durationHours,
        hourlyCarbMax * durationHours,
        input.intensity,
    );
    const carbGramMin = Math.round(carbRange.min);
    const carbGramMax = Math.round(carbRange.max);

    const electrolyteRecommended =
        temperatureC >= 28 || durationHours >= 2 || input.sweatRate === 'high';

    const barCount = durationHours >= 3 ? Math.max(1, Math.floor(carbGramMax / BAR_CARB_GRAMS / 2)) : 0;
    const remainingCarbForGel = Math.max(0, carbGramMax - barCount * BAR_CARB_GRAMS);
    const gelCount = Math.ceil(remainingCarbForGel / GEL_CARB_GRAMS);
    const bottleCount500ml = Math.ceil(waterMlMax / 500);

    const warnings = [
        '계산 결과는 참고용이며 개인 체질, 날씨, 코스 난이도에 따라 달라질 수 있습니다.',
    ];

    if (temperatureC >= 30) {
        warnings.push('30도 이상에서는 폭염과 탈수 위험이 커지므로 그늘 휴식과 라이딩 강도 조절이 필요합니다.');
    }

    if (durationHours >= 3) {
        warnings.push('3시간 이상 라이딩은 보급 실패 위험이 커지므로 출발 전부터 섭취 간격을 정해두는 것이 좋습니다.');
    }

    if (waterMlMax >= 2000) {
        warnings.push('필요 수분이 2L 이상입니다. 중간 보급지나 편의점 위치를 미리 확인하세요.');
    }

    if (elevationGainM >= 500) {
        warnings.push(
            `획득고도 ${Math.round(elevationGainM)}m가 반영되었습니다. 긴 업힐 전에는 물과 탄수화물을 먼저 보충하세요.`,
        );
    }

    return {
        waterMlMin,
        waterMlMax,
        carbGramMin,
        carbGramMax,
        electrolyteRecommended,
        gelCount,
        barCount,
        bottleCount500ml,
        preRideAdvice: buildPreRideAdvice(durationHours, temperatureC, bodyWeightKg),
        duringRideAdvice: buildDuringRideAdvice(
            waterMlMin,
            waterMlMax,
            carbGramMin,
            carbGramMax,
            electrolyteRecommended,
            durationHours,
        ),
        postRideAdvice: buildPostRideAdvice(durationHours, bodyWeightKg),
        warnings,
    };
}

function normalizePositiveNumber(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeNonNegativeNumber(value: number): number {
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getHourlyWaterRange(temperatureC: number): [number, number] {
    if (temperatureC < 20) return [400, 500];
    if (temperatureC < 28) return [500, 700];
    return [700, 900];
}

function getSweatMultiplier(sweatRate: SweatRate): { min: number; max: number } {
    if (sweatRate === 'high') return { min: 1.15, max: 1.2 };
    if (sweatRate === 'low') return { min: 0.9, max: 0.9 };
    return { min: 1, max: 1 };
}

function getHourlyCarbRange(durationHours: number): [number, number] {
    if (durationHours < 1) return [0, 20];
    if (durationHours < 2) return [30, 30];
    if (durationHours < 3) return [40, 60];
    return [60, 90];
}

function adjustCarbRangeForIntensity(
    min: number,
    max: number,
    intensity: RideIntensity,
): { min: number; max: number } {
    if (intensity === 'easy') {
        return {
            min,
            max: min + (max - min) * 0.65,
        };
    }

    if (intensity === 'hard') {
        return {
            min: min + (max - min) * 0.45,
            max,
        };
    }

    return { min, max };
}

function roundToNearestTen(value: number): number {
    return Math.round(value / 10) * 10;
}

function buildPreRideAdvice(
    durationHours: number,
    temperatureC: number,
    bodyWeightKg: number,
): string[] {
    const advice = [
        `출발 2~3시간 전 물 400~600ml를 나눠 마시고, 체중 ${Math.round(bodyWeightKg)}kg 기준으로 소화 잘 되는 탄수화물을 준비하세요.`,
        '출발 직전에는 한 번에 많이 마시기보다 목을 축이는 정도로 시작하세요.',
    ];

    if (durationHours >= 2) {
        advice.push('2시간 이상 라이딩이라면 젤, 바, 전해질을 바로 꺼낼 수 있는 위치에 나눠 넣어두세요.');
    }

    if (temperatureC >= 28) {
        advice.push('더운 날에는 출발 전에 물통 한 개 이상을 차갑게 준비하면 초반 체온 관리에 도움이 됩니다.');
    }

    return advice;
}

function buildDuringRideAdvice(
    waterMlMin: number,
    waterMlMax: number,
    carbGramMin: number,
    carbGramMax: number,
    electrolyteRecommended: boolean,
    durationHours: number,
): string[] {
    const advice = [
        `라이딩 중 물은 총 ${formatMlRange(waterMlMin, waterMlMax)}를 목표로 10~15분마다 조금씩 마시세요.`,
    ];

    if (carbGramMax > 0) {
        advice.push(`탄수화물은 총 ${carbGramMin}~${carbGramMax}g을 목표로 30~45분 간격으로 나눠 섭취하세요.`);
    } else {
        advice.push('1시간 미만 라이딩은 식사를 충분히 했다면 탄수화물 보급 없이도 진행할 수 있습니다.');
    }

    if (electrolyteRecommended) {
        advice.push('전해질은 물통에 섞거나 정제 형태로 준비해 땀을 많이 흘리는 구간 전에 섭취하세요.');
    }

    if (durationHours >= 3) {
        advice.push('장거리에서는 배고픔을 느낀 뒤보다 먼저 먹는 쪽이 페이스 유지에 유리합니다.');
    }

    return advice;
}

function buildPostRideAdvice(durationHours: number, bodyWeightKg: number): string[] {
    const advice = [
        `도착 후에는 물을 천천히 보충하고, 체중 ${Math.round(bodyWeightKg)}kg 기준으로 단백질과 탄수화물이 있는 식사를 챙기세요.`,
    ];

    if (durationHours >= 2) {
        advice.push('긴 라이딩 후에는 소변 색과 갈증을 확인해 부족한 수분을 추가로 보충하세요.');
    }

    return advice;
}

function formatMlRange(min: number, max: number): string {
    return `${(min / 1000).toFixed(1)}~${(max / 1000).toFixed(1)}L`;
}
