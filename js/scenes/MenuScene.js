export class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // Title
        this.add.text(centerX, 100, 'RPG Quest', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(centerX, 150, 'A Browser Adventure', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Check for existing save
        const hasSave = localStorage.getItem('rpg_save_v1') !== null;

        // New Game button
        this._createButton(centerX, 260, 'New Game', true, () => {
            this.scene.start('WorldScene', { mode: 'new_game' });
        });

        // Load Game button (disabled if no save)
        this._createButton(centerX, 320, 'Load Game', hasSave, () => {
            this.scene.start('WorldScene', { mode: 'load_game' });
        });

        // Controls button
        this._createButton(centerX, 380, 'Controls', true, () => {
            this._showControls();
        });

        // Controls overlay (hidden initially)
        this.controlsOverlay = this._buildControlsOverlay();
        this.controlsOverlay.setVisible(false);
    }

    _createButton(x, y, label, enabled, callback) {
        const btnWidth = 200;
        const btnHeight = 40;

        const bg = this.add.rectangle(x, y, btnWidth, btnHeight, enabled ? 0x334455 : 0x222222)
            .setStrokeStyle(2, enabled ? 0x5588aa : 0x444444);

        const text = this.add.text(x, y, label, {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: enabled ? '#ffffff' : '#666666'
        }).setOrigin(0.5);

        if (enabled) {
            bg.setInteractive({ useHandCursor: true });

            bg.on('pointerover', () => {
                bg.setFillStyle(0x446688);
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(0x334455);
            });

            bg.on('pointerdown', callback);
        }

        return { bg, text };
    }

    _buildControlsOverlay() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        const container = this.add.container(0, 0);

        // Dimmed backdrop
        const backdrop = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.8)
            .setInteractive();
        container.add(backdrop);

        // Panel background
        const panelW = 520;
        const panelH = 440;
        const panel = this.add.rectangle(centerX, centerY, panelW, panelH, 0x1a1a2e)
            .setStrokeStyle(2, 0x5588aa);
        container.add(panel);

        // Title
        const title = this.add.text(centerX, centerY - panelH / 2 + 25, 'Controls', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(title);

        // Exploration heading
        const exploreLabel = this.add.text(centerX - panelW / 2 + 30, centerY - panelH / 2 + 60, 'Exploration', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#5588aa'
        });
        container.add(exploreLabel);

        const explorationBindings = [
            ['Arrow Keys / WASD', 'Move character'],
            ['Enter / Space', 'Interact / advance dialog'],
            ['I', 'Open inventory'],
            ['C', 'Open character screen'],
            ['Q', 'Open quest log'],
            ['Escape', 'Pause menu']
        ];

        let yOff = centerY - panelH / 2 + 85;
        for (const [key, action] of explorationBindings) {
            const keyText = this.add.text(centerX - panelW / 2 + 40, yOff, key, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cccc88'
            });
            const actionText = this.add.text(centerX + 30, yOff, action, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cccccc'
            });
            container.add([keyText, actionText]);
            yOff += 24;
        }

        // Combat heading
        yOff += 10;
        const combatLabel = this.add.text(centerX - panelW / 2 + 30, yOff, 'Combat', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#5588aa'
        });
        container.add(combatLabel);
        yOff += 28;

        const combatBindings = [
            ['1 / Click', 'Attack'],
            ['2 / Click', 'Defend'],
            ['3 / Click', 'Open items'],
            ['Click item', 'Use consumable']
        ];

        for (const [key, action] of combatBindings) {
            const keyText = this.add.text(centerX - panelW / 2 + 40, yOff, key, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cccc88'
            });
            const actionText = this.add.text(centerX + 30, yOff, action, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cccccc'
            });
            container.add([keyText, actionText]);
            yOff += 24;
        }

        // Close instruction
        const closeText = this.add.text(centerX, centerY + panelH / 2 - 25, 'Click anywhere or press Escape to close', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#888888'
        }).setOrigin(0.5);
        container.add(closeText);

        // Close handlers
        backdrop.on('pointerdown', () => container.setVisible(false));
        this.input.keyboard.on('keydown-ESC', () => {
            if (container.visible) {
                container.setVisible(false);
            }
        });

        return container;
    }

    _showControls() {
        this.controlsOverlay.setVisible(true);
    }
}
