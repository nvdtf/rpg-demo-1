/**
 * UIScene — HUD overlay that runs in parallel with WorldScene.
 *
 * Launched via `scene.launch('UIScene')` so it renders on top of the
 * game world without blocking input.  Uses the global game event bus
 * (`this.game.events`) to receive player stat updates.
 */

import QuestSystem from '../systems/QuestSystem.js';
import InventorySystem from '../systems/InventorySystem.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Health-bar geometry (top-left corner).
        this.barX = 10;
        this.barY = 10;
        this.barWidth = 160;
        this.barHeight = 16;

        // Semi-transparent dark background.
        this.barBg = this.add.graphics();
        this.barBg.fillStyle(0x222222, 0.8);
        this.barBg.fillRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, 3);

        // Foreground fill (redrawn on every update).
        this.barFill = this.add.graphics();

        // Numeric label to the right of the bar.
        this.hpText = this.add.text(this.barX + this.barWidth + 8, this.barY, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });

        // Cached values so we only redraw on change.
        this.currentHp = 0;
        this.maxHp = 0;

        // Listen on the global game bus for player stat broadcasts.
        this.game.events.on('player-stats-changed', this._onStatsChanged, this);

        // ── Character screen ──────────────────────────────────────────
        this.charScreenVisible = false;
        this.charContainer = null;

        this.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.keyC.on('down', () => this._toggleCharScreen());

        // ── Quest log ────────────────────────────────────────────────
        this.questLogVisible = false;
        this.questLogContainer = null;

        this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyQ.on('down', () => this._toggleQuestLog());

        // ── Inventory screen ────────────────────────────────────────
        this.inventoryVisible = false;
        this.invContainer = null;
        this._invIndex = 0;
        this._invScroll = 0;
        this._invItems = null;

        this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.keyI.on('down', () => this._toggleInventory());

        // Inventory navigation (permanent listeners, gated on inventoryVisible).
        this.input.keyboard.on('keydown-UP', () => {
            if (this.inventoryVisible) this._invNavigate(-1);
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.inventoryVisible) this._invNavigate(1);
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.inventoryVisible) this._invPerformAction();
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.inventoryVisible) this._invPerformAction();
        });

        this.keyEsc.on('down', () => {
            if (this.inventoryVisible) this._hideInventory();
            else if (this.questLogVisible) this._hideQuestLog();
            else if (this.charScreenVisible) this._hideCharScreen();
        });

        // ── Dialog box ────────────────────────────────────────────────
        this.dialogActive = false;
        this.dialogContainer = null;
        this.dialogLines = [];
        this.dialogLineIndex = 0;
        this.dialogNpcName = '';
        this.dialogQuestId = null;
        this.dialogShowingPrompt = false;

        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.keyEnter.on('down', () => this._onDialogAdvance());
        this.keySpace.on('down', () => this._onDialogAdvance());

        // Listen for dialog events from WorldScene / NPC interaction.
        this.game.events.on('show-dialog', this._onShowDialog, this);

        // Tear down listener when scene shuts down or is destroyed.
        this.events.once('shutdown', this._cleanup, this);
        this.events.once('destroy', this._cleanup, this);
    }

    /* ── event handler ──────────────────────────────────────────────── */

    _onStatsChanged(stats) {
        if (stats.hp === this.currentHp && stats.maxHp === this.maxHp) return;
        this.currentHp = stats.hp;
        this.maxHp = stats.maxHp;
        this._drawHealthBar();
    }

    /* ── rendering ──────────────────────────────────────────────────── */

    _drawHealthBar() {
        this.barFill.clear();

        const ratio = this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
        const innerWidth = this.barWidth - 4;
        const fillWidth = Math.max(0, innerWidth * ratio);

        // Color shifts green → yellow → red as health drops.
        let color;
        if (ratio > 0.5) {
            color = 0x44cc44;
        } else if (ratio > 0.25) {
            color = 0xcccc44;
        } else {
            color = 0xcc4444;
        }

        this.barFill.fillStyle(color, 1);
        this.barFill.fillRoundedRect(
            this.barX + 2, this.barY + 2,
            fillWidth, this.barHeight - 4,
            2,
        );

        this.hpText.setText(`HP: ${this.currentHp} / ${this.maxHp}`);
    }

    /* ── character screen ──────────────────────────────────────────── */

    _toggleCharScreen() {
        if (this.charScreenVisible) {
            this._hideCharScreen();
        } else {
            if (this.inventoryVisible) return;
            this._showCharScreen();
        }
    }

    _showCharScreen() {
        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.player) return;

        const player = worldScene.player;
        this.charScreenVisible = true;

        const cam = this.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const panelW = 300;
        const panelH = 340;
        const left = -panelW / 2 + 24;

        this.charContainer = this.add.container(cx, cy);

        // Panel background
        const bg = this.add.graphics();
        bg.fillStyle(0x111118, 0.92);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, 0x6666aa, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.charContainer.add(bg);

        const headerStyle = { fontSize: '16px', fontFamily: 'monospace', color: '#ffdd44', stroke: '#000000', strokeThickness: 2 };
        const labelStyle  = { fontSize: '13px', fontFamily: 'monospace', color: '#999999' };
        const valueStyle  = { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' };
        const hintStyle   = { fontSize: '11px', fontFamily: 'monospace', color: '#666666' };

        let y = -panelH / 2 + 18;

        // Title
        const title = this.add.text(0, y, 'CHARACTER', headerStyle).setOrigin(0.5, 0);
        this.charContainer.add(title);
        y += 32;

        // Divider helper
        const addDivider = (yPos) => {
            const line = this.add.graphics();
            line.lineStyle(1, 0x444466, 0.6);
            line.beginPath();
            line.moveTo(-panelW / 2 + 16, yPos);
            line.lineTo(panelW / 2 - 16, yPos);
            line.strokePath();
            this.charContainer.add(line);
        };

        addDivider(y);
        y += 12;

        // Name
        const name = player.name || 'Hero';
        this.charContainer.add(this.add.text(left, y, 'Name', labelStyle));
        this.charContainer.add(this.add.text(-left, y, name, valueStyle).setOrigin(1, 0));
        y += 22;

        // Level
        this.charContainer.add(this.add.text(left, y, 'Level', labelStyle));
        this.charContainer.add(this.add.text(-left, y, `${player.level}`, valueStyle).setOrigin(1, 0));
        y += 28;

        addDivider(y);
        y += 12;

        // HP
        this.charContainer.add(this.add.text(left, y, 'HP', labelStyle));
        this.charContainer.add(this.add.text(-left, y, `${player.hp} / ${player.maxHp}`, valueStyle).setOrigin(1, 0));
        y += 22;

        // Attack
        this.charContainer.add(this.add.text(left, y, 'Attack', labelStyle));
        this.charContainer.add(this.add.text(-left, y, `${player.attack}`, valueStyle).setOrigin(1, 0));
        y += 22;

        // Defense
        this.charContainer.add(this.add.text(left, y, 'Defense', labelStyle));
        this.charContainer.add(this.add.text(-left, y, `${player.defense}`, valueStyle).setOrigin(1, 0));
        y += 28;

        addDivider(y);
        y += 12;

        // XP progress bar
        this.charContainer.add(this.add.text(left, y, 'Experience', labelStyle));
        y += 18;

        const xpBarX = left;
        const xpBarW = panelW - 48;
        const xpBarH = 14;
        const xpRatio = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;

        const xpBg = this.add.graphics();
        xpBg.fillStyle(0x222233, 1);
        xpBg.fillRoundedRect(xpBarX, y, xpBarW, xpBarH, 3);
        this.charContainer.add(xpBg);

        if (xpRatio > 0) {
            const xpFill = this.add.graphics();
            xpFill.fillStyle(0x4488ff, 1);
            xpFill.fillRoundedRect(xpBarX + 1, y + 1, Math.max(0, (xpBarW - 2) * xpRatio), xpBarH - 2, 2);
            this.charContainer.add(xpFill);
        }

        const xpLabel = this.add.text(xpBarX + xpBarW / 2, y + xpBarH / 2, `${player.xp} / ${player.xpToNext}`, {
            fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this.charContainer.add(xpLabel);
        y += xpBarH + 24;

        addDivider(y);
        y += 12;

        // Equipment
        this.charContainer.add(this.add.text(left, y, 'Equipment', labelStyle));
        y += 20;

        const weaponName = (player.equipment && player.equipment.weapon)
            ? player.equipment.weapon.name
            : 'None';
        const armorName = (player.equipment && player.equipment.armor)
            ? player.equipment.armor.name
            : 'None';

        this.charContainer.add(this.add.text(left + 8, y, 'Weapon', labelStyle));
        this.charContainer.add(this.add.text(-left, y, weaponName, valueStyle).setOrigin(1, 0));
        y += 20;

        this.charContainer.add(this.add.text(left + 8, y, 'Armor', labelStyle));
        this.charContainer.add(this.add.text(-left, y, armorName, valueStyle).setOrigin(1, 0));
        y += 28;

        // Close hint
        const hint = this.add.text(0, panelH / 2 - 22, 'C / Esc to close', hintStyle).setOrigin(0.5);
        this.charContainer.add(hint);
    }

    _hideCharScreen() {
        if (this.charContainer) {
            this.charContainer.destroy();
            this.charContainer = null;
        }
        this.charScreenVisible = false;
    }

    /* ── quest log ─────────────────────────────────────────────────── */

    _toggleQuestLog() {
        if (this.questLogVisible) {
            this._hideQuestLog();
        } else {
            if (this.dialogActive || this.charScreenVisible || this.inventoryVisible) return;
            this._showQuestLog();
        }
    }

    _showQuestLog() {
        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.player) return;

        const player = worldScene.player;
        this.questLogVisible = true;

        const cam = this.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const panelW = 380;
        const maxPanelH = cam.height - 60;

        // Collect quest data.
        const activeQuests = QuestSystem.getActiveQuests(player);
        const completedQuests = QuestSystem.getCompletedQuests(player);
        const hasQuests = activeQuests.length > 0 || completedQuests.length > 0;

        // Calculate panel height dynamically.
        // Header(40) + sections + hint(30) + padding
        let contentHeight = 50; // title + top padding
        if (!hasQuests) {
            contentHeight += 30;
        } else {
            if (activeQuests.length > 0) {
                contentHeight += 24; // section header
                contentHeight += activeQuests.length * 64; // per quest
            }
            if (completedQuests.length > 0) {
                if (activeQuests.length > 0) contentHeight += 12; // gap
                contentHeight += 24; // section header
                contentHeight += completedQuests.length * 48; // per quest (no progress line)
            }
        }
        contentHeight += 32; // close hint
        const panelH = Math.min(contentHeight, maxPanelH);

        this.questLogContainer = this.add.container(cx, cy);

        // Panel background.
        const bg = this.add.graphics();
        bg.fillStyle(0x111118, 0.92);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, 0x6666aa, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.questLogContainer.add(bg);

        const headerStyle = { fontSize: '16px', fontFamily: 'monospace', color: '#ffdd44', stroke: '#000000', strokeThickness: 2 };
        const sectionStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc' };
        const nameStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' };
        const descStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#999999', wordWrap: { width: panelW - 56 } };
        const progressStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#66cc66' };
        const completedNameStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#888888' };
        const checkStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#66cc66' };
        const hintStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#666666' };

        const left = -panelW / 2 + 20;
        let y = -panelH / 2 + 18;

        // Title.
        const title = this.add.text(0, y, 'QUEST LOG', headerStyle).setOrigin(0.5, 0);
        this.questLogContainer.add(title);
        y += 32;

        // Divider helper.
        const addDivider = (yPos) => {
            const line = this.add.graphics();
            line.lineStyle(1, 0x444466, 0.6);
            line.beginPath();
            line.moveTo(-panelW / 2 + 16, yPos);
            line.lineTo(panelW / 2 - 16, yPos);
            line.strokePath();
            this.questLogContainer.add(line);
        };

        addDivider(y);
        y += 10;

        if (!hasQuests) {
            const empty = this.add.text(0, y + 6, 'No quests yet.', descStyle).setOrigin(0.5, 0);
            this.questLogContainer.add(empty);
            y += 30;
        } else {
            // Active quests.
            if (activeQuests.length > 0) {
                const activeLabel = this.add.text(left, y, 'Active', sectionStyle);
                this.questLogContainer.add(activeLabel);
                y += 22;

                for (const entry of activeQuests) {
                    const def = QuestSystem.getDefinition(entry.questId);
                    if (!def) continue;

                    const qName = this.add.text(left + 8, y, def.title, nameStyle);
                    this.questLogContainer.add(qName);
                    y += 16;

                    const qDesc = this.add.text(left + 8, y, def.description, descStyle);
                    this.questLogContainer.add(qDesc);
                    y += 16;

                    const progressText = this._formatQuestProgress(def, entry);
                    const qProgress = this.add.text(left + 8, y, progressText, progressStyle);
                    this.questLogContainer.add(qProgress);
                    y += 24;
                }
            }

            // Completed quests.
            if (completedQuests.length > 0) {
                if (activeQuests.length > 0) {
                    addDivider(y);
                    y += 10;
                }

                const compLabel = this.add.text(left, y, 'Completed', sectionStyle);
                this.questLogContainer.add(compLabel);
                y += 22;

                for (const entry of completedQuests) {
                    const def = QuestSystem.getDefinition(entry.questId);
                    if (!def) continue;

                    const check = this.add.text(left + 8, y, '✓', checkStyle);
                    this.questLogContainer.add(check);

                    const qName = this.add.text(left + 24, y, def.title, completedNameStyle);
                    this.questLogContainer.add(qName);
                    y += 16;

                    const qDesc = this.add.text(left + 24, y, def.description, descStyle);
                    this.questLogContainer.add(qDesc);
                    y += 24;
                }
            }
        }

        // Close hint.
        const hint = this.add.text(0, panelH / 2 - 22, 'Q / Esc to close', hintStyle).setOrigin(0.5);
        this.questLogContainer.add(hint);
    }

    /**
     * Build a human-readable progress string for a quest entry.
     * @param {object} def — quest definition
     * @param {object} entry — quest log entry
     * @returns {string}
     */
    _formatQuestProgress(def, entry) {
        const current = entry.progress;
        const total = def.targetCount;
        switch (def.objectiveType) {
            case 'defeat': {
                // Capitalize targetId and add "defeated".
                const name = def.targetId.charAt(0).toUpperCase() + def.targetId.slice(1) + 's';
                return `${current}/${total} ${name} defeated`;
            }
            case 'find_item': {
                const name = def.targetId.replace(/_/g, ' ');
                return `${current}/${total} ${name} found`;
            }
            case 'talk_to_npc': {
                const name = def.targetId.replace(/_/g, ' ');
                return `${current}/${total} Talk to ${name}`;
            }
            default:
                return `${current}/${total}`;
        }
    }

    _hideQuestLog() {
        if (this.questLogContainer) {
            this.questLogContainer.destroy();
            this.questLogContainer = null;
        }
        this.questLogVisible = false;
    }

    /* ── inventory screen ──────────────────────────────────────────── */

    _toggleInventory() {
        if (this.inventoryVisible) {
            this._hideInventory();
        } else {
            if (this.dialogActive || this.charScreenVisible || this.questLogVisible) return;
            this._showInventory();
        }
    }

    _showInventory() {
        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.player) return;
        this.inventoryVisible = true;
        this._buildInventoryPanel();
    }

    _hideInventory() {
        if (this.invContainer) {
            this.invContainer.destroy();
            this.invContainer = null;
        }
        this.inventoryVisible = false;
        this._invItems = null;
    }

    /** Move the inventory selection cursor up or down and rebuild. */
    _invNavigate(dir) {
        if (!this._invItems || this._invItems.length === 0) return;
        this._invIndex = Phaser.Math.Clamp(this._invIndex + dir, 0, this._invItems.length - 1);
        this._buildInventoryPanel();
    }

    /** Execute equip / unequip / use on the currently selected item. */
    _invPerformAction() {
        if (!this._invItems || this._invIndex < 0 || this._invIndex >= this._invItems.length) return;

        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.player) return;
        const player = worldScene.player;
        const entry = this._invItems[this._invIndex];

        if (entry._equipped) {
            InventorySystem.unequip(player, entry._slot);
        } else if (entry.type === 'weapon') {
            InventorySystem.equipWeapon(player, entry.id);
        } else if (entry.type === 'armor') {
            InventorySystem.equipArmor(player, entry.id);
        } else if (entry.type === 'consumable') {
            const result = InventorySystem.useConsumable(player, entry.id);
            if (result && result.success) {
                this.game.events.emit('player-stats-changed', {
                    hp: player.hp,
                    maxHp: player.maxHp,
                });
            }
        }

        this._buildInventoryPanel();
    }

    /**
     * Build (or rebuild) the inventory panel UI.
     * Creates a unified list with equipped items first (highlighted),
     * then bag items. Supports keyboard scrolling and item details.
     */
    _buildInventoryPanel() {
        if (this.invContainer) {
            this.invContainer.destroy();
            this.invContainer = null;
        }

        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.player) return;
        const player = worldScene.player;

        // Build unified item list: equipped items first, then bag contents.
        this._invItems = [];
        const equipped = InventorySystem.getEquipped(player);
        if (equipped.weapon) {
            this._invItems.push(Object.assign({}, equipped.weapon, { _equipped: true, _slot: 'weapon' }));
        }
        if (equipped.armor) {
            this._invItems.push(Object.assign({}, equipped.armor, { _equipped: true, _slot: 'armor' }));
        }
        const inventory = InventorySystem.getInventory(player);
        for (const item of inventory) {
            this._invItems.push(Object.assign({}, item, { _equipped: false }));
        }

        const count = this._invItems.length;
        if (count === 0) {
            this._invIndex = -1;
        } else {
            if (this._invIndex < 0) this._invIndex = 0;
            if (this._invIndex >= count) this._invIndex = count - 1;
        }

        // Scrolling — keep selection in view.
        const maxVisible = 7;
        if (this._invIndex >= 0) {
            if (this._invIndex < this._invScroll) this._invScroll = this._invIndex;
            if (this._invIndex >= this._invScroll + maxVisible) {
                this._invScroll = this._invIndex - maxVisible + 1;
            }
        }
        this._invScroll = Math.max(0, Math.min(this._invScroll, Math.max(0, count - maxVisible)));

        // Panel dimensions.
        const cam = this.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const panelW = 380;
        const rowH = 22;
        const visibleRows = count === 0 ? 1 : Math.min(maxVisible, count);
        const hasItems = count > 0;
        const panelH = 110 + visibleRows * rowH + (hasItems ? 48 : 0);
        const left = -panelW / 2 + 20;
        const right = panelW / 2 - 20;

        this.invContainer = this.add.container(cx, cy);

        // Background.
        const bg = this.add.graphics();
        bg.fillStyle(0x111118, 0.92);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, 0x6666aa, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.invContainer.add(bg);

        // Styles.
        const headerStyle = { fontSize: '16px', fontFamily: 'monospace', color: '#ffdd44', stroke: '#000000', strokeThickness: 2 };
        const capStyle = { fontSize: '12px', fontFamily: 'monospace', color: '#888888' };
        const emptyStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#666666' };
        const descStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa', wordWrap: { width: panelW - 48 } };
        const statStyle = { fontSize: '12px', fontFamily: 'monospace', color: '#66cc66' };
        const actionStyle = { fontSize: '12px', fontFamily: 'monospace', color: '#ffdd44' };
        const hintStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#666666' };

        let y = -panelH / 2 + 16;

        // Title + capacity.
        this.invContainer.add(
            this.add.text(0, y, 'INVENTORY', headerStyle).setOrigin(0.5, 0)
        );
        this.invContainer.add(
            this.add.text(right, y + 3, `${inventory.length} / 20`, capStyle).setOrigin(1, 0)
        );
        y += 30;

        // Divider helper.
        const addDivider = (yPos) => {
            const line = this.add.graphics();
            line.lineStyle(1, 0x444466, 0.6);
            line.beginPath();
            line.moveTo(-panelW / 2 + 16, yPos);
            line.lineTo(panelW / 2 - 16, yPos);
            line.strokePath();
            this.invContainer.add(line);
        };

        addDivider(y);
        y += 8;

        // Item list.
        if (count === 0) {
            this.invContainer.add(
                this.add.text(0, y + 2, 'No items.', emptyStyle).setOrigin(0.5, 0)
            );
            y += rowH;
        } else {
            // Scroll-up indicator.
            if (this._invScroll > 0) {
                this.invContainer.add(
                    this.add.text(0, y - 2, '▲', { fontSize: '9px', fontFamily: 'monospace', color: '#555555' }).setOrigin(0.5, 0)
                );
            }

            for (let v = 0; v < visibleRows; v++) {
                const idx = this._invScroll + v;
                if (idx >= count) break;
                const item = this._invItems[idx];
                const isSel = idx === this._invIndex;
                const isEq = item._equipped;

                // Selection highlight background.
                if (isSel) {
                    const hl = this.add.graphics();
                    hl.fillStyle(0x334466, 0.7);
                    hl.fillRoundedRect(left - 6, y - 1, panelW - 28, rowH, 3);
                    this.invContainer.add(hl);
                }

                // Item name with equipped marker and quantity.
                const prefix = isEq ? '[E] ' : '    ';
                let label = prefix + item.name;
                if (item.type === 'consumable' && item.quantity > 1) {
                    label += ` x${item.quantity}`;
                }
                const nameColor = isEq ? '#ffdd44' : (isSel ? '#ffffff' : '#bbbbbb');
                this.invContainer.add(
                    this.add.text(left, y + 2, label, {
                        fontSize: '13px', fontFamily: 'monospace', color: nameColor,
                    })
                );

                // Type tag on the right.
                const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                this.invContainer.add(
                    this.add.text(right, y + 3, typeLabel, {
                        fontSize: '11px', fontFamily: 'monospace', color: '#666666',
                    }).setOrigin(1, 0)
                );

                y += rowH;
            }

            // Scroll-down indicator.
            if (this._invScroll + maxVisible < count) {
                this.invContainer.add(
                    this.add.text(0, y - 2, '▼', { fontSize: '9px', fontFamily: 'monospace', color: '#555555' }).setOrigin(0.5, 0)
                );
            }
        }

        y += 4;
        addDivider(y);
        y += 8;

        // Detail section for selected item.
        if (hasItems && this._invIndex >= 0 && this._invIndex < count) {
            const sel = this._invItems[this._invIndex];

            // Description.
            this.invContainer.add(
                this.add.text(left, y, sel.description || '', descStyle)
            );
            y += 20;

            // Stats.
            const stats = [];
            if (sel.attackBonus) stats.push(`ATK +${sel.attackBonus}`);
            if (sel.defenseBonus) stats.push(`DEF +${sel.defenseBonus}`);
            if (sel.healAmount) stats.push(`Heal ${sel.healAmount} HP`);
            if (stats.length > 0) {
                this.invContainer.add(
                    this.add.text(left, y, stats.join('  '), statStyle)
                );
            }

            // Action label.
            let actionLabel = '';
            if (sel._equipped) {
                actionLabel = '[ Unequip ]';
            } else if (sel.type === 'weapon' || sel.type === 'armor') {
                actionLabel = '[ Equip ]';
            } else if (sel.type === 'consumable') {
                actionLabel = '[ Use ]';
            }
            if (actionLabel) {
                this.invContainer.add(
                    this.add.text(right, y, actionLabel, actionStyle).setOrigin(1, 0)
                );
            }
            y += 20;
        }

        addDivider(y);
        y += 6;

        // Hints.
        const hintText = hasItems
            ? '↑↓ Navigate · Enter Action · I / Esc Close'
            : 'I / Esc to close';
        this.invContainer.add(
            this.add.text(0, y, hintText, hintStyle).setOrigin(0.5, 0)
        );
    }

    /* ── dialog box ────────────────────────────────────────────────── */

    /**
     * Open the dialog box. Expects an event payload:
     *   { npcName: string, lines: string[], questId: string|null }
     */
    _onShowDialog({ npcName, lines, questId }) {
        if (this.dialogActive) return;

        this.dialogActive = true;
        this.dialogLines = lines;
        this.dialogLineIndex = 0;
        this.dialogNpcName = npcName;
        this.dialogQuestId = questId;
        this.dialogShowingPrompt = false;

        this._buildDialogBox();
        this._renderDialogLine();
    }

    /** Build the static dialog box container at the bottom of the screen. */
    _buildDialogBox() {
        const cam = this.cameras.main;
        const boxW = cam.width - 40;
        const boxH = 120;
        const boxX = cam.width / 2;
        const boxY = cam.height - boxH / 2 - 10;

        this.dialogContainer = this.add.container(boxX, boxY);

        // Semi-transparent background panel.
        const bg = this.add.graphics();
        bg.fillStyle(0x111118, 0.88);
        bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 6);
        bg.lineStyle(2, 0x6666aa, 1);
        bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 6);
        this.dialogContainer.add(bg);

        // NPC name label (top-left of the box).
        this.dialogNameText = this.add.text(-boxW / 2 + 16, -boxH / 2 + 10, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffdd44',
            stroke: '#000000',
            strokeThickness: 2,
        });
        this.dialogContainer.add(this.dialogNameText);

        // Dialog line body text.
        this.dialogBodyText = this.add.text(-boxW / 2 + 16, -boxH / 2 + 32, '', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#ffffff',
            wordWrap: { width: boxW - 32 },
            lineSpacing: 4,
        });
        this.dialogContainer.add(this.dialogBodyText);

        // "Enter / Space to continue" hint (bottom-right).
        this.dialogHintText = this.add.text(boxW / 2 - 16, boxH / 2 - 14, 'Enter / Space ▸', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(1, 1);
        this.dialogContainer.add(this.dialogHintText);

        // Quest prompt elements (hidden until needed).
        this.dialogPromptContainer = this.add.container(0, 0);
        this.dialogPromptContainer.setVisible(false);
        this.dialogContainer.add(this.dialogPromptContainer);
    }

    /** Render the current dialog line or show the quest prompt. */
    _renderDialogLine() {
        if (this.dialogLineIndex < this.dialogLines.length) {
            this.dialogNameText.setText(this.dialogNpcName);
            this.dialogBodyText.setText(this.dialogLines[this.dialogLineIndex]);
            this.dialogHintText.setVisible(true);
            this.dialogPromptContainer.setVisible(false);
        }
    }

    /** Called when Enter or Space is pressed during dialog. */
    _onDialogAdvance() {
        if (!this.dialogActive) return;
        if (this.dialogShowingPrompt) return; // prompt handles its own input

        this.dialogLineIndex++;

        if (this.dialogLineIndex < this.dialogLines.length) {
            this._renderDialogLine();
        } else {
            // All lines read — check for quest prompt.
            if (this.dialogQuestId) {
                this._showQuestPrompt();
            } else {
                this._closeDialog('done');
            }
        }
    }

    /** Show accept / decline buttons for a quest-giving NPC. */
    _showQuestPrompt() {
        const def = QuestSystem.getDefinition(this.dialogQuestId);
        if (!def) {
            this._closeDialog('done');
            return;
        }

        // Check if quest is already in the log.
        const worldScene = this.scene.get('WorldScene');
        const player = worldScene && worldScene.player;
        if (player) {
            const entry = QuestSystem.getQuestEntry(player, this.dialogQuestId);
            if (entry) {
                // Quest already accepted or completed — skip prompt.
                this._closeDialog('done');
                return;
            }
        }

        this.dialogShowingPrompt = true;
        this.dialogHintText.setVisible(false);

        // Update body to quest description.
        this.dialogBodyText.setText(`Quest: ${def.title}\n${def.description}`);

        // Build the prompt buttons.
        this.dialogPromptContainer.removeAll(true);

        const cam = this.cameras.main;
        const boxW = cam.width - 40;

        const btnStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' };
        const btnHighlight = '#ffdd44';
        const btnDefault = '#ffffff';

        // Accept button
        const acceptBg = this.add.graphics();
        acceptBg.fillStyle(0x336633, 0.9);
        acceptBg.fillRoundedRect(-boxW / 4 - 60, -6, 120, 28, 4);
        this.dialogPromptContainer.add(acceptBg);

        const acceptText = this.add.text(-boxW / 4, 8, 'Accept', btnStyle).setOrigin(0.5);
        this.dialogPromptContainer.add(acceptText);

        // Decline button
        const declineBg = this.add.graphics();
        declineBg.fillStyle(0x663333, 0.9);
        declineBg.fillRoundedRect(boxW / 4 - 60, -6, 120, 28, 4);
        this.dialogPromptContainer.add(declineBg);

        const declineText = this.add.text(boxW / 4, 8, 'Decline', btnStyle).setOrigin(0.5);
        this.dialogPromptContainer.add(declineText);

        // Keyboard selection state.
        this._promptSelection = 0; // 0 = Accept, 1 = Decline
        this._promptTexts = [acceptText, declineText];
        this._promptTexts[0].setColor(btnHighlight);

        // Hint text for keyboard nav.
        const navHint = this.add.text(0, 30, '← → to choose  ·  Enter to confirm', {
            fontSize: '11px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);
        this.dialogPromptContainer.add(navHint);

        // Position prompt in lower portion of dialog box.
        this.dialogPromptContainer.setPosition(0, 18);
        this.dialogPromptContainer.setVisible(true);

        // Make buttons clickable.
        acceptBg.setInteractive(
            new Phaser.Geom.Rectangle(-boxW / 4 - 60, -6, 120, 28),
            Phaser.Geom.Rectangle.Contains,
        );
        acceptBg.on('pointerdown', () => this._resolveQuestPrompt(true));
        acceptBg.on('pointerover', () => {
            this._promptSelection = 0;
            this._updatePromptHighlight();
        });

        declineBg.setInteractive(
            new Phaser.Geom.Rectangle(boxW / 4 - 60, -6, 120, 28),
            Phaser.Geom.Rectangle.Contains,
        );
        declineBg.on('pointerdown', () => this._resolveQuestPrompt(false));
        declineBg.on('pointerover', () => {
            this._promptSelection = 1;
            this._updatePromptHighlight();
        });

        // Keyboard left/right and confirm listeners.
        this._promptKeyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this._promptKeyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this._promptKeyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this._promptKeyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this._promptKeyLeft.on('down', () => this._movePromptSelection(-1));
        this._promptKeyRight.on('down', () => this._movePromptSelection(1));
        this._promptKeyA.on('down', () => this._movePromptSelection(-1));
        this._promptKeyD.on('down', () => this._movePromptSelection(1));

        // Re-bind Enter/Space to confirm prompt selection (instead of advancing dialog).
        this.keyEnter.removeAllListeners('down');
        this.keySpace.removeAllListeners('down');
        this.keyEnter.on('down', () => this._confirmPromptSelection());
        this.keySpace.on('down', () => this._confirmPromptSelection());
    }

    _movePromptSelection(dir) {
        if (!this.dialogShowingPrompt) return;
        this._promptSelection = Phaser.Math.Clamp(this._promptSelection + dir, 0, 1);
        this._updatePromptHighlight();
    }

    _updatePromptHighlight() {
        const highlight = '#ffdd44';
        const normal = '#ffffff';
        this._promptTexts.forEach((t, i) => {
            t.setColor(i === this._promptSelection ? highlight : normal);
        });
    }

    _confirmPromptSelection() {
        if (!this.dialogShowingPrompt) return;
        this._resolveQuestPrompt(this._promptSelection === 0);
    }

    /**
     * Resolve the quest prompt: accept or decline the quest.
     * @param {boolean} accepted
     */
    _resolveQuestPrompt(accepted) {
        if (!this.dialogShowingPrompt) return;

        this.game.events.emit('dialog-quest-resolved', {
            questId: this.dialogQuestId,
            accepted,
        });

        this._closeDialog(accepted ? 'quest-accepted' : 'quest-declined');
    }

    /**
     * Close the dialog box and clean up.
     * @param {string} reason — 'done' | 'quest-accepted' | 'quest-declined'
     */
    _closeDialog(reason) {
        if (this.dialogContainer) {
            this.dialogContainer.destroy();
            this.dialogContainer = null;
        }

        // Clean up prompt keys if they were registered.
        if (this._promptKeyLeft) {
            this._promptKeyLeft.removeAllListeners('down');
            this._promptKeyRight.removeAllListeners('down');
            this._promptKeyA.removeAllListeners('down');
            this._promptKeyD.removeAllListeners('down');
            this._promptKeyLeft = null;
            this._promptKeyRight = null;
            this._promptKeyA = null;
            this._promptKeyD = null;
        }

        // Restore Enter/Space to dialog-advance handlers.
        this.keyEnter.removeAllListeners('down');
        this.keySpace.removeAllListeners('down');
        this.keyEnter.on('down', () => this._onDialogAdvance());
        this.keySpace.on('down', () => this._onDialogAdvance());

        this.dialogActive = false;
        this.dialogShowingPrompt = false;
        this.dialogLines = [];
        this.dialogLineIndex = 0;
        this.dialogQuestId = null;
        this.dialogNameText = null;
        this.dialogBodyText = null;
        this.dialogHintText = null;
        this.dialogPromptContainer = null;
        this._promptTexts = null;

        this.game.events.emit('dialog-closed', { reason });
    }

    /* ── cleanup ────────────────────────────────────────────────────── */

    _cleanup() {
        this.game.events.off('player-stats-changed', this._onStatsChanged, this);
        this.game.events.off('show-dialog', this._onShowDialog, this);
        this._hideCharScreen();
        this._hideQuestLog();
        this._hideInventory();
        if (this.dialogActive) this._closeDialog('done');
    }
}
