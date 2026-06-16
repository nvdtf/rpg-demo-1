/**
 * UIScene — HUD overlay that runs in parallel with WorldScene.
 *
 * Launched via `scene.launch('UIScene')` so it renders on top of the
 * game world without blocking input.  Uses the global game event bus
 * (`this.game.events`) to receive player stat updates.
 */
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
        this.keyEsc.on('down', () => {
            if (this.charScreenVisible) this._hideCharScreen();
        });

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

    /* ── cleanup ────────────────────────────────────────────────────── */

    _cleanup() {
        this.game.events.off('player-stats-changed', this._onStatsChanged, this);
        this._hideCharScreen();
    }
}
