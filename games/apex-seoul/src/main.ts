import Phaser from 'phaser';
import './styles.css';
import { APEX_SEOUL_GAME_CONFIG } from './game/timeAttackScene';
import { installMobileDisplayGuard } from './game/mobileDisplay';

const container = document.getElementById('game');
if (!container) throw new Error('Missing #game container');
installMobileDisplayGuard(container);
new Phaser.Game(APEX_SEOUL_GAME_CONFIG);
