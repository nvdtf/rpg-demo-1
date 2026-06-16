/**
 * Enemy stat tables.
 * Schema per data-model.md: id, name, hp, maxHp, attack, defense,
 * xpReward, lootTable (LootDrop[]), spriteKey.
 *
 * Note: x, y, and defeated are instance-level fields set when enemies
 * are placed on the map — they are not part of the template data here.
 */

const ENEMIES = {
  slime: {
    id: 'slime',
    name: 'Slime',
    hp: 20,
    maxHp: 20,
    attack: 4,
    defense: 1,
    xpReward: 15,
    lootTable: [
      { itemId: 'health_potion', chance: 0.4 }
    ],
    spriteKey: 'enemy_slime'
  },

  goblin: {
    id: 'goblin',
    name: 'Goblin',
    hp: 35,
    maxHp: 35,
    attack: 8,
    defense: 3,
    xpReward: 30,
    lootTable: [
      { itemId: 'health_potion', chance: 0.3 },
      { itemId: 'short_sword', chance: 0.15 }
    ],
    spriteKey: 'enemy_goblin'
  },

  wolf: {
    id: 'wolf',
    name: 'Wolf',
    hp: 28,
    maxHp: 28,
    attack: 10,
    defense: 2,
    xpReward: 25,
    lootTable: [
      { itemId: 'health_potion', chance: 0.25 }
    ],
    spriteKey: 'enemy_wolf'
  },

  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    hp: 45,
    maxHp: 45,
    attack: 12,
    defense: 6,
    xpReward: 50,
    lootTable: [
      { itemId: 'health_potion', chance: 0.35 },
      { itemId: 'iron_sword', chance: 0.1 },
      { itemId: 'leather_armor', chance: 0.1 }
    ],
    spriteKey: 'enemy_skeleton'
  }
};

export default ENEMIES;
