import assert from 'node:assert/strict';
import { getMobileDisplayMetrics, isPortraitMobile } from '../src/game/mobileDisplay';

const desktop = getMobileDisplayMetrics({
    cssHeight: 760,
    cssWidth: 1200,
    logicalHeight: 760,
    logicalWidth: 1200,
    isMobileDevice: false,
});
assert.equal(desktop.layout, 'desktop');

const landscapeMobile = getMobileDisplayMetrics({
    cssHeight: 390,
    cssWidth: 844,
    logicalHeight: 760,
    logicalWidth: 1200,
    isMobileDevice: true,
});
assert.equal(landscapeMobile.layout, 'landscape-mobile');
assert.equal(landscapeMobile.logicalWidth, 1200);
assert.equal(landscapeMobile.cssWidth, 844);

const portraitMobile = getMobileDisplayMetrics({
    cssHeight: 844,
    cssWidth: 390,
    logicalHeight: 760,
    logicalWidth: 1200,
    isMobileDevice: true,
});
assert.equal(portraitMobile.layout, 'portrait-mobile');
assert.equal(isPortraitMobile(portraitMobile), true);

const touchDesktop = getMobileDisplayMetrics({
    cssHeight: 600,
    cssWidth: 800,
    logicalHeight: 760,
    logicalWidth: 1200,
    isMobileDevice: false,
});
assert.equal(touchDesktop.layout, 'desktop');

console.log('PASS: mobile display layout distinguishes CSS display size from the logical Phaser viewport');
