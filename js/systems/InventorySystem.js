/**
 * InventorySystem — item management, equipping, and consumable usage.
 *
 * No Phaser dependency; operates on plain player-data objects.
 *
 * Player state expectations:
 *   player.inventory — Array of item objects (max 20 distinct entries)
 *   player.equipped  — { weapon: item|null, armor: item|null }
 *
 * Consumable items stack (single entry, quantity incremented).
 * Equipment items do not stack (quantity always 1).
 * Capacity is 20 distinct inventory entries.
 */

import ITEMS from '../data/items.js';

const MAX_CAPACITY = 20;

export default class InventorySystem {

    /* ── internal helpers ──────────────────────────────────────────── */

    /** Ensure player has the inventory and equipped structures. */
    static _ensureState(player) {
        if (!player.inventory) player.inventory = [];
        if (!player.equipped) player.equipped = { weapon: null, armor: null };
    }

    /* ── add / remove ─────────────────────────────────────────────── */

    /**
     * Add an item to the player's inventory by catalog id.
     *
     * Consumables stack with existing entries. Equipment is added as a
     * new entry (quantity 1). Rejects when the inventory has reached
     * 20 distinct entries (unless stacking onto an existing consumable).
     *
     * @param {object} player
     * @param {string} itemId — key in ITEMS catalog
     * @param {number} [count=1] — how many to add (consumables only)
     * @returns {{ success: boolean, item: object|null, reason: string }}
     */
    static addItem(player, itemId, count = 1) {
        InventorySystem._ensureState(player);

        const template = ITEMS[itemId];
        if (!template) {
            return { success: false, item: null, reason: 'unknown_item' };
        }

        // Consumables stack onto an existing entry if present.
        if (template.type === 'consumable') {
            const existing = player.inventory.find(i => i.id === itemId);
            if (existing) {
                existing.quantity += count;
                return { success: true, item: existing, reason: 'stacked' };
            }
        }

        // Capacity check (new distinct entry required).
        if (player.inventory.length >= MAX_CAPACITY) {
            return { success: false, item: null, reason: 'inventory_full' };
        }

        const item = Object.assign({}, template, {
            quantity: template.type === 'consumable' ? count : 1,
        });
        player.inventory.push(item);
        return { success: true, item, reason: 'added' };
    }

    /**
     * Remove an item from the player's inventory.
     *
     * For consumables, decrements quantity by `count`; removes the entry
     * entirely when quantity reaches zero. For equipment, removes the entry.
     *
     * @param {object} player
     * @param {string} itemId
     * @param {number} [count=1]
     * @returns {object|null} The removed/decremented item, or null if not found.
     */
    static removeItem(player, itemId, count = 1) {
        InventorySystem._ensureState(player);

        const idx = player.inventory.findIndex(i => i.id === itemId);
        if (idx === -1) return null;

        const item = player.inventory[idx];

        if (item.type === 'consumable' && item.quantity > count) {
            item.quantity -= count;
            return item;
        }

        player.inventory.splice(idx, 1);
        return item;
    }

    /* ── equip / unequip ──────────────────────────────────────────── */

    /**
     * Equip a weapon from inventory.
     *
     * If a weapon is already equipped, it is returned to inventory first.
     * The newly equipped weapon is removed from inventory.
     *
     * @param {object} player
     * @param {string} itemId
     * @returns {{ success: boolean, equipped: object|null, unequipped: object|null }}
     */
    static equipWeapon(player, itemId) {
        return InventorySystem._equipSlot(player, itemId, 'weapon');
    }

    /**
     * Equip armor from inventory.
     *
     * If armor is already equipped, it is returned to inventory first.
     * The newly equipped armor is removed from inventory.
     *
     * @param {object} player
     * @param {string} itemId
     * @returns {{ success: boolean, equipped: object|null, unequipped: object|null }}
     */
    static equipArmor(player, itemId) {
        return InventorySystem._equipSlot(player, itemId, 'armor');
    }

    /**
     * Shared equip logic for weapon/armor slots.
     * @private
     */
    static _equipSlot(player, itemId, slot) {
        InventorySystem._ensureState(player);

        const idx = player.inventory.findIndex(i => i.id === itemId);
        if (idx === -1) {
            return { success: false, equipped: null, unequipped: null };
        }

        const item = player.inventory[idx];
        if (item.type !== slot) {
            return { success: false, equipped: null, unequipped: null };
        }

        // Swap: move current equipment back to inventory.
        let unequipped = null;
        if (player.equipped[slot]) {
            unequipped = player.equipped[slot];
            player.inventory.push(unequipped);
        }

        // Remove new item from inventory and place in slot.
        player.inventory.splice(idx, 1);
        player.equipped[slot] = item;

        return { success: true, equipped: item, unequipped };
    }

    /**
     * Unequip an item from a slot, returning it to inventory.
     *
     * Fails if the slot is empty or inventory is full.
     *
     * @param {object} player
     * @param {'weapon'|'armor'} slot
     * @returns {{ success: boolean, item: object|null, reason: string }}
     */
    static unequip(player, slot) {
        InventorySystem._ensureState(player);

        const item = player.equipped[slot];
        if (!item) {
            return { success: false, item: null, reason: 'slot_empty' };
        }

        if (player.inventory.length >= MAX_CAPACITY) {
            return { success: false, item: null, reason: 'inventory_full' };
        }

        player.equipped[slot] = null;
        player.inventory.push(item);
        return { success: true, item, reason: 'unequipped' };
    }

    /* ── consumables ──────────────────────────────────────────────── */

    /**
     * Use a consumable item from inventory.
     *
     * Restores HP by the item's healAmount, capped at player.maxHp.
     * Decrements quantity; removes entry when quantity reaches zero.
     *
     * @param {object} player — must have hp, maxHp
     * @param {string} itemId
     * @returns {{ success: boolean, healed: number, item: object|null } | null}
     *          null if the item is not found or not a consumable.
     */
    static useConsumable(player, itemId) {
        InventorySystem._ensureState(player);

        const idx = player.inventory.findIndex(i => i.id === itemId);
        if (idx === -1) return null;

        const item = player.inventory[idx];
        if (item.type !== 'consumable' || !item.healAmount) return null;

        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + item.healAmount);
        const healed = player.hp - before;

        // Consume one charge.
        item.quantity -= 1;
        if (item.quantity <= 0) {
            player.inventory.splice(idx, 1);
        }

        return { success: true, healed, item };
    }

    /* ── queries ───────────────────────────────────────────────────── */

    /**
     * Return the player's inventory array.
     * @param {object} player
     * @returns {Array<object>}
     */
    static getInventory(player) {
        InventorySystem._ensureState(player);
        return player.inventory;
    }

    /**
     * Return the player's equipped items.
     * @param {object} player
     * @returns {{ weapon: object|null, armor: object|null }}
     */
    static getEquipped(player) {
        InventorySystem._ensureState(player);
        return player.equipped;
    }
}
