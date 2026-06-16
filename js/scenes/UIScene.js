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

    /* ── cleanup ────────────────────────────────────────────────────── */

    _cleanup() {
        this.game.events.off('player-stats-changed', this._onStatsChanged, this);
    }
}
