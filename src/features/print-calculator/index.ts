    import type { ModelAnalysis } from '../../workers/stlAnalyzer.worker';
    import { MATERIAL_PROFILES as materialProfiles, PRINTER_PROFILES as printerProfiles, PRINT_INTENTS as intents } from '../../data/print-calculator/profiles';
import type { PrinterProfile } from '../../data/print-calculator/profiles';
import { formatNumber } from './formatters';
import type { PathEstimate } from './types';

export function initPrintCalculator(root: HTMLElement) {
    const $ = <T extends HTMLElement>(id:string) => root.querySelector('#' + id) as T;
    const input = $('stl-input') as HTMLInputElement, status = $('status'), error = $('error'), calculate = $('calculate') as HTMLButtonElement;
    const progressWrap = $('analysis-progress-wrap'), progressBar = $('analysis-progress'), progressLabel = $('analysis-progress-label');
    function setProgress(value: number, label: string) { progressWrap.classList.remove('hidden'); progressBar.style.width = `${value}%`; progressLabel.textContent = `${label} · ${value}%`; }
    function hideProgress() { progressWrap.classList.add('hidden'); progressBar.style.width = '0%'; }
    let analysis: ModelAnalysis | null = null, vertices: Float32Array | null = null, pathEstimate: PathEstimate | null = null, pathProgress = 0, pathLayerProgress = '', renderer: any, camera: any, controls: any, scene: any, currentMesh: any;
    function populate(id:string, entries: [string,string][]) { $(id).innerHTML = entries.map(([v,l]) => `<option value="${v}">${l}</option>`).join(''); }
    const printers = printerProfiles;
    const materials = Object.fromEntries(Object.entries(materialProfiles).map(([id, m]) => [id, { ...m, density: m.densityGPerCm3, nozzle: m.defaultNozzleTemperature, bed: m.defaultBedTemperature, fan: m.defaultFanPercent, flow: m.maxVolumetricFlowMm3PerSec, price: m.defaultSpoolPriceKRW, warp: m.warpingRisk }]));
    populate('printer', printers.map(p=>[p.id,`${p.manufacturer} ${p.name}`])); populate('material', Object.entries(materials).map(([id,m])=>[id,m.name])); populate('support-material', Object.entries(materials).map(([id,m])=>[id,m.name])); populate('intent', Object.entries(intents).map(([id,p])=>[id,p.name]));
    const materialSelect = $('material') as HTMLSelectElement, priceInput = $('filament-price') as HTMLInputElement;
    priceInput.value = String(materials.pla.price); materialSelect.onchange = () => { priceInput.value = String(materials[materialSelect.value as keyof typeof materials].price); ($('support-material') as HTMLSelectElement).value = materialSelect.value; };
    const number = formatNumber;
    function selectedPrinter() { const p = printers.find(p=>p.id===($('printer') as HTMLSelectElement).value)!; const volume = activeBuildVolume(p); const nominalFlowCap = p.typicalPrintSpeedMmPerSec * .45 * .2; return { ...p, x: volume.x, y: volume.y, z: volume.z, power: p.averagePrintingPowerWatts, speed: p.typicalPrintSpeedMmPerSec, flow: Math.min(p.maxVolumetricFlowMm3PerSec ?? Infinity, nominalFlowCap), correction: p.defaultTimeCorrectionFactor }; }
    function activeBuildVolume(p: PrinterProfile) { return p.id === 'h2d' && ($('h2d-mode') as HTMLSelectElement).value === 'dual' ? p.alternateBuildVolumes![0].buildVolume : p.buildVolume; }
    function setError(message:string) { error.textContent=message; error.classList.remove('hidden'); status.textContent='분석을 완료하지 못했습니다.'; }
    function updatePathResultCard() { const value = root.querySelector('#path-estimate-value'); if (value && !pathEstimate) value.innerHTML = `경로 분석 중 ${pathProgress}%<small>${pathLayerProgress || '완료 전에는 형상 기반 근사값을 사용합니다.'}</small>`; }
    async function startPathEstimate(file: File) {
        const worker = new Worker(new URL('../../workers/stlPathEstimator.worker.ts', import.meta.url), { type: 'module' });
        pathProgress = 0; pathLayerProgress = ''; setProgress(0, '경로 분석 준비 중'); updatePathResultCard();
        worker.onmessage = ({ data }) => { if (data.type === 'progress') { pathProgress = data.value; pathLayerProgress = `${data.currentLayer}/${data.totalLayers} 레이어 처리${data.sampledLayers !== data.totalLayers ? ' · 샘플링' : ''}`; setProgress(data.value, `경로 분석 중 · ${pathLayerProgress}`); updatePathResultCard(); return; } worker.terminate(); if (data.type === 'complete') { pathEstimate = data; const value = root.querySelector('#path-estimate-value'); if (value) value.innerHTML = `${number(data.perimeterMm, 0)} mm 외벽 경로<small>${data.totalLayers}개 레이어 · 외곽 ${number(data.outerLoops, 0)}개 · 구멍 ${number(data.holeLoops, 0)}개${data.openChains ? ` · 열린 체인 ${number(data.openChains, 0)}개` : ''}${data.sampled ? ' · 대형 모델 레이어 샘플링 보정' : ''}</small>`; hideProgress(); status.textContent = `경로 분석 완료 · ${number(data.perimeterMm, 0)}mm 외벽 경로${data.sampled ? ' (레이어 샘플링)' : ''}`; } };
        worker.postMessage({ buffer: await file.arrayBuffer(), layerHeight: .2 });
    }
    async function useFile(file: File) {
        error.classList.add('hidden'); if (!file.name.toLowerCase().endsWith('.stl')) return setError('STL 파일만 선택할 수 있습니다.'); if (file.size > 100 * 1024 * 1024) return setError('파일이 100MB를 초과합니다. 더 작은 STL 파일을 선택하세요.');
        analysis=null; pathEstimate=null; pathProgress=0; pathLayerProgress=''; calculate.disabled=true; status.textContent='STL 읽는 중…'; const worker = new Worker(new URL('../../workers/stlAnalyzer.worker.ts', import.meta.url), {type:'module'});
        worker.onmessage = async ({data}) => { if (data.type === 'progress') return setProgress(data.value, data.stage); worker.terminate(); if (data.type==='error') return setError(data.message); hideProgress(); analysis=data.analysis; vertices=data.vertices; status.textContent=`메시 분석 완료 · ${number(analysis!.triangleCount,0)}개 삼각형`; $('file-details').className='mt-4 flex items-center justify-between rounded-lg bg-muted p-3 text-sm'; $('file-details').innerHTML=`<span><strong>${file.name}</strong><br>${number(file.size/1024/1024,2)} MB · ${number(analysis!.triangleCount,0)} triangles</span><button id="remove-file" class="rounded border px-3 py-1">제거</button>`; $('remove-file').onclick=removeFile; $('preview-section').classList.remove('hidden'); calculate.disabled=false; $('model-size').textContent=`X ${number(analysis!.width)} × Y ${number(analysis!.depth)} × Z ${number(analysis!.height)} mm`; await renderModel(); updateBedWarning(); updateOrientationRecommendation(); startPathEstimate(file); };
        status.textContent='메시 분석 중…'; worker.postMessage({type:'analyze', buffer:await file.arrayBuffer()});
    }
    function removeFile() { analysis=null; vertices=null; pathEstimate=null; pathProgress=0; pathLayerProgress=''; hideProgress(); calculate.disabled=true; $('file-details').className='mt-4 hidden'; $('preview-section').classList.add('hidden'); $('results').classList.add('hidden'); status.textContent='파일을 선택하면 분석을 시작합니다.'; if(renderer) { renderer.dispose(); renderer=null; } }
    input.onchange=()=> { const f=input.files?.[0]; if(f) useFile(f); }; const drop=$('drop-zone'); ['dragenter','dragover'].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add('bg-primary/10')})); ['dragleave','drop'].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove('bg-primary/10')})); drop.addEventListener('drop',(e:DragEvent)=>{const f=e.dataTransfer?.files[0]; if(f) useFile(f)});
    async function renderModel() {
        if (!vertices) return;
        const THREE = await import('three');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        const host = $('three-preview');
        host.innerHTML = '';
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(host.clientWidth, host.clientHeight);
        host.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#0f172a');
        camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, .1, 10000);
        controls = new OrbitControls(camera, renderer.domElement);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.computeVertexNormals();

        // STL은 보통 Z-up이다. Three.js 베드(GridHelper)는 Y-up/XZ 평면이므로
        // Z를 Y로 변환한 후 모델의 최저점을 베드(Y=0)에 맞춘다.
        geo.rotateX(-Math.PI / 2);
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const center = box.getCenter(new THREE.Vector3());
        geo.translate(-center.x, -box.min.y, -center.z);

        currentMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#e6a84b', metalness: .15, roughness: .55, side: THREE.DoubleSide }));
        scene.add(currentMesh, new THREE.HemisphereLight('#fff7dd', '#172033', 2));
        const grid = new THREE.GridHelper(Math.max(220, analysis!.width * 1.35, analysis!.depth * 1.35), 12, '#64748b', '#334155');
        scene.add(grid);
        scene.add(new THREE.Box3Helper(new THREE.Box3().setFromObject(currentMesh), '#f8fafc'));
        const reset = () => {
            const d = Math.max(analysis!.width, analysis!.depth, analysis!.height) * 1.8 + 100;
            camera.position.set(d, d, d * .75);
            controls.target.set(0, analysis!.height / 2, 0);
            controls.update();
        };
        reset();
        $('reset-camera').onclick = reset;
        const loop = () => { if (!renderer) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); };
        loop();
    }
    function updateBedWarning(){ if(!analysis)return; const p=selectedPrinter(); const warning=$('bed-warning'); const fits=analysis.width<=p.x&&analysis.depth<=p.y&&analysis.height<=p.z; warning.classList.toggle('hidden',fits); warning.textContent=fits?'':`선택한 프린터의 빌드 볼륨(${p.x} × ${p.y} × ${p.z} mm)을 초과합니다.`; }
    function updateOrientationRecommendation() { if (!analysis) return; const candidates = [{ axis: 'Z', base: analysis.width * analysis.depth, height: analysis.height }, { axis: 'Y', base: analysis.width * analysis.height, height: analysis.depth }, { axis: 'X', base: analysis.depth * analysis.height, height: analysis.width }]; const current = candidates[0]; const best = candidates.reduce((a, b) => a.base / a.height > b.base / b.height ? a : b); const box = $('orientation-recommendation'); if (best.axis === 'Z' || best.base / best.height < current.base / current.height * 1.2) { box.classList.add('hidden'); return; } box.classList.remove('hidden'); box.innerHTML = `<strong>방향 확인 권장</strong><p class="mt-1 text-muted-foreground">${best.axis}축을 높이로 두면 바닥 면적 대비 높이 비율이 더 안정적일 수 있습니다. 현재 견적은 STL의 현재 방향을 기준으로 합니다.</p>`; }
    function updateMultiMaterialFields() { const p = selectedPrinter(); const enabled = p.id === 'h2d' && ($('h2d-mode') as HTMLSelectElement).value === 'dual'; $('h2d-mode-field').classList.toggle('hidden', p.id !== 'h2d'); $('multi-material-fields').classList.toggle('hidden', !enabled); }
    ($('printer') as HTMLSelectElement).onchange=()=>{ updateMultiMaterialFields(); updateBedWarning(); };
    ($('h2d-mode') as HTMLSelectElement).onchange=()=>{ updateMultiMaterialFields(); updateBedWarning(); };
    calculate.onclick = () => {
        if (!analysis) return;
        const p = selectedPrinter();
        const m = materials[materialSelect.value as keyof typeof materials];
        const supportMaterial = materials[($('support-material') as HTMLSelectElement).value as keyof typeof materials];
        const preset = intents[($('intent') as HTMLSelectElement).value as keyof typeof intents];
        const nozzle = Number(($('nozzle') as HTMLSelectElement).value);
        const support = ($('support') as HTMLInputElement).checked;
        const brim = ($('brim') as HTMLInputElement).checked;
        const dual = p.id === 'h2d' && ($('h2d-mode') as HTMLSelectElement).value === 'dual';
        const purgeTower = dual && ($('purge-tower') as HTMLInputElement).checked && support;
        const modelVolume = analysis.volumeMm3 ?? analysis.width * analysis.depth * analysis.height * .18;
        const shapeShell = Math.min(modelVolume * .42, analysis.surfaceArea * (nozzle * .48 * 2.5));
        const pathShell = pathEstimate ? pathEstimate.perimeterMm * (.2 / preset.layer) * preset.walls * nozzle * preset.layer * .95 : 0;
        const shell = pathEstimate ? Math.min(modelVolume * .6, Math.max(shapeShell, pathShell)) : shapeShell;
        const fill = Math.max(0, modelVolume - shell) * preset.infill / 100;
        const supportVol = support ? modelVolume * Math.min(.2, .035 + analysis.overhangPercent / 380) : 0;
        const brimVol = brim ? analysis.contactArea * .7 : 0;
        const toolChanges = dual && supportVol ? Math.max(2, Math.round(layerCountEstimate(analysis.height, preset.layer) * Math.min(.5, .1 + analysis.overhangPercent / 200))) : 0;
        const purgeVol = purgeTower ? toolChanges * 35 : 0;
        const modelVol = shell + fill + brimVol;
        const totalVol = modelVol + supportVol + purgeVol;
        const modelGrams = modelVol / 1000 * m.density;
        const supportGrams = supportVol / 1000 * (dual ? supportMaterial.density : m.density);
        const purgeGrams = purgeVol / 1000 * m.density;
        const grams = modelGrams + supportGrams + purgeGrams;
        const lengthM = totalVol / (Math.PI * .875 * .875) / 1000;
        const layerCount = layerCountEstimate(analysis.height, preset.layer);
        const lineArea = nozzle * preset.layer * .95;
        const accelerationPenalty = 1 + Math.min(.3, 7000 / p.maxAccelerationMmPerSec2 * .1);
        const extrusionSeconds = (volume:number, speedMultiplier:number, materialFlow:number) => {
            const volumetric = Math.min(p.flow, materialFlow, p.speed * speedMultiplier * lineArea);
            return volume / Math.max(.1, volumetric) * accelerationPenalty;
        };
        const wallSeconds = extrusionSeconds(shell, .55 * preset.speed, m.flow);
        const infillSeconds = extrusionSeconds(fill + brimVol, preset.speed, m.flow);
        const supportSeconds = extrusionSeconds(supportVol, .65 * preset.speed, dual ? supportMaterial.flow : m.flow);
        const purgeSeconds = extrusionSeconds(purgeVol, .5, m.flow);
        const firstLayerVolume = Math.min(modelVol, (shell + fill) / Math.max(1, layerCount));
        const firstLayerPenaltySeconds = extrusionSeconds(firstLayerVolume, .28, m.flow) - extrusionSeconds(firstLayerVolume, preset.speed, m.flow);
        const estimatedTravelMm = pathEstimate ? pathEstimate.perimeterMm * .1 + layerCount * (analysis.width + analysis.depth) * .35 : layerCount * ((analysis.width + analysis.depth) * 1.35 + Math.sqrt(analysis.surfaceArea) * .18);
        const travelSeconds = estimatedTravelMm / Math.max(40, Math.min(p.maxTravelSpeedMmPerSec, p.speed * 2.5)) * accelerationPenalty;
        const layerChangeSeconds = layerCount * .65;
        const toolChangeHours = toolChanges * 8 / 3600;
        const hours = ((wallSeconds + infillSeconds + supportSeconds + purgeSeconds + Math.max(0, firstLayerPenaltySeconds) + travelSeconds + layerChangeSeconds) / 3600) * p.correction + toolChangeHours;
        const mainCost = modelGrams / 1000 * Number(priceInput.value);
        const supportCost = supportGrams / 1000 * (dual ? supportMaterial.price : Number(priceInput.value));
        const purgeCost = purgeGrams / 1000 * Number(priceInput.value);
        const materialCost = mainCost + supportCost + purgeCost;
        const powerCost = p.power / 1000 * hours * Number(($('electricity-price') as HTMLInputElement).value);
        const fit = analysis.width <= p.x && analysis.depth <= p.y && analysis.height <= p.z;
        const time = (h:number) => `${Math.floor(h)}시간 ${Math.round((h % 1) * 60)}분`;
        const rows = [
            ['예상 출력 시간', `${time(hours * .9)} ~ ${time(hours * 1.1)}<small>기준 ${time(hours)}${dual ? ` · 툴 전환 ${toolChanges}회 포함` : ''}</small>`],
            ['모델 재료량', `${number(modelGrams)} g`],
            ['서포트 재료량', `${number(supportGrams)} g${dual ? `<small>${supportMaterial.name} 사용</small>` : ''}`],
            ...(purgeTower ? [['퍼지 타워 재료량', `${number(purgeGrams)} g<small>전환 ${toolChanges}회 기준</small>`]] : []),
            ['총 필라멘트', `${number(grams)} g<small>${number(lengthM)} m · ${number(layerCount, 0)} 레이어</small>`],
            ['모델 분석', `표면적 ${number(analysis.surfaceArea / 100, 0)} cm²${analysis.volumeMm3 ? `<small>폐쇄 메시 체적 ${number(analysis.volumeMm3 / 1000, 1)} cm³</small>` : '<small>열린 메시: 체적 근사값 사용</small>'}`],
            ['경로 기반 보정', pathEstimate ? `${number(pathEstimate.perimeterMm, 0)} mm 외벽 경로<small>${pathEstimate.totalLayers}개 레이어 · 외곽 ${number(pathEstimate.outerLoops, 0)}개 · 구멍 ${number(pathEstimate.holeLoops, 0)}개${pathEstimate.openChains ? ` · 열린 체인 ${number(pathEstimate.openChains, 0)}개` : ''}${pathEstimate.sampled ? ' · 대형 모델 레이어 샘플링 보정' : ''}</small>` : `<span id="path-estimate-value">경로 분석 중 ${pathProgress}%<small>${pathLayerProgress || '완료 전에는 형상 기반 근사값을 사용합니다.'}</small></span>`],
            ['접지 / 오버행', `${number(analysis.contactArea / 100, 1)} cm² / ${number(analysis.overhangPercent)}%<small>베드 접촉 예상 면적 / 하향 오버행 면적 비율</small>`],
            ['필라멘트 비용', `${number(materialCost, 0)}원`],
            ['전기료 / 총 예상비용', `${number(powerCost, 0)}원 / ${number(materialCost + powerCost, 0)}원<small>${fit ? '선택한 베드에 적합' : '베드 크기 초과'} · 이동·가속도·레이어 전환 반영</small>`],
        ];
        $('result-grid').innerHTML = rows.map(([label, value]) => `<div class="rounded-xl bg-muted p-4"><p class="text-sm text-muted-foreground">${label}</p><p class="mt-1 text-lg font-semibold">${value}</p></div>`).join('');
        const rec = [[`레이어 ${preset.layer}mm · ${preset.walls}벽 · ${preset.infill}% ${preset.pattern}`, `${preset.name} 목적에 맞춘 균형 설정입니다. 노즐 ${nozzle}mm에서는 이 레이어 높이가 안정적입니다.`], [`노즐 ${m.nozzle}°C · 베드 ${m.bed}°C · 팬 ${m.fan}%`, `${m.name} 기본 프로파일입니다. 사용하는 필라멘트 제조사의 권장 범위를 우선하세요.`]];
        if (dual) rec.push(['H2D 듀얼 노즐 추정', `서포트 재료 ${supportMaterial.name}, 툴 전환 ${toolChanges}회${purgeTower ? ', 퍼지 타워' : ''}를 근사 반영했습니다. 실제 슬라이서의 퍼지값을 확인하세요.`]);
        if (analysis.overhangPercent > 12) rec.push([`서포트 ${support ? '사용' : '사용 권장'}`, `하향 오버행 예상 면적이 ${number(analysis.overhangPercent)}%입니다. 임계각 ${preset.support}°를 기준으로 확인하세요.`]);
        if (analysis.slenderness > 3 || analysis.contactArea < analysis.width * analysis.depth * .12) rec.push(['브림 5mm 권장', '모델 높이에 비해 베드 접촉 영역이 작아 흔들림이나 들뜸 가능성이 있습니다.']);
        const baseCoverage = analysis.contactArea / Math.max(1, analysis.width * analysis.depth);
        if (baseCoverage < .1 || (m.warp !== '낮음' && baseCoverage < .25)) rec.push(['첫 레이어 안정성 주의', `예상 베드 접촉 비율이 ${number(baseCoverage * 100)}%입니다. 베드 세척·Z 오프셋 확인과 브림 사용을 권장합니다.`]);
        if (m.warp === '높음' && !p.enclosed) rec.push(['밀폐형 프린터 권장', 'ABS는 수축과 워핑 위험이 높습니다. 현재 선택한 프린터는 밀폐형이 아닙니다.']);
        if (m.warp !== '낮음' && analysis.width * analysis.depth > 12000) rec.push(['큰 평면 워핑 주의', `${m.name}의 넓은 바닥면은 모서리 들뜸 위험이 있습니다. 예열된 베드, 브림과 낮은 첫 레이어 속도를 권장합니다.`]);
        if (!analysis.isClosed) rec.push(['메시 폐쇄 상태 확인', '완전히 닫히지 않은 메시로 판단되어 체적은 근사값을 사용했습니다. 슬라이서에서 메시 복구를 확인하세요.']);
        $('recommendations').innerHTML = rec.map(([title, text]) => `<div class="rounded-xl border p-4"><h3 class="font-semibold">${title}</h3><p class="mt-1 text-sm leading-6 text-muted-foreground">${text}</p></div>`).join('');
        $('results').classList.remove('hidden');
        $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    function layerCountEstimate(height: number, layerHeight: number) { return Math.ceil(height / layerHeight); }

}
