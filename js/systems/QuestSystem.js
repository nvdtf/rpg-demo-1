/**
 * QuestSystem — quest acceptance, progress tracking, completion, and rewards.
 *
 * No Phaser dependency; operates on plain player-data objects.
 *
 * Quest entries stored on `player.questLog` as:
 *   { questId: string, progress: number, status: 'active' | 'completed' }
 *
 * Objective types (from quest definitions):
 *   'defeat'      — triggered when an enemy is defeated (targetId = enemy id)
 *   'find_item'   — triggered when an item is found     (targetId = item id)
 *   'talk_to_npc' — triggered when an NPC is spoken to  (targetId = NPC id)
 */

import QUESTS from '../data/quests.js';
import ITEMS from '../data/items.js';
import LevelSystem from './LevelSystem.js';

export default class QuestSystem {

    /* ── quest lookup ──────────────────────────────────────────────── */

    /**
     * Return the quest definition for an id, or null if unknown.
     * @param {string} questId
     * @returns {object|null}
     */
    static getDefinition(questId) {
        return QUESTS[questId] ?? null;
    }

    /* ── accept ────────────────────────────────────────────────────── */

    /**
     * Accept a quest, adding it to the player's quest log.
     *
     * Returns `true` if the quest was accepted. Returns `false` if the
     * quest id is unknown or the quest is already in the log (active or
     * completed).
     *
     * @param {object} player — mutable player state (must have questLog[])
     * @param {string} questId
     * @returns {boolean}
     */
    static acceptQuest(player, questId) {
        const def = QuestSystem.getDefinition(questId);
        if (!def) return false;

        if (!player.questLog) player.questLog = [];

        if (player.questLog.some(e => e.questId === questId)) return false;

        player.questLog.push({
            questId,
            progress: 0,
            status: 'active',
        });
        return true;
    }

    /* ── progress ──────────────────────────────────────────────────── */

    /**
     * Notify the quest system that a game event occurred.
     *
     * Iterates all active quests and increments progress for any whose
     * objectiveType and targetId match the event. Quests that reach
     * their targetCount are NOT auto-completed here — call
     * `completeQuest` explicitly when the player turns the quest in.
     *
     * @param {object}  player    — mutable player state
     * @param {string}  eventType — 'defeat' | 'find_item' | 'talk_to_npc'
     * @param {string}  targetId  — id of the defeated enemy / found item / NPC
     * @param {number}  [count=1] — how many (usually 1)
     * @returns {Array<{ questId: string, progress: number, targetCount: number, ready: boolean }>}
     *          List of quests whose progress changed. `ready` is true when
     *          progress >= targetCount.
     */
    static updateProgress(player, eventType, targetId, count = 1) {
        if (!player.questLog) return [];

        const changed = [];

        for (const entry of player.questLog) {
            if (entry.status !== 'active') continue;

            const def = QuestSystem.getDefinition(entry.questId);
            if (!def) continue;

            if (def.objectiveType !== eventType) continue;
            if (def.targetId !== targetId) continue;

            const prev = entry.progress;
            entry.progress = Math.min(entry.progress + count, def.targetCount);

            if (entry.progress !== prev) {
                changed.push({
                    questId: entry.questId,
                    progress: entry.progress,
                    targetCount: def.targetCount,
                    ready: entry.progress >= def.targetCount,
                });
            }
        }

        return changed;
    }

    /* ── completion & rewards ──────────────────────────────────────── */

    /**
     * Complete a quest and distribute its rewards.
     *
     * Returns a reward summary on success, or `null` if the quest
     * cannot be completed (not found, not active, or progress < target).
     *
     * Rewards:
     *   • XP   — applied via LevelSystem.addXp
     *   • Gold — added to player.gold
     *   • Item — cloned from ITEMS catalog and pushed to player.inventory
     *            (respects the 20-item capacity limit)
     *
     * @param {object} player
     * @param {string} questId
     * @returns {{ xp: number, gold: number, item: object|null,
     *             levelUp: object|null } | null}
     */
    static completeQuest(player, questId) {
        if (!player.questLog) return null;

        const entry = player.questLog.find(
            e => e.questId === questId && e.status === 'active'
        );
        if (!entry) return null;

        const def = QuestSystem.getDefinition(questId);
        if (!def) return null;

        if (entry.progress < def.targetCount) return null;

        // Mark completed.
        entry.status = 'completed';

        // --- Reward: XP ---
        let levelUp = null;
        if (def.rewardXp > 0) {
            levelUp = LevelSystem.addXp(player, def.rewardXp);
        }

        // --- Reward: Gold ---
        if (def.rewardGold > 0) {
            if (player.gold == null) player.gold = 0;
            player.gold += def.rewardGold;
        }

        // --- Reward: Item ---
        let rewardItem = null;
        if (def.rewardItemId) {
            const template = ITEMS[def.rewardItemId];
            if (template) {
                if (!player.inventory) player.inventory = [];

                if (player.inventory.length < 20) {
                    rewardItem = Object.assign({}, template, { quantity: 1 });

                    // Stack consumables if already in inventory.
                    if (template.type === 'consumable') {
                        const existing = player.inventory.find(
                            i => i.id === template.id
                        );
                        if (existing) {
                            existing.quantity += 1;
                            rewardItem = existing;
                        } else {
                            player.inventory.push(rewardItem);
                        }
                    } else {
                        player.inventory.push(rewardItem);
                    }
                }
                // If inventory full (>= 20), item is silently skipped.
                // Callers can check the return value.
            }
        }

        return {
            xp: def.rewardXp,
            gold: def.rewardGold,
            item: rewardItem,
            levelUp,
        };
    }

    /* ── queries ───────────────────────────────────────────────────── */

    /**
     * Return all active quest entries for a player.
     * @param {object} player
     * @returns {Array<{ questId: string, progress: number, status: string }>}
     */
    static getActiveQuests(player) {
        if (!player.questLog) return [];
        return player.questLog.filter(e => e.status === 'active');
    }

    /**
     * Return all completed quest entries for a player.
     * @param {object} player
     * @returns {Array<{ questId: string, progress: number, status: string }>}
     */
    static getCompletedQuests(player) {
        if (!player.questLog) return [];
        return player.questLog.filter(e => e.status === 'completed');
    }

    /**
     * Return the quest entry for a specific quest, or null.
     * @param {object} player
     * @param {string} questId
     * @returns {{ questId: string, progress: number, status: string } | null}
     */
    static getQuestEntry(player, questId) {
        if (!player.questLog) return null;
        return player.questLog.find(e => e.questId === questId) ?? null;
    }

    /**
     * Check whether a quest's objective has been fully met (progress >= target)
     * but has not yet been turned in (still 'active').
     * @param {object} player
     * @param {string} questId
     * @returns {boolean}
     */
    static isReadyToComplete(player, questId) {
        const entry = QuestSystem.getQuestEntry(player, questId);
        if (!entry || entry.status !== 'active') return false;

        const def = QuestSystem.getDefinition(questId);
        if (!def) return false;

        return entry.progress >= def.targetCount;
    }
}
