import { TILE_SIZE, tileToPixel } from '../utils/helpers.js';

export default class Enemy {
    /**
     * @param {Phaser.Scene} scene    – the scene that owns this entity
     * @param {number}       tileX    – map column (tile coords)
     * @param {number}       tileY    – map row    (tile coords)
     * @param {object}       data     – enemy template from ENEMIES catalog
     */
    constructor(scene, tileX, tileY, data) {
        this.scene = scene;
        this.tileX = tileX;
        this.tileY = tileY;

        // Copy combat-relevant stats from the template so each instance
        // is independent (hp can decrease during combat, etc.).
        this.id        = data.id;
        this.name      = data.name;
        this.hp        = data.hp;
        this.maxHp     = data.maxHp;
        this.attack    = data.attack;
        this.defense   = data.defense;
        this.xpReward  = data.xpReward;
        this.lootTable = data.lootTable;

        this.defeated = false;

        // Create arcade-physics sprite at the center of the given tile.
        const { x, y } = tileToPixel(tileX, tileY);
        this.sprite = scene.physics.add.sprite(x, y, data.spriteKey, 0);
        this.sprite.setSize(TILE_SIZE, TILE_SIZE);
        this.sprite.setImmovable(true);
    }

    /**
     * Register an overlap callback between this enemy and the player sprite.
     * When the player walks into the enemy the callback fires (typically to
     * start combat).  Uses Phaser arcade overlap so neither body is pushed.
     *
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     * @param {function} callback – receives (playerSprite, enemySprite)
     * @param {object}   [context] – `this` for the callback
     */
    addOverlap(playerSprite, callback, context) {
        this.scene.physics.add.overlap(
            playerSprite,
            this.sprite,
            callback,
            null,
            context
        );
    }

    /**
     * Mark this enemy as defeated: hide and deactivate the sprite so it is
     * no longer visible or collidable on the world map.
     */
    defeat() {
        this.defeated = true;
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
        this.sprite.body.enable = false;
    }

    /**
     * Restore a defeated enemy (e.g. on game reload / respawn).
     */
    revive() {
        this.defeated = false;
        this.hp = this.maxHp;
        this.sprite.setActive(true);
        this.sprite.setVisible(true);
        this.sprite.body.enable = true;
    }
}
