export type MaterialId = 'pla' | 'petg' | 'abs';

export interface PrinterProfile {
    id: string;
    manufacturer: string;
    name: string;
    buildVolume: { x: number; y: number; z: number };
    alternateBuildVolumes?: { id: string; label: string; buildVolume: { x: number; y: number; z: number } }[];
    toolSystem: 'single' | 'dual-independent' | 'toolchanger';
    baseProfileId?: string;
    maxToolCount?: number;
    toolChangeSeconds?: number;
    purgeTowerDefault?: boolean;
    enclosed: boolean;
    chamberHeating?: { supported: boolean; maxTemperatureC?: number };
    defaultNozzleDiameter: number;
    supportedNozzleDiameters: number[];
    maxNozzleTemperatureC: number;
    maxBedTemperatureC: number;
    maxPrintSpeedMmPerSec: number;
    typicalPrintSpeedMmPerSec: number;
    maxTravelSpeedMmPerSec: number;
    maxAccelerationMmPerSec2: number;
    maxVolumetricFlowMm3PerSec?: number;
    averagePrintingPowerWatts: number;
    ratedPowerWatts?: number;
    defaultTimeCorrectionFactor: number;
    materialSupport: Record<MaterialId, 'recommended' | 'supported' | 'not-recommended'>;
    sourceType: 'manufacturer' | 'community-preset';
    sourceUrl: string;
    sourceCheckedAt: string;
}

const allMaterials = { pla: 'recommended', petg: 'recommended', abs: 'recommended' } as const;
const openFrameMaterials = { pla: 'recommended', petg: 'recommended', abs: 'not-recommended' } as const;

function profile(data: Omit<PrinterProfile, 'defaultNozzleDiameter' | 'supportedNozzleDiameters' | 'maxNozzleTemperatureC' | 'maxBedTemperatureC' | 'maxTravelSpeedMmPerSec' | 'sourceCheckedAt' | 'toolSystem'>): PrinterProfile {
    return { defaultNozzleDiameter: 0.4, supportedNozzleDiameters: [0.2, 0.4, 0.6, 0.8], maxNozzleTemperatureC: 300, maxBedTemperatureC: 100, maxTravelSpeedMmPerSec: 500, sourceCheckedAt: '2026-07-30', toolSystem: 'single', ...data };
}

