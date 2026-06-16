import CombatSystem, { CombatState } from '../systems/CombatSystem.js';

export class CombatScene extends Phaser.Scene {
    constructor() {
        super('CombatScene');
    }

    create(data) {
        this.combatData = data;
        this.combat = new CombatSystem(data.player, data.enemy);
        this.consumables = (data.player.inventory || [])
            .filter(i => i.type === 'consumable' && i.quantity > 0);
        this.consumablesUsed = [];
        this.inputEnabled = false;
        this.itemMenuOpen = false;

        const { width, height } = this.scale;

        this._drawBackground(width, height);
        this._createPlayerDisplay(width, height);
        this._createEnemyDisplay(width, height);
        this._createMessageArea(width);
        this._createActionMenu(width);
        this._setupInput();
        this._showIntro();
    }

    /* ── Background ────────────────────────────────────────────────── */

    _drawBackground(w, h) {
        const bg = this.add.graphics();

        // Dark gradient fill
        bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a3e, 0x1a1a3e, 1);
        bg.fillRect(0, 0, w, h);

        // Arena floor line
        bg.lineStyle(2, 0x334466, 0.5);
        bg.lineBetween(50, 340, w - 50, 340);

        // Action panel separator and fill
        bg.lineStyle(1, 0x334466, 0.8);
        bg.lineBetween(0, 410, w, 410);
        bg.fillStyle(0x0d0d24, 0.95);
        bg.fillRect(0, 410, w, h - 410);
    }

    /* ── Combatant displays ────────────────────────────────────────── */

    _createPlayerDisplay(w, h) {
        const px = 180;
        const py = 270;

        this.playerSprite = this.add.sprite(px, py, 'player', 0).setScale(4);

        this.add.text(px, py - 65, this.combatData.player.name || 'Hero', {
            fontSize: '14px', fontFamily: 'monospace', color: '#88ccff'
        }).setOrigin(0.5);

        this.playerHpBar = this._createHealthBar(px - 50, py - 52, 100, 10);
        this._updateHealthBar(this.playerHpBar, this.combat.player.hp, this.combat.player.maxHp);

        this.playerHpText = this.add.text(px, py - 38, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#cccccc'
        }).setOrigin(0.5);
        this._refreshPlayerHp();
    }

    _createEnemyDisplay(w, h) {
        const ex = 620;
        const ey = 270;

        const spriteKey = 'enemy_' + this.combatData.enemy.id;
        if (this.textures.exists(spriteKey)) {
            this.enemySprite = this.add.sprite(ex, ey, spriteKey, 0);
        } else {
            this.enemySprite = this.add.rectangle(ex, ey, 16, 16, 0xcc4444);
        }
        this.enemySprite.setScale(4);

        this.add.text(ex, ey - 65, this.combatData.enemy.name, {
            fontSize: '14px', fontFamily: 'monospace', color: '#ff8888'
        }).setOrigin(0.5);

        this.enemyHpBar = this._createHealthBar(ex - 50, ey - 52, 100, 10);
        this._updateHealthBar(this.enemyHpBar, this.combat.enemy.hp, this.combat.enemy.maxHp);

        this.enemyHpText = this.add.text(ex, ey - 38, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#cccccc'
        }).setOrigin(0.5);
        this._refreshEnemyHp();
    }

    /* ── Health bars (Phaser Graphics) ─────────────────────────────── */

    _createHealthBar(x, y, w, h) {
        const bg = this.add.graphics();
        bg.fillStyle(0x222222);
        bg.fillRect(x, y, w, h);
        bg.lineStyle(1, 0x666666);
        bg.strokeRect(x, y, w, h);

        const fill = this.add.graphics();
        return { fill, x, y, w, h };
    }

    _updateHealthBar(bar, current, max) {
        bar.fill.clear();
        const ratio = Math.max(0, current / max);
        let color = 0x44cc44;
        if (ratio <= 0.25) color = 0xcc4444;
        else if (ratio <= 0.5) color = 0xcccc44;
        bar.fill.fillStyle(color);
        bar.fill.fillRect(bar.x, bar.y, bar.w * ratio, bar.h);
    }

    _refreshPlayerHp() {
        this.playerHpText.setText(`${this.combat.player.hp} / ${this.combat.player.maxHp}`);
    }

    _refreshEnemyHp() {
        this.enemyHpText.setText(`${this.combat.enemy.hp} / ${this.combat.enemy.maxHp}`);
    }

    /* ── Message area ──────────────────────────────────────────────── */

    _createMessageArea(w) {
        this.messageText = this.add.text(w / 2, 380, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
            align: 'center', wordWrap: { width: 600 }
        }).setOrigin(0.5);
    }

    /* ── Action menu ───────────────────────────────────────────────── */

    _createActionMenu(w) {
        const actions = [
            { label: 'Attack', key: '1' },
            { label: 'Defend', key: '2' },
            { label: 'Item',   key: '3' },
        ];
        const btnW = 160;
        const btnH = 40;
        const gap = 30;
        const totalW = actions.length * btnW + (actions.length - 1) * gap;
        const startX = (w - totalW) / 2;
        const y = 470;

        this.actionButtons = [];

        for (let i = 0; i < actions.length; i++) {
            const cx = startX + i * (btnW + gap) + btnW / 2;
            const action = actions[i];

            const bg = this.add.rectangle(cx, y, btnW, btnH, 0x334455)
                .setStrokeStyle(2, 0x5588aa)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(cx, y, `[${action.key}] ${action.label}`, {
                fontSize: '16px', fontFamily: 'monospace', color: '#ffffff'
            }).setOrigin(0.5);

            bg.on('pointerover', () => { if (this.inputEnabled) bg.setFillStyle(0x446688); });
            bg.on('pointerout',  () => bg.setFillStyle(0x334455));
            bg.on('pointerdown', () => this._onAction(i));

            this.actionButtons.push({ bg, text });
        }

        // Item submenu container (populated on demand)
        this.itemMenu = this.add.container(0, 0).setVisible(false);
    }

    /* ── Keyboard bindings ─────────────────────────────────────────── */

    _setupInput() {
        this.input.keyboard.on('keydown-ONE',   () => this._onAction(0));
        this.input.keyboard.on('keydown-TWO',   () => this._onAction(1));
        this.input.keyboard.on('keydown-THREE', () => this._onAction(2));
    }

    /* ── Input gating ──────────────────────────────────────────────── */

    _enableInput() {
        this.inputEnabled = true;
        for (const btn of this.actionButtons) {
            btn.bg.setAlpha(1);
            btn.text.setAlpha(1);
        }
    }

    _disableInput() {
        this.inputEnabled = false;
        for (const btn of this.actionButtons) {
            btn.bg.setAlpha(0.5);
            btn.text.setAlpha(0.5);
        }
        this._hideItemMenu();
    }

    /* ── Intro ─────────────────────────────────────────────────────── */

    _showIntro() {
        this.messageText.setText(`A wild ${this.combatData.enemy.name} appears!`);
        this.time.delayedCall(1000, () => {
            this.messageText.setText('Your turn \u2014 choose an action.');
            this._enableInput();
        });
    }

    /* ── Action dispatch ───────────────────────────────────────────── */

    _onAction(index) {
        if (!this.inputEnabled || this.combat.getState() !== CombatState.PLAYER_TURN) return;

        if (index === 0) this._doPlayerAttack();
        else if (index === 1) this._doPlayerDefend();
        else if (index === 2) this._toggleItemMenu();
    }

    _doPlayerAttack() {
        this._disableInput();
        const result = this.combat.playerAttack();
        if (!result) return;

        this.messageText.setText(`You attack! ${result.damage} damage!`);
        this._animateAttack(this.playerSprite, this.enemySprite, () => {
            this._updateHealthBar(this.enemyHpBar, this.combat.enemy.hp, this.combat.enemy.maxHp);
            this._refreshEnemyHp();
            this.combat.finishPlayerAnimation();
            this._advance();
        });
    }

    _doPlayerDefend() {
        this._disableInput();
        const result = this.combat.playerDefend();
        if (!result) return;

        this.messageText.setText('You take a defensive stance!');
        this._animateDefend(this.playerSprite, () => {
            this.combat.finishPlayerAnimation();
            this._advance();
        });
    }

    _doPlayerUseItem(item) {
        this._disableInput();
        const result = this.combat.playerUseItem(item);
        if (!result) return;

        // Track consumption for the result payload.
        const tracked = this.consumablesUsed.find(c => c.id === item.id);
        if (tracked) tracked.quantityUsed++;
        else this.consumablesUsed.push({ id: item.id, quantityUsed: 1 });
        item.quantity--;

        this.messageText.setText(`You use ${item.name}! Restored ${result.healed} HP.`);
        this._animateHeal(this.playerSprite, () => {
            this._updateHealthBar(this.playerHpBar, this.combat.player.hp, this.combat.player.maxHp);
            this._refreshPlayerHp();
            this.combat.finishPlayerAnimation();
            this._advance();
        });
    }

    /* ── Turn advancement ──────────────────────────────────────────── */

    _advance() {
        if (this.combat.isOver()) {
            this._handleCombatEnd();
            return;
        }

        if (this.combat.getState() === CombatState.ENEMY_TURN) {
            this.time.delayedCall(600, () => this._doEnemyTurn());
        } else if (this.combat.getState() === CombatState.PLAYER_TURN) {
            this.messageText.setText('Your turn \u2014 choose an action.');
            this._enableInput();
        }
    }

    _doEnemyTurn() {
        const result = this.combat.processEnemyTurn();
        if (!result) return;

        this.messageText.setText(`${this.combatData.enemy.name} attacks! ${result.damage} damage!`);
        this._animateAttack(this.enemySprite, this.playerSprite, () => {
            this._updateHealthBar(this.playerHpBar, this.combat.player.hp, this.combat.player.maxHp);
            this._refreshPlayerHp();
            this.combat.finishEnemyAnimation();
            this._advance();
        });
    }

    /* ── Combat end ────────────────────────────────────────────────── */

    _handleCombatEnd() {
        const result = this.combat.getResult();
        if (result.victory) this._showVictory(result);
        else this._showDefeat();
    }

    _showVictory(result) {
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
        });

        this.messageText.setText(`Victory! Gained ${result.xpReward} XP!`);

        this.time.delayedCall(2000, () => {
            this.events.emit('combat-end', {
                victory: true,
                playerHp: result.playerHp,
                xpGained: result.xpReward,
                lootGained: this._rollLoot(result.lootTable),
                enemyId: this.combatData.enemy.id,
                consumablesUsed: this.consumablesUsed,
            });
        });
    }

    _showDefeat() {
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
        });

        this.messageText.setText('You have been defeated\u2026');

        this.time.delayedCall(2000, () => {
            this.events.emit('combat-end', {
                victory: false,
                playerHp: 0,
                xpGained: 0,
                lootGained: [],
                enemyId: this.combatData.enemy.id,
                consumablesUsed: this.consumablesUsed,
            });
        });
    }

    /**
     * Roll random loot drops from the enemy's loot table.
     * @param {Array<{ itemId: string, chance: number }>} lootTable
     * @returns {Array<{ id: string, quantity: number }>}
     */
    _rollLoot(lootTable) {
        const drops = [];
        for (const entry of lootTable) {
            if (Math.random() < entry.chance) {
                drops.push({ id: entry.itemId, quantity: 1 });
            }
        }
        return drops;
    }

    /* ── Item submenu ──────────────────────────────────────────────── */

    _toggleItemMenu() {
        if (this.itemMenuOpen) this._hideItemMenu();
        else this._showItemMenu();
    }

    _showItemMenu() {
        this._hideItemMenu();
        this.itemMenuOpen = true;

        const usable = this.consumables.filter(i => i.quantity > 0);
        if (usable.length === 0) {
            this.messageText.setText('No items to use!');
            return;
        }

        const { width } = this.scale;
        const menuW = 220;
        const itemH = 32;
        const pad = 10;
        const menuH = usable.length * itemH + pad * 2;
        const menuX = width / 2;
        const menuY = 410 - menuH;

        const panelBg = this.add.rectangle(menuX, menuY + menuH / 2, menuW, menuH, 0x1a1a3e)
            .setStrokeStyle(2, 0x5588aa);
        this.itemMenu.add(panelBg);

        for (let i = 0; i < usable.length; i++) {
            const item = usable[i];
            const y = menuY + pad + i * itemH + itemH / 2;

            const rowBg = this.add.rectangle(menuX, y, menuW - 8, itemH - 4, 0x334455)
                .setStrokeStyle(1, 0x5588aa)
                .setInteractive({ useHandCursor: true });

            const label = this.add.text(menuX, y, `${item.name} x${item.quantity}`, {
                fontSize: '13px', fontFamily: 'monospace', color: '#ffffff'
            }).setOrigin(0.5);

            rowBg.on('pointerover', () => rowBg.setFillStyle(0x446688));
            rowBg.on('pointerout',  () => rowBg.setFillStyle(0x334455));
            rowBg.on('pointerdown', () => this._doPlayerUseItem(item));

            this.itemMenu.add([rowBg, label]);
        }

        this.itemMenu.setVisible(true);
    }

    _hideItemMenu() {
        this.itemMenuOpen = false;
        this.itemMenu.removeAll(true);
        this.itemMenu.setVisible(false);
    }

    /* ── Animations ────────────────────────────────────────────────── */

    _animateAttack(attacker, target, onComplete) {
        const origX = attacker.x;
        const dir = attacker.x < target.x ? 1 : -1;

        this.tweens.add({
            targets: attacker,
            x: origX + dir * 40,
            duration: 150,
            yoyo: true,
            ease: 'Power2',
            onYoyo: () => {
                this.tweens.add({
                    targets: target,
                    alpha: 0.3,
                    duration: 80,
                    yoyo: true,
                    repeat: 1,
                });
            },
            onComplete: () => this.time.delayedCall(300, onComplete),
        });
    }

    _animateDefend(sprite, onComplete) {
        const baseScale = sprite.scaleX;
        this.tweens.add({
            targets: sprite,
            scaleX: baseScale * 1.1,
            scaleY: baseScale * 1.1,
            duration: 200,
            yoyo: true,
            ease: 'Bounce',
            onComplete: () => this.time.delayedCall(200, onComplete),
        });
    }

    _animateHeal(sprite, onComplete) {
        const glow = this.add.circle(sprite.x, sprite.y, 30, 0x44ff44, 0.4);
        this.tweens.add({
            targets: glow,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 500,
            onComplete: () => {
                glow.destroy();
                onComplete();
            },
        });
    }
}
