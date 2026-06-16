import { TILE_SIZE } from '../utils/helpers.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Tileset image (128×16 — eight 16×16 tiles in a single row)
        this.load.image('tileset', 'assets/tiles/tileset.png');

        // Player spritesheet (192×16 — twelve 16×16 frames)
        this.load.spritesheet('player', 'assets/sprites/player.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE
        });

        // NPC sprites (16×16 single-frame images)
        this.load.image('npc_elder', 'assets/sprites/elder.png');
        this.load.image('npc_merchant', 'assets/sprites/merchant.png');
        this.load.image('npc_scout', 'assets/sprites/questgiver.png');

        // World tile map (Tiled JSON format, created by a separate task)
        this.load.tilemapTiledJSON('world', 'assets/maps/world.json');
    }

    create() {
        // Walk animations: 3 frames per direction, 8 fps
        const directions = [
            { key: 'player-walk-down',  start: 0 },
            { key: 'player-walk-left',  start: 3 },
            { key: 'player-walk-right', start: 6 },
            { key: 'player-walk-up',    start: 9 }
        ];

        for (const dir of directions) {
            this.anims.create({
                key: dir.key,
                frames: this.anims.generateFrameNumbers('player', {
                    start: dir.start,
                    end: dir.start + 2
                }),
                frameRate: 8,
                repeat: -1
            });
        }

        this.scene.start('Menu');
    }
}
