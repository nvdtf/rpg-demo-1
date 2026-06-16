/**
 * CombatSystem — pure-logic FSM for turn-based combat.
 *
 * Five states:
 *   PLAYER_TURN → PLAYER_ANIMATING → ENEMY_TURN → ENEMY_ANIMATING
 *     ↳ back to PLAYER_TURN  …or…  → COMBAT_END
 *
 * Consumed by CombatScene, which owns rendering and user input.
 * This module has no Phaser dependency.
 */

export const CombatState = {
    PLAYER_TURN:      'PLAYER_TURN',
    PLAYER_ANIMATING: 'PLAYER_ANIMATING',
    ENEMY_TURN:       'ENEMY_TURN',
    ENEMY_ANIMATING:  'ENEMY_ANIMATING',
    COMBAT_END:       'COMBAT_END',
};

export default class CombatSystem {
    /**
     * @param {{ hp: number, maxHp: number, attack?: number, defense?: number }} playerData
     * @param {{ name: string, hp: number, maxHp: number, attack: number,
     *           defense: number, xpReward: number, lootTable: Array }} enemyData
     */
    constructor(playerData, enemyData) {
        this.player = {
            hp:      playerData.hp,
            maxHp:   playerData.maxHp,
            attack:  playerData.attack  ?? 10,
            defense: playerData.defense ?? 5,
        };

        this.enemy = {
            name:      enemyData.name,
            hp:        enemyData.hp,
            maxHp:     enemyData.maxHp,
            attack:    enemyData.attack,
            defense:   enemyData.defense,
            xpReward:  enemyData.xpReward,
            lootTable: enemyData.lootTable || [],
        };

        this.state            = CombatState.PLAYER_TURN;
        this.playerDefending  = false;
        this.victory          = null;   // null = in progress, true = win, false = loss
        this.lastAction       = null;   // result of most recent action (for animations)
    }

    /* ── Queries ───────────────────────────────────────────────────── */

    getState()  { return this.state; }
    isOver()    { return this.state === CombatState.COMBAT_END; }

    /** Result object compatible with WorldScene's 'combat-end' listener. */
    getResult() {
        return {
            victory:   this.victory,
            playerHp:  this.player.hp,
            xpReward:  this.victory ? this.enemy.xpReward : 0,
            lootTable: this.victory ? this.enemy.lootTable : [],
        };
    }

    /* ── Damage formula ────────────────────────────────────────────── */

    /**
     * damage = max(1, attacker.attack − defender.effectiveDefense)
     *
     * If the defender is the player and playerDefending is true the
     * effective defense is doubled.
     */
    _calculateDamage(attacker, defender, isDefenderPlayer) {
        let effectiveDefense = defender.defense;
        if (isDefenderPlayer && this.playerDefending) {
            effectiveDefense *= 2;
        }
        return Math.max(1, attacker.attack - effectiveDefense);
    }

    /* ── Player actions (called during PLAYER_TURN) ────────────────── */

    /**
     * Player attacks the enemy.
     * PLAYER_TURN → PLAYER_ANIMATING
     */
    playerAttack() {
        if (this.state !== CombatState.PLAYER_TURN) return null;

        this.playerDefending = false;
        const damage = this._calculateDamage(this.player, this.enemy, false);
        this.enemy.hp = Math.max(0, this.enemy.hp - damage);

        this.lastAction = { type: 'attack', actor: 'player', damage, targetHp: this.enemy.hp };
        this.state = CombatState.PLAYER_ANIMATING;
        return this.lastAction;
    }

    /**
     * Player defends — doubles effective defense for the next enemy attack.
     * PLAYER_TURN → PLAYER_ANIMATING
     */
    playerDefend() {
        if (this.state !== CombatState.PLAYER_TURN) return null;

        this.playerDefending = true;

        this.lastAction = { type: 'defend', actor: 'player' };
        this.state = CombatState.PLAYER_ANIMATING;
        return this.lastAction;
    }

    /**
     * Player uses a consumable item (e.g. health potion).
     * @param {{ id: string, name: string, healAmount: number }} item
     * PLAYER_TURN → PLAYER_ANIMATING
     * Returns null if item is invalid or state is wrong.
     */
    playerUseItem(item) {
        if (this.state !== CombatState.PLAYER_TURN) return null;
        if (!item || !item.healAmount) return null;

        this.playerDefending = false;
        const before = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.healAmount);
        const healed = this.player.hp - before;

        this.lastAction = {
            type: 'use_item', actor: 'player',
            item: item.name, healed, targetHp: this.player.hp,
        };
        this.state = CombatState.PLAYER_ANIMATING;
        return this.lastAction;
    }

    /* ── Animation-complete callbacks ──────────────────────────────── */

    /**
     * CombatScene calls this when the player-action animation finishes.
     * PLAYER_ANIMATING → ENEMY_TURN  or  COMBAT_END (enemy defeated)
     */
    finishPlayerAnimation() {
        if (this.state !== CombatState.PLAYER_ANIMATING) return;

        if (this.enemy.hp <= 0) {
            this.victory = true;
            this.state = CombatState.COMBAT_END;
            return;
        }

        this.state = CombatState.ENEMY_TURN;
    }

    /**
     * Process the enemy's turn (simple AI: always attacks).
     * ENEMY_TURN → ENEMY_ANIMATING
     */
    processEnemyTurn() {
        if (this.state !== CombatState.ENEMY_TURN) return null;

        const damage = this._calculateDamage(this.enemy, this.player, true);
        this.player.hp = Math.max(0, this.player.hp - damage);

        this.lastAction = { type: 'attack', actor: 'enemy', damage, targetHp: this.player.hp };
        this.state = CombatState.ENEMY_ANIMATING;
        return this.lastAction;
    }

    /**
     * CombatScene calls this when the enemy-action animation finishes.
     * ENEMY_ANIMATING → PLAYER_TURN  or  COMBAT_END (player defeated)
     */
    finishEnemyAnimation() {
        if (this.state !== CombatState.ENEMY_ANIMATING) return;

        // Defend buff expires after the enemy's attack resolves.
        this.playerDefending = false;

        if (this.player.hp <= 0) {
            this.victory = false;
            this.state = CombatState.COMBAT_END;
            return;
        }

        this.state = CombatState.PLAYER_TURN;
    }
}
