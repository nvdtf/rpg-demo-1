import { TILE_SIZE, tileToPixel } from '../utils/helpers.js';

export default class NPC {
    /**
     * @param {Phaser.Scene} scene  – the scene that owns this entity
     * @param {number}       tileX  – map column (tile coords)
     * @param {number}       tileY  – map row    (tile coords)
     * @param {object}       data   – NPC template from NPCS catalog
     */
    constructor(scene, tileX, tileY, data) {
        this.scene = scene;
        this.tileX = tileX;
        this.tileY = tileY;

        this.id      = data.id;
        this.name    = data.name;
        this.dialog  = data.dialog;
        this.questId = data.questId;

        // Create arcade-physics sprite at the center of the given tile.
        const { x, y } = tileToPixel(tileX, tileY);
        this.sprite = scene.physics.add.sprite(x, y, data.spriteKey, 0);
        this.sprite.setSize(TILE_SIZE, TILE_SIZE);
        this.sprite.setImmovable(true);

        // Interaction trigger zone — a larger invisible zone around the NPC
        // that detects when the player is within interaction range (1 tile).
        this.interactionZone = scene.add.zone(x, y, TILE_SIZE * 3, TILE_SIZE * 3);
        scene.physics.add.existing(this.interactionZone, true); // static body

        this.isInteracting = false;
        this.dialogIndex = 0;
    }

    /**
     * Register an overlap callback between this NPC's interaction zone and
     * the player sprite. When the player walks into range and presses the
     * interaction key, the callback fires. Uses Phaser arcade overlap so
     * neither body is pushed.
     *
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     * @param {function} callback – receives (playerSprite, zone)
     * @param {object}   [context] – `this` for the callback
     */
    addOverlap(playerSprite, callback, context) {
        this.scene.physics.add.overlap(
            playerSprite,
            this.interactionZone,
            callback,
            null,
            context,
        );
    }

    /**
     * Start or advance the dialog sequence. Returns the current dialog line
     * or null when the dialog is complete.
     *
     * @returns {{ line: string, name: string, done: boolean } | null}
     */
    interact() {
        if (!this.dialog || this.dialog.length === 0) return null;

        if (!this.isInteracting) {
            this.isInteracting = true;
            this.dialogIndex = 0;
        }

        if (this.dialogIndex >= this.dialog.length) {
            return this.endDialog();
        }

        const line = this.dialog[this.dialogIndex];
        this.dialogIndex++;

        const done = this.dialogIndex >= this.dialog.length;
        return { line, name: this.name, done };
    }

    /**
     * End the current dialog sequence and reset state.
     * Returns null to signal that dialog is finished.
     *
     * @returns {null}
     */
    endDialog() {
        this.isInteracting = false;
        this.dialogIndex = 0;
        return null;
    }

    /**
     * Check whether this NPC is currently in a dialog interaction.
     * @returns {boolean}
     */
    get inDialog() {
        return this.isInteracting;
    }
}
