import { TILE_SIZE } from '../utils/helpers.js';
import { MAP_CONFIG } from '../data/maps.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import NPC from '../entities/NPC.js';
import ENEMIES from '../data/enemies.js';
import NPCS from '../data/npcs.js';
import LevelSystem from '../systems/LevelSystem.js';
import QuestSystem from '../systems/QuestSystem.js';
import InventorySystem from '../systems/InventorySystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import ITEMS from '../data/items.js';

export class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    create(data) {
        const mode = data && data.mode ? data.mode : 'new_game';
        this.inCombat = false;
        this._dialogActive = false;
        this._activeNPC = null;
        this._pauseMenuActive = false;
        this._pauseContainer = null;

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
        let saveData = null;

        if (mode === 'load_game') {
            // Accept save data passed from MenuScene or pause menu; fall back to loading directly.
            saveData = (data && data.saveData) ? data.saveData : SaveSystem.load().data;
            if (saveData && saveData.player) {
                spawnX = saveData.player.x;
                spawnY = saveData.player.y;
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

        // Restore player stats, inventory, equipment, and quest progress from save.
        if (saveData && saveData.player) {
            SaveSystem.applyToPlayer(this.player, saveData.player);
            // Restore top-level quest log from save (applyToPlayer sets player.questLog
            // from saveData.player.questLog, but quest log is saved at the root level).
            if (saveData.questLog) {
                this.player.questLog = saveData.questLog.map(e => ({ ...e }));
            }
        }

        // Spawn enemies and register overlap detection with the player.
        this.enemies = this._spawnEnemies(map);

        // Mark defeated enemies as hidden when loading a save.
        if (saveData && saveData.defeatedEnemies && saveData.defeatedEnemies.length > 0) {
            for (const enemy of this.enemies) {
                if (saveData.defeatedEnemies.includes(enemy.id)) {
                    enemy.defeat();
                }
            }
        }

        // Spawn NPCs from data catalog and place them on the map.
        this.npcs = this._spawnNPCs(map);

        // Register interaction keys (Enter / Space) for NPC dialog.
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyEnter.on('down', () => this._onInteractKey());
        this.keySpace.on('down', () => this._onInteractKey());

        // Escape key toggles the pause menu.
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keyEsc.on('down', () => this._onEscKey());

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
        if (this._dialogActive || this._pauseMenuActive) return;
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

        // Fade out before transitioning to combat (FR-017).
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
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
        // Fade in when returning from combat (FR-017).
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Ensure the player sprite shows the correct idle frame after waking.
        this.player.setIdle();

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

                // Process loot drops.
                if (result.lootGained && result.lootGained.length > 0) {
                    const collected = [];
                    for (const drop of result.lootGained) {
                        const res = InventorySystem.addItem(this.player, drop.id, drop.quantity);
                        if (res.success) {
                            const name = ITEMS[drop.id] ? ITEMS[drop.id].name : drop.id;
                            collected.push(drop.quantity > 1 ? `${name} x${drop.quantity}` : name);
                        }
                    }
                    if (collected.length > 0) {
                        this._showLootNotification(collected);
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

    /**
     * Display floating loot notification(s) above the player.
     * @param {string[]} itemNames — display names of collected items
     */
    _showLootNotification(itemNames) {
        const x = this.player.sprite.x;
        let y = this.player.sprite.y - 40;

        for (const name of itemNames) {
            const text = this.add.text(x, y, `+ ${name}`, {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#44ffaa',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5).setDepth(1000);

            this.tweens.add({
                targets: text,
                y: y - 30,
                alpha: 0,
                duration: 2500,
                ease: 'Power2',
                onComplete: () => text.destroy(),
            });

            y -= 18;
        }
    }

    /* ── pause menu ───────────────────────────────────────────────── */

    _onEscKey() {
        if (this.inCombat || this._dialogActive) return;

        // Let UIScene handle ESC when one of its overlays is open.
        const uiScene = this.scene.get('UIScene');
        if (uiScene && (uiScene.charScreenVisible || uiScene.questLogVisible || uiScene.inventoryVisible || uiScene.dialogActive)) {
            return;
        }

        if (this._pauseMenuActive) {
            this._closePauseMenu();
        } else {
            this._openPauseMenu();
        }
    }

    _openPauseMenu() {
        this._pauseMenuActive = true;
        this.physics.pause();

        const cam = this.cameras.main;
        this._pauseContainer = this.add.container(cam.width / 2, cam.height / 2);
        this._pauseContainer.setScrollFactor(0);
        this._pauseContainer.setDepth(2000);

        // Full-screen dim backdrop.
        const dimBg = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.6);
        this._pauseContainer.add(dimBg);

        // Panel.
        const panelW = 260;
        const panelH = 250;
        const bg = this.add.graphics();
        bg.fillStyle(0x111118, 0.95);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, 0x6666aa, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this._pauseContainer.add(bg);

        // Title.
        const title = this.add.text(0, -panelH / 2 + 20, 'PAUSED', {
            fontSize: '20px', fontFamily: 'monospace', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0);
        this._pauseContainer.add(title);

        // Buttons.
        const hasSave = SaveSystem.hasSave();
        this._addPauseButton(0, -30, 'Resume', true, () => this._closePauseMenu());
        this._addPauseButton(0, 20, 'Save Game', true, () => this._onPauseSave());
        this._loadBtn = this._addPauseButton(0, 70, 'Load Game', hasSave, () => this._onPauseLoad());

        // Hint.
        const hint = this.add.text(0, panelH / 2 - 20, 'Esc to resume', {
            fontSize: '11px', fontFamily: 'monospace', color: '#666666',
        }).setOrigin(0.5);
        this._pauseContainer.add(hint);
    }

    _closePauseMenu() {
        if (this._pauseContainer) {
            this._pauseContainer.destroy();
            this._pauseContainer = null;
        }
        this._pauseSaveText = null;
        this._loadBtn = null;
        this._pauseMenuActive = false;
        this.physics.resume();
    }

    _addPauseButton(x, y, label, enabled, callback) {
        const btnW = 180;
        const btnH = 36;

        const btnBg = this.add.rectangle(x, y, btnW, btnH, enabled ? 0x334455 : 0x222222)
            .setStrokeStyle(2, enabled ? 0x5588aa : 0x444444);
        this._pauseContainer.add(btnBg);

        const text = this.add.text(x, y, label, {
            fontSize: '16px', fontFamily: 'monospace',
            color: enabled ? '#ffffff' : '#666666',
        }).setOrigin(0.5);
        this._pauseContainer.add(text);

        if (enabled) {
            btnBg.setInteractive({ useHandCursor: true });
            btnBg.on('pointerover', () => btnBg.setFillStyle(0x446688));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x334455));
            btnBg.on('pointerdown', callback);
        }

        return { bg: btnBg, text };
    }

    _onPauseSave() {
        const defeatedIds = this.enemies.filter(e => e.defeated).map(e => e.id);
        const result = SaveSystem.save(this.player, defeatedIds);

        // Show brief feedback inside the pause panel.
        if (this._pauseSaveText) this._pauseSaveText.destroy();
        const msg = result.success ? 'Game Saved!' : 'Save Failed';
        const color = result.success ? '#44ff44' : '#ff4444';
        this._pauseSaveText = this.add.text(0, 105, msg, {
            fontSize: '13px', fontFamily: 'monospace', color,
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._pauseContainer.add(this._pauseSaveText);

        // Enable the Load Game button now that a save exists.
        if (result.success && this._loadBtn && !this._loadBtn.bg.input) {
            const btn = this._loadBtn;
            btn.bg.setFillStyle(0x334455);
            btn.bg.setStrokeStyle(2, 0x5588aa);
            btn.text.setColor('#ffffff');
            btn.bg.setInteractive({ useHandCursor: true });
            btn.bg.on('pointerover', () => btn.bg.setFillStyle(0x446688));
            btn.bg.on('pointerout', () => btn.bg.setFillStyle(0x334455));
            btn.bg.on('pointerdown', () => this._onPauseLoad());
        }
    }

    _onPauseLoad() {
        if (!SaveSystem.hasSave()) return;
        this._closePauseMenu();
        // Clean up global event listeners before restarting the scene.
        this.game.events.off('dialog-quest-resolved', this._onQuestResolved, this);
        this.game.events.off('dialog-closed', this._onDialogClosed, this);
        this.scene.stop('UIScene');
        this.scene.restart({ mode: 'load_game' });
    }
}
