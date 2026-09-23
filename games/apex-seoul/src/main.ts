import Phaser from 'phaser';
import './styles.css';
import { APEX_SEOUL_GAME_CONFIG } from './game/timeAttackScene';
import { installMobileDisplayGuard } from './game/mobileDisplay';
import { initializePwaInstall, registerPwaServiceWorker } from './game/pwaInstall';
import { installVhsEffect } from './game/vhsEffect';

const container = document.getElementById('game');
if (!container) throw new Error('Missing #game container');
installMobileDisplayGuard(container);
initializePwaInstall();
registerPwaServiceWorker();
installVhsEffect(new Phaser.Game(APEX_SEOUL_GAME_CONFIG));
