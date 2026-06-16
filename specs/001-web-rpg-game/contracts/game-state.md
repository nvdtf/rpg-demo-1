# Contract: Game State & Save/Load

**Spec**: `specs/001-web-rpg-game/spec.md` | **Date**: 2026-06-15

This document defines the public interfaces the game exposes: the localStorage save format (the only persistent external interface) and the inter-scene data contracts used internally.

## 1. Save File Contract (localStorage)

**Storage key**: `"rpg_save_v1"`

**Format**: JSON string stored via `localStorage.setItem()` / retrieved via `localStorage.getItem()`

### Schema

```json
{
  "version": 1,
  "timestamp": "2026-06-15T10:30:00.000Z",
  "player": {
    "name": "Hero",
    "level": 3,
    "xp": 280,
    "xpToNext": 350,
    "hp": 55,
    "maxHp": 72,
    "attack": 15,
    "defense": 8,
    "x": 12,
    "y": 24,
    "gold": 150,
    "equippedWeapon": { "id": "iron_sword", "name": "Iron Sword", "type": "weapon", "attackBonus": 5, "defenseBonus": 0, "healAmount": 0, "quantity": 1, "description": "A sturdy iron blade." },
    "equippedArmor": null,
    "inventory": [
      { "id": "health_potion", "name": "Health Potion", "type": "consumable", "attackBonus": 0, "defenseBonus": 0, "healAmount": 20, "quantity": 3, "description": "Restores 20 HP." }
    ]
  },
  "questLog": [
    { "questId": "defeat_slimes", "progress": 2, "status": "active" }
  ],
  "defeatedEnemies": ["slime_01", "goblin_03"]
}
```

### Rules

- **Save**: Serialize current game state to JSON, write to `localStorage` under key `rpg_save_v1`. Show confirmation message on success.
- **Load**: Read from `localStorage`, parse JSON, validate `version` field. If version matches, restore all state. If key is missing, inform player no save exists.
- **Version migration**: If `version` does not match current expected version, the save is treated as incompatible and the player is informed.
- **Size**: Typical save data is < 10 KB, well within the 5 MB localStorage limit.

## 2. Scene Transition Contracts

### WorldScene → CombatScene

When the player contacts an enemy sprite, WorldScene launches CombatScene with this data payload:

```javascript
this.scene.start('CombatScene', {
  player: {
    name: String,
    level: Number,
    hp: Number,
    maxHp: Number,
    attack: Number,       // base + weapon bonus
    defense: Number,      // base + armor bonus
    inventory: Item[]     // filtered to consumables only
  },
  enemy: {
    id: String,
    name: String,
    hp: Number,
    maxHp: Number,
    attack: Number,
    defense: Number,
    xpReward: Number,
    lootTable: LootDrop[]
  }
});
```

### CombatScene → WorldScene

On combat end, CombatScene returns control to WorldScene with a result:

```javascript
this.scene.start('WorldScene', {
  combatResult: {
    outcome: "victory" | "defeat",
    playerHp: Number,            // remaining HP after combat
    xpGained: Number,            // 0 if defeat
    lootGained: Item[],          // items dropped (empty if defeat)
    enemyId: String,             // ID of defeated enemy (to mark as defeated)
    consumablesUsed: { id: String, quantityUsed: Number }[]
  }
});
```

### MenuScene → WorldScene

```javascript
this.scene.start('WorldScene', {
  mode: "new_game" | "load_game"
});
```

## 3. Input Contracts

### Exploration Controls

| Key | Action |
|-----|--------|
| Arrow Up / W | Move player up one tile |
| Arrow Down / S | Move player down one tile |
| Arrow Left / A | Move player left one tile |
| Arrow Right / D | Move player right one tile |
| Enter / Space | Interact with NPC / advance dialog |
| I | Open inventory screen |
| C | Open character screen |
| Q | Open quest log |
| Escape | Open pause menu (Save/Load/Quit) |

### Combat Controls

| Key / Click | Action |
|-------------|--------|
| 1 / Click "Attack" | Select Attack action |
| 2 / Click "Defend" | Select Defend action |
| 3 / Click "Item" | Open item submenu |
| Click item in list | Use selected consumable |
