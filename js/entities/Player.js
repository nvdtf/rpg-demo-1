import { TILE_SIZE, Direction, tileToPixel } from '../utils/helpers.js';
import LevelSystem from '../systems/LevelSystem.js';

export default class Player {
    /**
     * @param {Phaser.Scene} scene  – the scene that owns this entity
     * @param {number} tileX        – spawn column (tile coords)
     * @param {number} tileY        – spawn row    (tile coords)
     */
    constructor(scene, tileX, tileY) {
        this.scene = scene;
        this.tileX = tileX;
        this.tileY = tileY;
        this.isMoving = false;
        this.facing = 'down';

        /** Base stats derived from LevelSystem. */
        this.level = 1;
        this.xp = 0;
        this.xpToNext = LevelSystem.getXpForLevel(1);
        const stats = LevelSystem.getStatsForLevel(1);
        this.maxHp = stats.maxHp;
        this.hp = this.maxHp;
        this.attack = stats.attack;
        this.defense = stats.defense;

        /** Tile-map layers the player cannot walk through. */
        this.collisionLayers = [];
        /** Map dimensions in tiles (set via setMapBounds). */
        this.mapWidth = 0;
        this.mapHeight = 0;

        // Create arcade-physics sprite at the center of the spawn tile.
        const { x, y } = tileToPixel(tileX, tileY);
        this.sprite = scene.physics.add.sprite(x, y, 'player', 0);
        this.sprite.setSize(TILE_SIZE, TILE_SIZE);

        // Register keyboard inputs.
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
    }

    /* ── stats / events ─────────────────────────────────────────────── */

    /** Broadcast current stats on the global game event bus. */
    emitStats() {
        this.scene.game.events.emit('player-stats-changed', {
            hp: this.hp,
            maxHp: this.maxHp,
        });
    }

    /* ── configuration (called by WorldScene after construction) ────── */

    setCollisionLayers(layers) {
        this.collisionLayers = layers;
    }

    setMapBounds(widthInTiles, heightInTiles) {
        this.mapWidth = widthInTiles;
        this.mapHeight = heightInTiles;
    }

    /* ── per-frame update ──────────────────────────────────────────── */

    update() {
        if (this.isMoving) return;

        const input = this._readDirection();
        if (!input) {
            // No input — ensure idle frame is shown for the current facing.
            if (this.sprite.anims.isPlaying) {
                this.sprite.anims.stop();
                this.sprite.setFrame(this._idleFrame());
            }
            return;
        }

        const { dir, anim, facing } = input;
        this.facing = facing;

        const targetX = this.tileX + dir.x;
        const targetY = this.tileY + dir.y;

        if (this._isTileBlocked(targetX, targetY)) {
            // Can't move but face the attempted direction.
            this.sprite.anims.stop();
            this.sprite.setFrame(this._idleFrame());
            return;
        }

        this._tweenTo(targetX, targetY, anim);
    }

    /** Force the sprite into the idle frame for the current facing direction. */
    setIdle() {
        this.sprite.anims.stop();
        this.sprite.setFrame(this._idleFrame());
    }

    /* ── movement helpers ──────────────────────────────────────────── */

    _readDirection() {
        if (this.cursors.up.isDown    || this.wasd.up.isDown) {
            return { dir: Direction.UP,    anim: 'player-walk-up',    facing: 'up' };
        }
        if (this.cursors.down.isDown  || this.wasd.down.isDown) {
            return { dir: Direction.DOWN,  anim: 'player-walk-down',  facing: 'down' };
        }
        if (this.cursors.left.isDown  || this.wasd.left.isDown) {
            return { dir: Direction.LEFT,  anim: 'player-walk-left',  facing: 'left' };
        }
        if (this.cursors.right.isDown || this.wasd.right.isDown) {
            return { dir: Direction.RIGHT, anim: 'player-walk-right', facing: 'right' };
        }
        return null;
    }

    _tweenTo(tileX, tileY, anim) {
        this.isMoving = true;
        this.tileX = tileX;
        this.tileY = tileY;

        const { x, y } = tileToPixel(tileX, tileY);
        this.sprite.anims.play(anim, true);

        this.scene.tweens.add({
            targets: this.sprite,
            x,
            y,
            duration: 150,
            ease: 'Sine.Out',
            onComplete: () => {
                this.isMoving = false;
                if (!this._isAnyDirectionHeld()) {
                    this.sprite.anims.stop();
                    this.sprite.setFrame(this._idleFrame());
                }
            },
        });
    }

    /* ── collision ─────────────────────────────────────────────────── */

    _isTileBlocked(tileX, tileY) {
        if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) {
            return true;
        }
        for (const layer of this.collisionLayers) {
            if (layer.getTileAt(tileX, tileY)) return true;
        }
        return false;
    }

    /* ── input / animation queries ─────────────────────────────────── */

    _isAnyDirectionHeld() {
        return this.cursors.up.isDown    || this.wasd.up.isDown
            || this.cursors.down.isDown  || this.wasd.down.isDown
            || this.cursors.left.isDown  || this.wasd.left.isDown
            || this.cursors.right.isDown || this.wasd.right.isDown;
    }

    _idleFrame() {
        const frames = { down: 0, left: 3, right: 6, up: 9 };
        return frames[this.facing] ?? 0;
    }
}