export const PRINTER_PROFILES: PrinterProfile[] = [
    profile({ id: 'x1c', manufacturer: 'Bambu Lab', name: 'X1 Carbon', buildVolume: { x: 256, y: 256, z: 256 }, enclosed: true, maxBedTemperatureC: 110, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 200, maxAccelerationMmPerSec2: 20000, maxVolumetricFlowMm3PerSec: 32, averagePrintingPowerWatts: 120, ratedPowerWatts: 1000, defaultTimeCorrectionFactor: 1.02, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://public-cdn.bambulab.com/store/bambulab-X1-carbon-tech-specs.pdf' }),
    profile({ id: 'x1e', manufacturer: 'Bambu Lab', name: 'X1E', buildVolume: { x: 256, y: 256, z: 256 }, enclosed: true, chamberHeating: { supported: true, maxTemperatureC: 60 }, maxBedTemperatureC: 110, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 200, maxAccelerationMmPerSec2: 20000, maxVolumetricFlowMm3PerSec: 32, averagePrintingPowerWatts: 130, ratedPowerWatts: 1000, defaultTimeCorrectionFactor: 1.02, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://cdn1.bambulab.com/x1e/spec/Bambu%20Lab%20X1E%20Technical%20Specification.pdf' }),
    profile({ id: 'p1s', manufacturer: 'Bambu Lab', name: 'P1S', buildVolume: { x: 256, y: 256, z: 256 }, enclosed: true, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 180, maxAccelerationMmPerSec2: 20000, averagePrintingPowerWatts: 110, ratedPowerWatts: 1000, defaultTimeCorrectionFactor: 1.05, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://us.store.bambulab.com/products/p1s' }),
    profile({ id: 'p1p', manufacturer: 'Bambu Lab', name: 'P1P', buildVolume: { x: 256, y: 256, z: 256 }, enclosed: false, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 180, maxAccelerationMmPerSec2: 20000, averagePrintingPowerWatts: 100, ratedPowerWatts: 1000, defaultTimeCorrectionFactor: 1.06, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://us.store.bambulab.com/products/p1s' }),
    profile({ id: 'a1', manufacturer: 'Bambu Lab', name: 'A1', buildVolume: { x: 256, y: 256, z: 256 }, enclosed: false, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 150, maxAccelerationMmPerSec2: 10000, averagePrintingPowerWatts: 90, defaultTimeCorrectionFactor: 1.08, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://us.store.bambulab.com/products/A1/' }),
    profile({ id: 'a1-mini', manufacturer: 'Bambu Lab', name: 'A1 mini', buildVolume: { x: 180, y: 180, z: 180 }, enclosed: false, maxBedTemperatureC: 80, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 150, maxAccelerationMmPerSec2: 10000, averagePrintingPowerWatts: 70, defaultTimeCorrectionFactor: 1.08, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://us.store.bambulab.com/products/a1-mini?id=543566369394393101' }),
    profile({ id: 'h2d', manufacturer: 'Bambu Lab', name: 'H2D', toolSystem: 'dual-independent', buildVolume: { x: 325, y: 320, z: 325 }, alternateBuildVolumes: [{ id: 'dual', label: '듀얼 노즐', buildVolume: { x: 300, y: 320, z: 325 } }], enclosed: true, chamberHeating: { supported: true, maxTemperatureC: 65 }, maxNozzleTemperatureC: 350, maxBedTemperatureC: 120, maxPrintSpeedMmPerSec: 1000, typicalPrintSpeedMmPerSec: 250, maxAccelerationMmPerSec2: 20000, maxVolumetricFlowMm3PerSec: 40, averagePrintingPowerWatts: 170, defaultTimeCorrectionFactor: 1.02, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://eu.store.bambulab.com/products/h2d?from=home_page_3dprinter' }),
    profile({ id: 'ender3-v3-se', manufacturer: 'Creality', name: 'Ender-3 V3 SE', buildVolume: { x: 220, y: 220, z: 250 }, enclosed: false, maxPrintSpeedMmPerSec: 250, typicalPrintSpeedMmPerSec: 100, maxAccelerationMmPerSec2: 2500, averagePrintingPowerWatts: 120, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.12, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://forum.creality.com/t/ender-3-v3-vs-ender-3-v3-se-vs-ender-3-v3-ke/23425' }),
    profile({ id: 'ender3-v3-ke', manufacturer: 'Creality', name: 'Ender-3 V3 KE', buildVolume: { x: 220, y: 220, z: 240 }, enclosed: false, maxPrintSpeedMmPerSec: 500, typicalPrintSpeedMmPerSec: 180, maxAccelerationMmPerSec2: 8000, averagePrintingPowerWatts: 130, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.10, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://cdn.creality.com/ow/official/8b3ce46c-754d-4a8c-b5c2-8003b9f5e374.pdf' }),
    profile({ id: 'ender3-v3', manufacturer: 'Creality', name: 'Ender-3 V3', buildVolume: { x: 220, y: 220, z: 250 }, enclosed: false, maxPrintSpeedMmPerSec: 600, typicalPrintSpeedMmPerSec: 180, maxAccelerationMmPerSec2: 20000, averagePrintingPowerWatts: 130, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.10, materialSupport: openFrameMaterials, sourceType: 'manufacturer', sourceUrl: 'https://www.creality.com/products/creality-ender-3-v3' }),
    profile({ id: 'ender3-s1', manufacturer: 'Creality', name: 'Ender-3 S1', buildVolume: { x: 220, y: 220, z: 270 }, enclosed: false, maxPrintSpeedMmPerSec: 150, typicalPrintSpeedMmPerSec: 80, maxAccelerationMmPerSec2: 2000, averagePrintingPowerWatts: 130, defaultTimeCorrectionFactor: 1.15, materialSupport: openFrameMaterials, sourceType: 'community-preset', sourceUrl: 'https://www.creality.com/' }),
    profile({ id: 'k1', manufacturer: 'Creality', name: 'K1', buildVolume: { x: 220, y: 220, z: 250 }, enclosed: true, maxPrintSpeedMmPerSec: 600, typicalPrintSpeedMmPerSec: 220, maxAccelerationMmPerSec2: 20000, maxVolumetricFlowMm3PerSec: 32, averagePrintingPowerWatts: 140, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.07, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://www.creality.com/products/creality-k1-3d-printer' }),
    profile({ id: 'k1c', manufacturer: 'Creality', name: 'K1C', buildVolume: { x: 220, y: 220, z: 250 }, enclosed: true, maxPrintSpeedMmPerSec: 600, typicalPrintSpeedMmPerSec: 220, maxAccelerationMmPerSec2: 20000, averagePrintingPowerWatts: 140, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.07, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://www.creality.com/products/k1c-carbon-3d-printer' }),
    profile({ id: 'k1-max', manufacturer: 'Creality', name: 'K1 Max', buildVolume: { x: 300, y: 300, z: 300 }, enclosed: true, maxPrintSpeedMmPerSec: 600, typicalPrintSpeedMmPerSec: 220, maxAccelerationMmPerSec2: 20000, averagePrintingPowerWatts: 180, ratedPowerWatts: 350, defaultTimeCorrectionFactor: 1.07, materialSupport: allMaterials, sourceType: 'manufacturer', sourceUrl: 'https://www.creality.com/products/creality-k1-max-3d-printer' }),
    profile({ id: 'ender5-s1', manufacturer: 'Creality', name: 'Ender-5 S1', buildVolume: { x: 220, y: 220, z: 280 }, enclosed: false, maxPrintSpeedMmPerSec: 250, typicalPrintSpeedMmPerSec: 120, maxAccelerationMmPerSec2: 2000, averagePrintingPowerWatts: 140, defaultTimeCorrectionFactor: 1.12, materialSupport: openFrameMaterials, sourceType: 'community-preset', sourceUrl: 'https://www.creality.com/' }),
    // Voron은 빌드 크기·핫엔드·툴 수·전력·가속도가 커뮤니티/사용자 구성마다 크게 달라
    // 보수적인 기본 견적을 검증할 수 있을 때까지 선택지에서 제외한다.
    // profile({ id: 'voron-trident', manufacturer: 'Voron', name: 'Trident', ... }),
    // profile({ id: 'voron-24', manufacturer: 'Voron', name: '2.4', ... }),
    // profile({ id: 'voron-24-stealthchanger', manufacturer: 'Voron', name: '2.4 StealthChanger', toolSystem: 'toolchanger', ... }),
];

export const MATERIAL_PROFILES = {
    pla: { id: 'pla', name: 'PLA', densityGPerCm3: 1.24, defaultNozzleTemperature: 210, defaultBedTemperature: 60, defaultFanPercent: 100, maxVolumetricFlowMm3PerSec: 12, defaultSpoolPriceKRW: 24000, warpingRisk: '낮음' },
    petg: { id: 'petg', name: 'PETG', densityGPerCm3: 1.27, defaultNozzleTemperature: 240, defaultBedTemperature: 75, defaultFanPercent: 35, maxVolumetricFlowMm3PerSec: 9, defaultSpoolPriceKRW: 28000, warpingRisk: '중간' },
    abs: { id: 'abs', name: 'ABS', densityGPerCm3: 1.04, defaultNozzleTemperature: 250, defaultBedTemperature: 100, defaultFanPercent: 10, maxVolumetricFlowMm3PerSec: 10, defaultSpoolPriceKRW: 30000, warpingRisk: '높음' },
} as const;

export const PRINT_INTENTS = {
    draft: { name: '빠른 초안', layer: 0.28, walls: 2, infill: 12, pattern: 'Gyroid', speed: 1.25, support: 55 },
    normal: { name: '일반 출력', layer: 0.2, walls: 3, infill: 15, pattern: 'Gyroid', speed: 1, support: 50 },
    quality: { name: '고품질', layer: 0.12, walls: 3, infill: 15, pattern: 'Gyroid', speed: 0.65, support: 45 },
    strength: { name: '강도 우선', layer: 0.2, walls: 4, infill: 35, pattern: 'Gyroid', speed: 0.8, support: 50 },
    appearance: { name: '외관 우선', layer: 0.16, walls: 3, infill: 12, pattern: 'Gyroid', speed: 0.75, support: 45 },
} as const;
