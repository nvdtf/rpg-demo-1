# Data Model: Web-Based RPG Game

**Spec**: `specs/001-web-rpg-game/spec.md` | **Date**: 2026-06-15

## Entities

### Player

| Field | Type | Description |
|-------|------|-------------|
| name | string | Character name |
| level | integer | Current level (starts at 1) |
| xp | integer | Current experience points |
| xpToNext | integer | XP threshold for next level |
| hp | integer | Current health points |
| maxHp | integer | Maximum health points |
| attack | integer | Base attack stat |
| defense | integer | Base defense stat |
| x | integer | Tile X position on map |
| y | integer | Tile Y position on map |
| equippedWeapon | Item \| null | Currently equipped weapon |
| equippedArmor | Item \| null | Currently equipped armor |
| inventory | Item[] | Inventory contents (max 20 items) |
| questLog | QuestEntry[] | Active and completed quests |
| gold | integer | Currency |

**Validation**:
- `hp` must be in range `[0, maxHp]`
- `inventory.length` must be `<= 20`
- `level` must be `>= 1`
- `xp` must be `>= 0`

**State transitions**:
- `EXPLORING` → `IN_COMBAT` (on enemy contact)
- `IN_COMBAT` → `EXPLORING` (on enemy defeat)
- `IN_COMBAT` → `GAME_OVER` (on player death)
- `GAME_OVER` → `EXPLORING` (on load save or new game)

---

### Enemy

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Display name (e.g., "Slime", "Goblin") |
| hp | integer | Current health points |
| maxHp | integer | Maximum health points |
| attack | integer | Attack stat |
| defense | integer | Defense stat |
| xpReward | integer | XP granted on defeat |
| lootTable | LootDrop[] | Possible item drops with probabilities |
| spriteKey | string | Sprite sheet key for rendering |
| x | integer | Tile X position on map (world placement) |
| y | integer | Tile Y position on map (world placement) |
| defeated | boolean | Whether this enemy has been defeated (prevents respawn in session) |

**Validation**:
- `hp` must be in range `[0, maxHp]`
- `xpReward` must be `> 0`

---

### Item

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Display name |
| type | enum | `"weapon"` \| `"armor"` \| `"consumable"` |
| description | string | Flavor text |
| attackBonus | integer | Attack modifier (weapons only, default 0) |
| defenseBonus | integer | Defense modifier (armor only, default 0) |
| healAmount | integer | HP restored (consumables only, default 0) |
| quantity | integer | Stack count (consumables only, default 1) |

**Validation**:
- `type === "weapon"` → `attackBonus > 0`
- `type === "armor"` → `defenseBonus > 0`
- `type === "consumable"` → `healAmount > 0`, `quantity >= 1`
- Equipment items (`weapon`, `armor`) do not stack (`quantity` always 1)

---

### NPC

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Display name |
| dialog | string[] | Lines of dialog displayed sequentially |
| questId | string \| null | ID of quest this NPC offers (null if non-quest NPC) |
| spriteKey | string | Sprite sheet key |
| x | integer | Tile X position on map |
| y | integer | Tile Y position on map |

---

### Quest

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Quest name |
| description | string | Objective description |
| objectiveType | enum | `"defeat"` \| `"find_item"` \| `"talk_to_npc"` |
| targetId | string | ID of target enemy type, item, or NPC |
| targetCount | integer | Number required (e.g., defeat 3 slimes) |
| rewardXp | integer | XP reward |
| rewardGold | integer | Gold reward |
| rewardItemId | string \| null | Item reward ID (null if none) |

---

### QuestEntry (player's quest log)

| Field | Type | Description |
|-------|------|-------------|
| questId | string | Reference to Quest definition |
| progress | integer | Current count toward objective |
| status | enum | `"active"` \| `"completed"` |

---

### LootDrop

| Field | Type | Description |
|-------|------|-------------|
| itemId | string | Reference to Item definition |
| chance | float | Drop probability (0.0 – 1.0) |

---

### TileMap

| Field | Type | Description |
|-------|------|-------------|
| width | integer | Map width in tiles |
| height | integer | Map height in tiles |
| tileSize | integer | Pixel size per tile (deferred — D7) |
| layers | TileLayer[] | Ordered render layers |

---

### TileLayer

| Field | Type | Description |
|-------|------|-------------|
| name | string | Layer name (e.g., "ground", "collision", "objects") |
| data | integer[][] | 2D grid of tile indices |

---

### SaveFile

| Field | Type | Description |
|-------|------|-------------|
| version | integer | Save format version (for future migration) |
| timestamp | string | ISO 8601 timestamp of save |
| player | Player | Full player state |
| defeatedEnemies | string[] | IDs of enemies defeated in this playthrough |
| questLog | QuestEntry[] | Quest progress |

**Storage key**: `"rpg_save_v1"` in `localStorage`

## Relationships

```
Player 1──* QuestEntry *──1 Quest
Player 1──* Item
Player 1──1 TileMap (position within)
Enemy *──* LootDrop *──1 Item
NPC 0..1──1 Quest
TileMap 1──* TileLayer
SaveFile 1──1 Player
SaveFile 1──* QuestEntry
```

## Level Progression Curve

| Level | XP to Next | Max HP | Attack | Defense |
|-------|-----------|--------|--------|---------|
| 1 | 100 | 50 | 10 | 5 |
| 2 | 200 | 60 | 12 | 6 |
| 3 | 350 | 72 | 15 | 8 |
| 4 | 550 | 86 | 18 | 10 |
| 5 | 800 | 102 | 22 | 13 |
| 6 | 1100 | 120 | 26 | 16 |
| 7 | 1500 | 140 | 31 | 19 |
| 8 | 2000 | 162 | 36 | 23 |
| 9 | 2600 | 186 | 42 | 27 |
| 10 | — | 212 | 48 | 32 |

**Formula**: `xpToNext = floor(100 * level^1.5)`, stats grow ~15–20% per level.

## Combat Formulas

- **Attack damage**: `max(1, attacker.attack + weapon.attackBonus - defender.defense - armor.defenseBonus)`
- **Defend action**: Doubles the defender's effective defense for the current turn (enemy attack is calculated against `defense * 2`)
- **Health potion**: Restores `healAmount` HP, capped at `maxHp`
