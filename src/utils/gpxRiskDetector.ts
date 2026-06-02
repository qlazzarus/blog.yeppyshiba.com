import { bearingDegrees, gradePercent, midpoint, turnAngleDegrees } from './gpxGeo';
import type { GpxPoint, GpxRiskSegment, RiskSeverity, RiskType } from './gpxRiskTypes';

interface RiskDetectorOptions {
    steepUphillGrade: number;
    steepDownhillGrade: number;
    longClimbMinDistance: number;
    longClimbMinGrade: number;
    longDescentMinDistance: number;
    longDescentMaxGrade: number;
    sharpCurveAngle: number;
    minSegmentDistance: number;
}

const DEFAULT_OPTIONS: RiskDetectorOptions = {
    steepUphillGrade: 10,
    steepDownhillGrade: -8,
    longClimbMinDistance: 500,
    longClimbMinGrade: 5,
    longDescentMinDistance: 300,
    longDescentMaxGrade: -6,
    sharpCurveAngle: 70,
    minSegmentDistance: 30,
};

export function detectGpxRisks(
    points: GpxPoint[],
    options: Partial<RiskDetectorOptions> = {},
): GpxRiskSegment[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const risks: GpxRiskSegment[] = [
        ...detectGradeSegments(
            points,
            'steep-uphill',
            opts.steepUphillGrade,
            Infinity,
            opts.minSegmentDistance,
        ),
        ...detectGradeSegments(
            points,
            'steep-downhill',
            -Infinity,
            opts.steepDownhillGrade,
            opts.minSegmentDistance,
        ),
        ...detectLongClimb(points, opts),
        ...detectLongDescent(points, opts),
        ...detectSharpCurves(points, opts),
    ];

    return risks.map((risk, index) => ({
        ...risk,
        id: `risk-${index + 1}`,
    }));
}

function detectGradeSegments(
    points: GpxPoint[],
    type: 'steep-uphill' | 'steep-downhill',
    minGrade: number,
    maxGrade: number,
    minDistance: number,
): GpxRiskSegment[] {
    const risks: GpxRiskSegment[] = [];
    let startIndex: number | null = null;
    let grades: number[] = [];

    for (let i = 1; i < points.length; i++) {
        const grade = gradePercent(points[i - 1], points[i]);
        const matched = grade != null && grade >= minGrade && grade <= maxGrade;

        if (matched) {
            if (startIndex == null) startIndex = i - 1;
            grades.push(grade);
        } else if (startIndex != null) {
            const endIndex = i - 1;
            pushGradeRisk(
                risks,
                points,
                startIndex,
                endIndex,
                grades,
                type,
                minDistance,
            );
            startIndex = null;
            grades = [];
        }
    }

    if (startIndex != null) {
        pushGradeRisk(
            risks,
            points,
            startIndex,
            points.length - 1,
            grades,
            type,
            minDistance,
        );
    }

    return risks;
}

function detectLongClimb(
    points: GpxPoint[],
    opts: RiskDetectorOptions,
): GpxRiskSegment[] {
    return detectLongGradeRange(
        points,
        'long-climb',
        opts.longClimbMinGrade,
        Infinity,
        opts.longClimbMinDistance,
    );
}

function detectLongDescent(
    points: GpxPoint[],
    opts: RiskDetectorOptions,
): GpxRiskSegment[] {
    return detectLongGradeRange(
        points,
        'long-descent',
        -Infinity,
        opts.longDescentMaxGrade,
        opts.longDescentMinDistance,
    );
}

function detectLongGradeRange(
    points: GpxPoint[],
    type: 'long-climb' | 'long-descent',
    minGrade: number,
    maxGrade: number,
    minDistance: number,
): GpxRiskSegment[] {
    const risks: GpxRiskSegment[] = [];
    let startIndex: number | null = null;
    let grades: number[] = [];

    for (let i = 1; i < points.length; i++) {
        const grade = gradePercent(points[i - 1], points[i]);
        const matched = grade != null && grade >= minGrade && grade <= maxGrade;

        if (matched) {
            if (startIndex == null) startIndex = i - 1;
            grades.push(grade);
        } else if (startIndex != null) {
            const endIndex = i - 1;
            pushGradeRisk(
                risks,
                points,
                startIndex,
                endIndex,
                grades,
                type,
                minDistance,
            );
            startIndex = null;
            grades = [];
        }
    }

    if (startIndex != null) {
        pushGradeRisk(
            risks,
            points,
            startIndex,
            points.length - 1,
            grades,
            type,
            minDistance,
        );
    }

    return risks;
}

