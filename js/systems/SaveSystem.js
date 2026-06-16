/**
 * SaveSystem — localStorage serialization for game state.
 *
 * No Phaser dependency; operates on plain player-data objects.
 *
 * Save format follows contracts/game-state.md:
 *   Storage key: "rpg_save_v1"
 *   Schema version: 1
 *
 * Runtime player state uses `player.equipped.weapon` / `player.equipped.armor`,
 * but the save schema stores them as `equippedWeapon` / `equippedArmor` at the
 * player level.  This module handles the mapping in both directions.
 */

const STORAGE_KEY = 'rpg_save_v1';
const CURRENT_VERSION = 1;

export default class SaveSystem {

    /**
     * Serialize the current game state and persist it to localStorage.
     *
     * @param {object} player           – runtime player object
     * @param {Array}  [defeatedEnemies=[]] – array of defeated enemy instance ids
     * @returns {{ success: boolean, reason: string }}
     */
    static save(player, defeatedEnemies = []) {
        const data = {
            version: CURRENT_VERSION,
            timestamp: new Date().toISOString(),
            player: {
                name:      player.name || 'Hero',
                level:     player.level,
                xp:        player.xp,
                xpToNext:  player.xpToNext,
                hp:        player.hp,
                maxHp:     player.maxHp,
                attack:    player.attack,
                defense:   player.defense,
                x:         player.tileX != null ? player.tileX : player.x,
                y:         player.tileY != null ? player.tileY : player.y,
                gold:      player.gold || 0,
                equippedWeapon: (player.equipped && player.equipped.weapon) || null,
                equippedArmor:  (player.equipped && player.equipped.armor)  || null,
                inventory: player.inventory ? player.inventory.map(item => ({
                    id:           item.id,
                    name:         item.name,
                    type:         item.type,
                    attackBonus:  item.attackBonus  || 0,
                    defenseBonus: item.defenseBonus || 0,
                    healAmount:   item.healAmount   || 0,
                    quantity:     item.quantity      || 1,
                    description:  item.description  || '',
                })) : [],
            },
            questLog: player.questLog ? player.questLog.map(entry => ({
                questId:  entry.questId,
                progress: entry.progress,
                status:   entry.status,
            })) : [],
            defeatedEnemies: defeatedEnemies.slice(),
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return { success: true, reason: 'saved' };
        } catch (e) {
            return { success: false, reason: 'storage_error' };
        }
    }

    /**
     * Read and parse the saved game state from localStorage.
     *
     * Returns the parsed save object on success, or null if no save exists
     * or the save is incompatible.
     *
     * The returned object uses the on-disk schema (equippedWeapon/equippedArmor).
     * Callers can use `applyToPlayer` to map back to runtime format.
     *
     * @returns {{ data: object, reason: string } | { data: null, reason: string }}
     */
    static load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw == null) {
            return { data: null, reason: 'no_save' };
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return { data: null, reason: 'corrupt' };
        }

        if (!parsed || parsed.version !== CURRENT_VERSION) {
            return { data: null, reason: 'version_mismatch' };
        }

        return { data: parsed, reason: 'loaded' };
    }

    /**
     * Check whether a compatible save file exists in localStorage.
     *
     * @returns {boolean}
     */
    static hasSave() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw == null) return false;

        try {
            const parsed = JSON.parse(raw);
            return parsed && parsed.version === CURRENT_VERSION;
        } catch (e) {
            return false;
        }
    }

    /**
     * Apply loaded save data onto a runtime player object.
     *
     * Maps the save schema's `equippedWeapon` / `equippedArmor` back to
     * the runtime `player.equipped` structure.
     *
     * @param {object} player   – the runtime player object to mutate
     * @param {object} saveData – the `player` sub-object from a loaded save
     */
    static applyToPlayer(player, saveData) {
        player.name     = saveData.name || 'Hero';
        player.level    = saveData.level;
        player.xp       = saveData.xp;
        player.xpToNext = saveData.xpToNext;
        player.hp       = saveData.hp;
        player.maxHp    = saveData.maxHp;
        player.attack   = saveData.attack;
        player.defense  = saveData.defense;
        player.gold     = saveData.gold || 0;

        // Position — support both tileX/tileY and x/y naming.
        if (player.tileX != null) {
            player.tileX = saveData.x;
            player.tileY = saveData.y;
        }

        // Map save schema (equippedWeapon/equippedArmor) → runtime (equipped.weapon/equipped.armor).
        if (!player.equipped) player.equipped = { weapon: null, armor: null };
        player.equipped.weapon = saveData.equippedWeapon || null;
        player.equipped.armor  = saveData.equippedArmor  || null;

        // Restore inventory.
        player.inventory = saveData.inventory ? saveData.inventory.slice() : [];

        // Restore quest log.
        player.questLog = saveData.questLog
            ? saveData.questLog.map(e => ({ ...e }))
            : [];
    }

    /**
     * Delete the save file from localStorage.
     *
     * @returns {boolean} true if a save was removed, false if none existed.
     */
    static deleteSave() {
        if (localStorage.getItem(STORAGE_KEY) == null) return false;
        localStorage.removeItem(STORAGE_KEY);
        return true;
    }
}
