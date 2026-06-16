/**
 * Item catalog.
 * Schema per data-model.md: id, name, type, description,
 * attackBonus, defenseBonus, healAmount, quantity.
 *
 * Equipment items (weapon, armor) do not stack (quantity always 1).
 * Consumables stack and have quantity >= 1.
 */

const ITEMS = {
  wooden_sword: {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    type: 'weapon',
    description: 'A simple sword carved from sturdy oak. Better than bare fists.',
    attackBonus: 3,
    defenseBonus: 0,
    healAmount: 0,
    quantity: 1
  },

  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'weapon',
    description: 'A forged iron blade with a keen edge.',
    attackBonus: 7,
    defenseBonus: 0,
    healAmount: 0,
    quantity: 1
  },

  steel_blade: {
    id: 'steel_blade',
    name: 'Steel Blade',
    type: 'weapon',
    description: 'A finely crafted steel sword that cuts through armor.',
    attackBonus: 12,
    defenseBonus: 0,
    healAmount: 0,
    quantity: 1
  },

  leather_tunic: {
    id: 'leather_tunic',
    name: 'Leather Tunic',
    type: 'armor',
    description: 'A tough leather tunic offering basic protection.',
    attackBonus: 0,
    defenseBonus: 2,
    healAmount: 0,
    quantity: 1
  },

  chain_mail: {
    id: 'chain_mail',
    name: 'Chain Mail',
    type: 'armor',
    description: 'Interlocking metal rings that absorb heavy blows.',
    attackBonus: 0,
    defenseBonus: 5,
    healAmount: 0,
    quantity: 1
  },

  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    type: 'consumable',
    description: 'A small red vial that restores a modest amount of health.',
    attackBonus: 0,
    defenseBonus: 0,
    healAmount: 25,
    quantity: 1
  },

  greater_health_potion: {
    id: 'greater_health_potion',
    name: 'Greater Health Potion',
    type: 'consumable',
    description: 'A large red flask brimming with restorative energy.',
    attackBonus: 0,
    defenseBonus: 0,
    healAmount: 60,
    quantity: 1
  }
};

export default ITEMS;
