export interface GpxPoint {
    lat: number;
    lng: number;
    ele?: number;
    time?: Date;
    distanceFromStart: number;
}

export type RiskType =
    | 'steep-uphill'
    | 'steep-downhill'
    | 'long-climb'
    | 'long-descent'
    | 'sharp-curve';

export type RiskSeverity = 'low' | 'medium' | 'high';

export interface GpxRiskSegment {
    id: string;
    type: RiskType;
    title: string;
    description: string;

    startIndex: number;
    endIndex: number;

    startLat: number;
    startLng: number;
    centerLat: number;
    centerLng: number;
    endLat: number;
    endLng: number;

    distance: number;
    avgGrade?: number;
    maxGrade?: number;
    minGrade?: number;
    curveAngle?: number;
    heading?: number;

    severity: RiskSeverity;
}