function detectSharpCurves(
    points: GpxPoint[],
    opts: RiskDetectorOptions,
): GpxRiskSegment[] {
    const risks: GpxRiskSegment[] = [];

    for (let i = 1; i < points.length - 1; i++) {
        const angle = turnAngleDegrees(points[i - 1], points[i], points[i + 1]);

        if (angle >= opts.sharpCurveAngle) {
            const center = points[i];
            const heading = bearingDegrees(points[i - 1], points[i + 1]);

            risks.push({
                id: '',
                type: 'sharp-curve',
                title: '급커브 구간',
                description: `진행 방향이 약 ${angle.toFixed(0)}° 꺾이는 구간입니다. 다운힐과 겹치면 감속이 필요합니다.`,
                startIndex: i - 1,
                endIndex: i + 1,
                startLat: points[i - 1].lat,
                startLng: points[i - 1].lng,
                centerLat: center.lat,
                centerLng: center.lng,
                endLat: points[i + 1].lat,
                endLng: points[i + 1].lng,
                distance:
                    points[i + 1].distanceFromStart - points[i - 1].distanceFromStart,
                curveAngle: angle,
                heading,
                severity: angle >= 100 ? 'high' : 'medium',
            });
        }
    }

    return risks;
}

function pushGradeRisk(
    risks: GpxRiskSegment[],
    points: GpxPoint[],
    startIndex: number,
    endIndex: number,
    grades: number[],
    type: RiskType,
    minDistance: number,
): void {
    if (endIndex <= startIndex) return;

    const start = points[startIndex];
    const end = points[endIndex];
    const segmentDistance = end.distanceFromStart - start.distanceFromStart;

    if (segmentDistance < minDistance) return;

    const segmentPoints = points.slice(startIndex, endIndex + 1);
    const center = midpoint(segmentPoints);

    const avgGrade = average(grades);
    const maxGrade = Math.max(...grades);
    const minGrade = Math.min(...grades);
    const heading = bearingDegrees(start, end);

    risks.push({
        id: '',
        type,
        title: getRiskTitle(type),
        description: getRiskDescription(
            type,
            segmentDistance,
            avgGrade,
            maxGrade,
            minGrade,
        ),
        startIndex,
        endIndex,
        startLat: start.lat,
        startLng: start.lng,
        centerLat: center.lat,
        centerLng: center.lng,
        endLat: end.lat,
        endLng: end.lng,
        distance: segmentDistance,
        avgGrade,
        maxGrade,
        minGrade,
        heading,
        severity: getGradeSeverity(type, avgGrade, maxGrade, minGrade),
    });
}

function getRiskTitle(type: RiskType): string {
    switch (type) {
        case 'steep-uphill':
            return '10% 이상 급경사 업힐';
        case 'steep-downhill':
            return '급다운힐 구간';
        case 'long-climb':
            return '긴 업힐 구간';
        case 'long-descent':
            return '긴 다운힐 구간';
        case 'sharp-curve':
            return '급커브 구간';
    }
}

function getRiskDescription(
    type: RiskType,
    distance: number,
    avgGrade: number,
    maxGrade: number,
    minGrade: number,
): string {
    const km =
        distance >= 1000
            ? `${(distance / 1000).toFixed(2)}km`
            : `${distance.toFixed(0)}m`;

    if (type === 'steep-uphill') {
        return `${km} 동안 평균 ${avgGrade.toFixed(1)}%, 최대 ${maxGrade.toFixed(1)}% 경사가 이어집니다.`;
    }

    if (type === 'steep-downhill') {
        return `${km} 동안 평균 ${avgGrade.toFixed(1)}%, 최저 ${minGrade.toFixed(1)}%의 다운힐이 이어집니다.`;
    }

    if (type === 'long-climb') {
        return `${km} 이상 이어지는 업힐 구간입니다. 체력 분배가 필요합니다.`;
    }

    if (type === 'long-descent') {
        return `${km} 이상 이어지는 다운힐 구간입니다. 브레이크 과열과 노면 상태를 확인하세요.`;
    }

    return '';
}

function getGradeSeverity(
    type: RiskType,
    avgGrade: number,
    maxGrade: number,
    minGrade: number,
): RiskSeverity {
    if (type === 'steep-uphill') {
        if (maxGrade >= 15 || avgGrade >= 12) return 'high';
        return 'medium';
    }

    if (type === 'steep-downhill') {
        if (minGrade <= -12 || avgGrade <= -10) return 'high';
        return 'medium';
    }

    if (type === 'long-climb' || type === 'long-descent') {
        return 'medium';
    }

    return 'low';
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
