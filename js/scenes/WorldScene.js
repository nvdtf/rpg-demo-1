import { TILE_SIZE } from '../utils/helpers.js';
import { MAP_CONFIG } from '../data/maps.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import NPC from '../entities/NPC.js';
import ENEMIES from '../data/enemies.js';
import NPCS from '../data/npcs.js';
import LevelSystem from '../systems/LevelSystem.js';
import QuestSystem from '../systems/QuestSystem.js';

export class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    create(data) {
        const mode = data && data.mode ? data.mode : 'new_game';
        this.inCombat = false;
        this._dialogActive = false;
        this._activeNPC = null;

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

        // Spawn NPCs from data catalog and place them on the map.
        this.npcs = this._spawnNPCs(map);

        // Register interaction keys (Enter / Space) for NPC dialog.
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyEnter.on('down', () => this._onInteractKey());
        this.keySpace.on('down', () => this._onInteractKey());

        // Listen for dialog events from UIScene.
        this.game.events.on('dialog-quest-resolved', this._onQuestResolved, this);
        this.game.events.on('dialog-closed', this._onDialogClosed, this);

        // Camera follows the player, clamped to the map edges.
        const cam = this.cameras.main;
        cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        cam.startFollow(this.player.sprite, true);

        // Launch the HUD overlay and broadcast initial player stats.
        this.scene.launch('UIScene');
        this.player.emitStats();

        // Listen for wake event — fired when returning from combat.
        this.events.on('wake', this._onWake, this);
    }

    update() {
        if (this._dialogActive) return;
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

    /* ── NPC spawning ─────────────────────────────────────────────── */

    /**
     * Read NPC spawn points from the Tiled Objects layer (objects with
     * type "npc" and name matching an NPCS key). Falls back to positions
     * defined in the NPCS data catalog.
     */
    _spawnNPCs(map) {
        const npcs = [];

        const objectsLayer = map.getObjectLayer(MAP_CONFIG.layers.objects);
        let spawns = [];
        if (objectsLayer) {
            spawns = objectsLayer.objects.filter(obj => obj.type === 'npc');
        }

        if (spawns.length > 0) {
            for (const obj of spawns) {
                const template = NPCS[obj.name];
                if (!template) continue;
                const tileX = Math.floor(obj.x / TILE_SIZE);
                const tileY = Math.floor(obj.y / TILE_SIZE);
                const npc = new NPC(this, tileX, tileY, template);
                npcs.push(npc);
            }
        } else {
            for (const key of Object.keys(NPCS)) {
                const template = NPCS[key];
                const npc = new NPC(this, template.x, template.y, template);
                npcs.push(npc);
            }
        }

        return npcs;
    }

    /* ── NPC interaction ──────────────────────────────────────────── */

    /**
     * Called when Enter or Space is pressed. Checks if the player is
     * within one tile of any NPC and triggers dialog if so.
     */
    _onInteractKey() {
        if (this.inCombat || this._dialogActive) return;

        const npc = this._findNearbyNPC();
        if (!npc) return;

        this._dialogActive = true;
        this._activeNPC = npc;

        this.game.events.emit('show-dialog', {
            npcName: npc.name,
            lines: [...npc.dialog],
            questId: npc.questId,
        });
    }

    /**
     * Find an NPC within interaction range (1 tile) of the player.
     * @returns {NPC|null}
     */
    _findNearbyNPC() {
        for (const npc of this.npcs) {
            const dx = Math.abs(this.player.tileX - npc.tileX);
            const dy = Math.abs(this.player.tileY - npc.tileY);
            if (dx <= 1 && dy <= 1) return npc;
        }
        return null;
    }

    /**
     * Handle quest accept/decline from UIScene's quest prompt.
     */
    _onQuestResolved({ questId, accepted }) {
        if (!accepted) return;
        QuestSystem.acceptQuest(this.player, questId);
    }

    /**
     * Reset dialog state when UIScene closes the dialog box.
     */
    _onDialogClosed() {
        this._dialogActive = false;
        this._activeNPC = null;
    }

    /* ── combat transition ─────────────────────────────────────────── */

    /**
     * Called when the player sprite overlaps an enemy sprite.
     * Sleeps the world, launches CombatScene with the relevant data.
     * CombatScene emits 'combat-end' which triggers _onCombatEnd.
     */
    _onEnemyContact(enemy) {
        if (this.inCombat || enemy.defeated) return;
        this.inCombat = true;
        this._combatEnemy = enemy;

        this.scene.sleep('WorldScene');
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
                hp:      this.player.hp,
                maxHp:   this.player.maxHp,
                attack:  this.player.attack,
                defense: this.player.defense,
            },
        });

        this.scene.get('CombatScene').events.once('combat-end', (result) => {
            this._onCombatEnd(result);
        });
    }

    /**
     * Handle combat results. On victory: stop CombatScene, wake WorldScene,
     * mark enemy defeated, remove sprite. On defeat: transition to GameOverScene.
     */
    _onCombatEnd(result) {
        this.scene.stop('CombatScene');

        if (result.victory) {
            // Wake WorldScene — the 'wake' event handler will process results.
            this._pendingCombatResult = result;
            this.scene.wake('WorldScene');
        } else {
            // Player defeated — go to Game Over. Stop this scene entirely.
            this.scene.stop('UIScene');
            this.scene.stop('WorldScene');
            this.scene.start('GameOverScene');
        }
    }

    /**
     * Fired by Phaser when this scene wakes from sleep.
     * Applies combat results: update HP, mark enemy defeated, remove sprite.
     */
    _onWake() {
        const result = this._pendingCombatResult;
        this._pendingCombatResult = null;

        if (result) {
            if (result.playerHp !== undefined) {
                this.player.hp = result.playerHp;
            }

            if (result.victory && this._combatEnemy) {
                this._combatEnemy.defeat();

                // Award XP and check for level-up.
                if (result.xpGained) {
                    const levelUp = LevelSystem.addXp(this.player, result.xpGained);
                    if (levelUp) {
                        this._showLevelUpNotification(levelUp.newLevel);
                    }
                }
            }

            this.player.emitStats();
        }

        this._combatEnemy = null;

        // Brief cooldown so the overlap doesn't re-trigger instantly.
        this.time.delayedCall(300, () => {
            this.inCombat = false;
        });
    }

    /**
     * Display a floating level-up notification above the player.
     * @param {number} newLevel
     */
    _showLevelUpNotification(newLevel) {
        const x = this.player.sprite.x;
        const y = this.player.sprite.y - 20;

        const text = this.add.text(x, y, `Level Up! Lv ${newLevel}`, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffdd44',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }
}
