import SaveSystem from '../systems/SaveSystem.js';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data) {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // Darken background
        this.add.rectangle(centerX, height / 2, width, height, 0x000000);

        // "Game Over" title
        this.add.text(centerX, height * 0.3, 'Game Over', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#cc3333',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Check for existing save
        const hasSave = SaveSystem.hasSave();

        // New Game button
        this._createButton(centerX, height * 0.55, 'New Game', true, () => {
            this.scene.start('WorldScene', { mode: 'new_game' });
        });

        // Load Save button (disabled if no save)
        this._createButton(centerX, height * 0.55 + 60, 'Load Save', hasSave, () => {
            const { data } = SaveSystem.load();
            if (data) {
                this.scene.start('WorldScene', { mode: 'load_game', saveData: data });
            }
        });
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
}
