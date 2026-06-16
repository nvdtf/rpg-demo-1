import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { CombatScene } from './scenes/CombatScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: document.body,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, WorldScene, CombatScene, GameOverScene, UIScene]
};

const game = new Phaser.Game(config);
