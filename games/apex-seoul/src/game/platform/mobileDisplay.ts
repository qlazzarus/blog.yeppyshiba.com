import { isMobileDevice } from './motionSteeringPermission';

export type MobileDisplayLayout = 'desktop' | 'landscape-mobile' | 'portrait-mobile';

export type MobileDisplayMetrics = {
    cssHeight: number;
    cssWidth: number;
    layout: MobileDisplayLayout;
    logicalHeight: number;
    logicalWidth: number;
};

export const DISPLAY_CHANGE_EVENT = 'apex-seoul:display-change';
export const ORIENTATION_RESUME_EVENT = 'apex-seoul:orientation-resume';

type DisplayChangeEvent = CustomEvent<MobileDisplayMetrics>;

/**
 * Phaser's FIT viewport remains 1200×760 while its canvas can be physically
 * much smaller. Keep this display measurement separate from world geometry.
 */
export function getMobileDisplayMetrics(input: {
    cssHeight: number;
    cssWidth: number;
    logicalHeight: number;
    logicalWidth: number;
    isMobileDevice: boolean;
}): MobileDisplayMetrics {
    const isMobile = input.isMobileDevice && Math.min(input.cssWidth, input.cssHeight) < 700;
    const layout: MobileDisplayLayout = !isMobile
        ? 'desktop'
        : input.cssWidth > input.cssHeight
          ? 'landscape-mobile'
          : 'portrait-mobile';
    return {
        cssHeight: Math.max(0, Math.round(input.cssHeight)),
        cssWidth: Math.max(0, Math.round(input.cssWidth)),
        layout,
        logicalHeight: input.logicalHeight,
        logicalWidth: input.logicalWidth,
    };
}

export function getSceneMobileDisplayMetrics(scene: Phaser.Scene): MobileDisplayMetrics {
    const bounds = scene.game.canvas.getBoundingClientRect();
    return getMobileDisplayMetrics({
        cssHeight: bounds.height,
        cssWidth: bounds.width,
        logicalHeight: scene.scale.height,
        logicalWidth: scene.scale.width,
        isMobileDevice: isMobileDevice(),
    });
}

export function isPortraitMobile(metrics: MobileDisplayMetrics) {
    return metrics.layout === 'portrait-mobile';
}

export function installMobileDisplayGuard(container: HTMLElement) {
    const guard = document.createElement('div');
    guard.id = 'orientation-guard';
    guard.setAttribute('aria-live', 'assertive');
    guard.innerHTML = '<strong>ROTATE DEVICE</strong><span>Turn your phone sideways to race.</span>';

    const resume = document.createElement('button');
    resume.id = 'orientation-resume';
    resume.type = 'button';
    resume.textContent = 'TAP TO RESUME';
    resume.hidden = true;
    resume.addEventListener('click', () => {
        resume.hidden = true;
        window.dispatchEvent(new Event(ORIENTATION_RESUME_EVENT));
    });
    container.append(guard, resume);

    let wasPortraitMobile = false;
    let resumeRequired = false;
    const update = () => {
        const bounds = container.getBoundingClientRect();
        const metrics = getMobileDisplayMetrics({
            cssHeight: bounds.height,
            cssWidth: bounds.width,
            logicalHeight: 760,
            logicalWidth: 1200,
            isMobileDevice: isMobileDevice(),
        });
        const portrait = isPortraitMobile(metrics);
        if (wasPortraitMobile && !portrait) resumeRequired = true;
        wasPortraitMobile = portrait;
        guard.hidden = !portrait;
        resume.hidden = portrait || !resumeRequired;
        window.dispatchEvent(new CustomEvent<MobileDisplayMetrics>(DISPLAY_CHANGE_EVENT, { detail: metrics }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    update();

    return {
        clearResumeRequirement() {
            resumeRequired = false;
            resume.hidden = true;
        },
        destroy() {
            observer.disconnect();
            window.removeEventListener('orientationchange', update);
            window.removeEventListener('resize', update);
            guard.remove();
            resume.remove();
        },
    };
}

export function readDisplayChange(event: Event): MobileDisplayMetrics | null {
    return event instanceof CustomEvent ? (event as DisplayChangeEvent).detail : null;
}
