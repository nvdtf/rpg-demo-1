import { TILE_SIZE } from '../utils/helpers.js';
import { MAP_CONFIG } from '../data/maps.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import ENEMIES from '../data/enemies.js';

export class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    create(data) {
        const mode = data && data.mode ? data.mode : 'new_game';
        this.inCombat = false;

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

        // Spawn enemies and register overlap detection with the player.
        this.enemies = this._spawnEnemies(map);

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

    /* ── enemy spawning ────────────────────────────────────────────── */

    /**
     * Read enemy spawn points from the Tiled Objects layer (objects with
     * type "enemy" and name matching an ENEMIES key).  Falls back to
     * hardcoded positions when the map has no enemy objects.
     */
    _spawnEnemies(map) {
        const enemies = [];

        const objectsLayer = map.getObjectLayer(MAP_CONFIG.layers.objects);
        let spawns = [];
        if (objectsLayer) {
            spawns = objectsLayer.objects.filter(obj => obj.type === 'enemy');
        }

        if (spawns.length > 0) {
            for (const obj of spawns) {
                const template = ENEMIES[obj.name];
                if (!template) continue;
                const tileX = Math.floor(obj.x / TILE_SIZE);
                const tileY = Math.floor(obj.y / TILE_SIZE);
                const enemy = new Enemy(this, tileX, tileY, template);
                enemy.addOverlap(this.player.sprite, () => this._onEnemyContact(enemy), this);
                enemies.push(enemy);
            }
        } else {
            const fallbackSpawns = [
                { id: 'slime',    tileX: 20, tileY: 20 },
                { id: 'slime',    tileX: 30, tileY: 15 },
                { id: 'goblin',   tileX: 35, tileY: 30 },
                { id: 'wolf',     tileX: 15, tileY: 35 },
                { id: 'skeleton', tileX: 40, tileY: 40 },
            ];
            for (const spawn of fallbackSpawns) {
                const template = ENEMIES[spawn.id];
                if (!template) continue;
                const enemy = new Enemy(this, spawn.tileX, spawn.tileY, template);
                enemy.addOverlap(this.player.sprite, () => this._onEnemyContact(enemy), this);
                enemies.push(enemy);
            }
        }

        return enemies;
    }

    /* ── combat transition ─────────────────────────────────────────── */

    /**
     * Called when the player sprite overlaps an enemy sprite.
     * Pauses the world, launches CombatScene with the relevant data,
     * and listens for a 'combat-end' event to resume.
     */
    _onEnemyContact(enemy) {
        if (this.inCombat || enemy.defeated) return;
        this.inCombat = true;

        this.scene.pause();
        this.scene.launch('CombatScene', {
            enemy: {
                id:        enemy.id,
                name:      enemy.name,
                hp:        enemy.hp,
                maxHp:     enemy.maxHp,
                attack:    enemy.attack,
                defense:   enemy.defense,
                xpReward:  enemy.xpReward,
                lootTable: enemy.lootTable,
            },
            player: {
                hp:    this.player.hp,
                maxHp: this.player.maxHp,
            },
        });

        // CombatScene emits 'combat-end' with { victory, playerHp }.
        this.scene.get('CombatScene').events.once('combat-end', (result) => {
            if (result.playerHp !== undefined) {
                this.player.hp = result.playerHp;
                this.player.emitStats();
            }
            if (result.victory) {
                enemy.defeat();
            }

            this.scene.stop('CombatScene');
            this.scene.resume();

            // Brief cooldown so the overlap doesn't re-trigger instantly.
            this.time.delayedCall(300, () => {
                this.inCombat = false;
            });
        });
    }
}
