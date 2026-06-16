/**
 * LevelSystem — XP thresholds, stat growth, and level-up logic.
 *
 * No Phaser dependency; operates on plain player-data objects.
 *
 * Formulas (derived from the progression table in data-model.md):
 *   xpToNext(level) = floor(100 * level^1.5)
 *   maxHp(level)    = 50 + (level - 1) * (level + 8)
 *   attack(level)   = 6  + floor((level + 3)^2 / 4)
 *   defense(level)  = round(0.2 * level^2 + 0.8 * level + 4)
 */

export default class LevelSystem {
    /**
     * XP required to advance from `level` to `level + 1`.
     * @param {number} level
     * @returns {number}
     */
    static getXpForLevel(level) {
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    /**
     * Base stats for a given level (before equipment bonuses).
     * @param {number} level
     * @returns {{ maxHp: number, attack: number, defense: number }}
     */
    static getStatsForLevel(level) {
        return {
            maxHp:   50 + (level - 1) * (level + 8),
            attack:  6 + Math.floor((level + 3) * (level + 3) / 4),
            defense: Math.round(0.2 * level * level + 0.8 * level + 4),
        };
    }

    /**
     * Add XP to a player and process any resulting level-ups.
     *
     * Mutates the player object in place (xp, level, maxHp, hp, attack,
     * defense, xpToNext). HP is increased by the same delta as maxHp so
     * the player's missing-HP gap is preserved across level-ups.
     *
     * @param {{ level: number, xp: number, xpToNext: number,
     *           hp: number, maxHp: number, attack: number,
     *           defense: number }} player
     * @param {number} amount  – XP to award (must be >= 0)
     * @returns {{ levelsGained: number, newLevel: number,
     *            stats: { maxHp: number, attack: number, defense: number } } | null}
     *          Level-up info, or null if no level-up occurred.
     */
    static addXp(player, amount) {
        player.xp += amount;

        let levelsGained = 0;

        while (player.xp >= player.xpToNext) {
            player.xp -= player.xpToNext;
            player.level += 1;
            levelsGained += 1;

            const newStats = LevelSystem.getStatsForLevel(player.level);
            const hpGain = newStats.maxHp - player.maxHp;

            player.maxHp   = newStats.maxHp;
            player.attack  = newStats.attack;
            player.defense = newStats.defense;
            player.hp      = Math.min(player.maxHp, player.hp + hpGain);

            player.xpToNext = LevelSystem.getXpForLevel(player.level);
        }

        if (levelsGained === 0) return null;

        return {
            levelsGained,
            newLevel: player.level,
            stats: LevelSystem.getStatsForLevel(player.level),
        };
    }
}
