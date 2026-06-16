import { TILE_SIZE } from '../utils/helpers.js';
import { MAP_CONFIG } from '../data/maps.js';
import Player from '../entities/Player.js';

export class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    create(data) {
        const mode = data && data.mode ? data.mode : 'new_game';

        // Build the tile map from preloaded Tiled JSON.
        const map = this.make.tilemap({ key: MAP_CONFIG.key });
        const tileset = map.addTilesetImage(MAP_CONFIG.tilesetName, MAP_CONFIG.tilesetImage);

        // Create tile layers (order matters — ground renders below walls).
        this.groundLayer = map.createLayer(MAP_CONFIG.layers.ground, tileset);
        this.wallsLayer = map.createLayer(MAP_CONFIG.layers.walls, tileset);

        // Mark wall tiles that carry the custom "collides" property.
        this.wallsLayer.setCollisionByProperty({ collides: true });

        // Determine player spawn based on mode.
        let spawnX = MAP_CONFIG.playerSpawn.x;
        let spawnY = MAP_CONFIG.playerSpawn.y;

        if (mode === 'load_game') {
            const raw = localStorage.getItem('rpg_save_v1');
            if (raw) {
                try {
                    const save = JSON.parse(raw);
                    if (save.version === 1 && save.player) {
                        spawnX = save.player.x;
                        spawnY = save.player.y;
                    }
                } catch (_) {
                    // Corrupt save — fall through to default spawn.
                }
            }
        } else {
            // new_game — resolve spawn from the Objects layer, falling back to config.
            const objectsLayer = map.getObjectLayer(MAP_CONFIG.layers.objects);
            if (objectsLayer) {
                const spawnObj = objectsLayer.objects.find(
                    obj => obj.name === 'spawn' || obj.type === 'spawn'
                );
                if (spawnObj) {
                    spawnX = Math.floor(spawnObj.x / TILE_SIZE);
                    spawnY = Math.floor(spawnObj.y / TILE_SIZE);
                }
            }
        }

        // Spawn the player and configure collision / map bounds.
        this.player = new Player(this, spawnX, spawnY);
        this.player.setCollisionLayers([this.wallsLayer]);
        this.player.setMapBounds(map.width, map.height);

        // Camera follows the player, clamped to the map edges.
        const cam = this.cameras.main;
        cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        cam.startFollow(this.player.sprite, true);

        // Launch the HUD overlay and broadcast initial player stats.
        this.scene.launch('UIScene');
        this.player.emitStats();
    }

    update() {
        this.player.update();
    }
}
