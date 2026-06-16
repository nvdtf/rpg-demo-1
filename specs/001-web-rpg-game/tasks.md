# Tasks: Web-Based RPG Game

**Input**: Design documents from `specs/001-web-rpg-game/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/game-state.md, quickstart.md

**Tests**: Not requested — manual browser testing per plan.md. No automated test tasks generated.

**Organization**: Tasks grouped by user story (P1–P6) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — create directory structure and entry point files

- [x] T001 Create project directory structure: `css/`, `js/scenes/`, `js/entities/`, `js/systems/`, `js/data/`, `js/utils/`, `assets/sprites/`, `assets/tiles/`, `assets/maps/`, `assets/ui/`
- [x] T002 Create `index.html` loading Phaser 3 arcade-physics build from jsDelivr CDN (`phaser@3.87.0/dist/phaser-arcade-physics.min.js`) and `js/main.js` as ES module
- [x] T003 [P] Create `css/style.css` with minimal page and canvas styling (centered canvas, black background, no scroll)
- [x] T004 [P] Create `js/main.js` with Phaser game config (Arcade Physics, canvas dimensions, scene registration array for all scenes, pixelArt rendering mode)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core asset loading, menu system, and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create placeholder pixel-art tileset image at `assets/tiles/tileset.png` (16x16 tile grid with grass, path, water, wall, tree tile types) and player spritesheet at `assets/sprites/player.png` (16x16 frames, 4-direction walk cycle, 3 frames per direction)
- [x] T006 [P] Create `js/utils/helpers.js` with shared utilities (direction vectors, clamp function, tile-to-pixel and pixel-to-tile coordinate conversion)
- [x] T007 Create `js/scenes/BootScene.js` with Phaser preload for initial assets: tileset image, player spritesheet, and world map JSON — register player walk animations for all four directions
- [x] T008 Create `js/scenes/MenuScene.js` with main menu screen: "New Game" button (starts WorldScene), "Load Game" button (initially disabled/greyed), and "Controls" help overlay showing keybindings from contracts/game-state.md input table

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Explore a Game World (Priority: P1) 🎯 MVP

**Goal**: Player can move through a 2D tile-based world with camera follow and collision

**Independent Test**: Open game in browser → click "New Game" → verify map renders → move with arrow keys/WASD in all 4 directions → camera follows player → blocked tiles (water, walls) prevent movement

### Implementation for User Story 1

- [x] T009 [P] [US1] Create world tile map at `assets/maps/world.json` in Tiled JSON format with layers: "Ground" (grass, path, water tiles), "Walls" (trees, rocks with `collides: true` property), and "Objects" (spawn point) — minimum 50x50 tile map per spec assumptions
- [x] T010 [P] [US1] Create `js/data/maps.js` exporting map configuration (map key, tileset name, layer names, player spawn coordinates)
- [x] T011 [US1] Create `js/entities/Player.js` as a class wrapping a Phaser Arcade sprite: grid-aligned movement via keyboard input (arrow keys + WASD), walk animation playback by direction, collision body sized to one tile
- [x] T012 [US1] Create `js/scenes/WorldScene.js`: load tilemap from `world.json`, create tile layers, set wall collision by property, spawn Player entity at map spawn point, configure camera to follow player with world bounds, handle keyboard input for movement
- [x] T013 [US1] Create `js/scenes/UIScene.js` as parallel overlay scene (launched via `scene.launch`): render player health bar in corner using Phaser Graphics, listen for player state changes to update display
- [x] T014 [US1] Wire MenuScene "New Game" button to start WorldScene with `{ mode: "new_game" }` per contracts/game-state.md — verify full probe: page loads → menu appears → new game → world renders → player moves → camera follows → collision works

**Checkpoint**: User Story 1 (Probe) is fully functional — navigable tile world with movement and collision

---

## Phase 4: User Story 2 — Engage in Turn-Based Combat (Priority: P2)

**Goal**: Player encounters visible enemies on the map, enters FF/DQ-style side-view turn-based combat, and can win or lose

**Independent Test**: Walk into an enemy sprite on the map → combat scene opens with health bars and action menu → attack enemy until defeated → receive XP → return to world with enemy removed → OR let player die → Game Over screen appears

### Implementation for User Story 2

- [x] T015 [P] [US2] Create `js/data/enemies.js` exporting enemy stat tables (Slime, Goblin, Wolf, Skeleton) with fields per data-model.md: id, name, hp, maxHp, attack, defense, xpReward, lootTable, spriteKey
- [x] T016 [P] [US2] Create `js/data/items.js` exporting item catalog: weapons (Wooden Sword, Iron Sword, Steel Blade), armor (Leather Tunic, Chain Mail), and consumables (Health Potion, Greater Health Potion) with fields per data-model.md
- [x] T017 [P] [US2] Create placeholder enemy sprites in `assets/sprites/` (slime.png, goblin.png, wolf.png, skeleton.png) as spritesheets with idle and attack frames
- [x] T018 [US2] Create `js/entities/Enemy.js` as a class wrapping a Phaser Arcade sprite: placed at tile coordinates from enemy data, overlap detection with Player, `defeated` flag to hide after combat victory
- [x] T019 [US2] Add enemy spawning to `js/scenes/WorldScene.js`: instantiate Enemy entities from `enemies.js` data at map positions, register `physics.add.overlap` with Player to trigger combat transition
- [x] T020 [US2] Create `js/systems/CombatSystem.js` with 5-state FSM (PLAYER_TURN, PLAYER_ANIMATING, ENEMY_TURN, ENEMY_ANIMATING, COMBAT_END): damage formula `max(1, attacker.attack - defender.defense)`, defend action doubles effective defense, use-item action for consumables
- [x] T021 [US2] Create `js/scenes/CombatScene.js` with FF/DQ side-view layout: player sprite on left, enemy on right, health bars (Phaser Graphics), action menu (Attack / Defend / Item) navigable by keyboard (1/2/3 keys + click), turn loop driven by CombatSystem, victory/defeat outcomes per contracts/game-state.md
- [x] T022 [US2] Create `js/scenes/GameOverScene.js` showing "Game Over" text with "New Game" and "Load Save" buttons (load disabled if no save exists)
- [x] T023 [US2] Implement scene transitions in `js/scenes/WorldScene.js`: on enemy overlap → `scene.sleep('WorldScene')` + `scene.launch('CombatScene', { player, enemy })` per research.md R3; on combat victory → `scene.stop('CombatScene')` + `scene.wake('WorldScene', { combatResult })` → mark enemy defeated and remove sprite; on defeat → start GameOverScene

**Checkpoint**: User Stories 1 AND 2 work — player can explore and fight enemies with full combat loop

---

## Phase 5: User Story 3 — Level Up and Manage Character (Priority: P3)

**Goal**: Player earns XP from combat, levels up with stat increases, and can view character stats on a dedicated screen

**Independent Test**: Defeat enough enemies to reach 100 XP → level-up notification appears → stats increase per data-model.md progression table → press C → character screen shows updated level, stats, XP bar, equipped items

### Implementation for User Story 3

- [x] T024 [US3] Create `js/systems/LevelSystem.js`: XP threshold formula `floor(100 * level^1.5)` per data-model.md, stat growth (~15–20% per level matching the progression table), `addXp(player, amount)` method that returns level-up info, `getStatsForLevel(level)` lookup
- [x] T025 [US3] Integrate LevelSystem into combat victory flow in `js/scenes/WorldScene.js` wake handler: call `addXp()` with enemy's `xpReward`, display level-up notification text if level increased, apply new stats to Player entity
- [x] T026 [US3] Add character screen overlay to `js/scenes/UIScene.js` toggled by C key: display player name, level, HP/maxHP, attack, defense, XP progress bar toward next level, equipped weapon and armor names — close on C or Escape

**Checkpoint**: User Stories 1–3 work — full explore → fight → level up loop

---

## Phase 6: User Story 4 — Interact with NPCs and Receive Quests (Priority: P4)

**Goal**: NPCs appear on the map, display dialog on interaction, offer quests tracked in a quest log, and grant rewards on completion

**Independent Test**: Approach NPC → press Enter/Space → dialog appears → accept quest → complete objective (e.g., defeat 3 slimes) → return to NPC → quest marked complete → rewards granted → press Q → quest log shows status

### Implementation for User Story 4

- [x] T027 [P] [US4] Create `js/data/npcs.js` exporting NPC definitions per data-model.md: id, name, dialog lines, questId, spriteKey, x/y tile position — at least 3 NPCs (village elder, merchant, quest giver)
- [x] T028 [P] [US4] Create `js/data/quests.js` exporting quest definitions per data-model.md: id, title, description, objectiveType (defeat/find_item/talk_to_npc), targetId, targetCount, rewardXp, rewardGold, rewardItemId — at least 2 quests
- [x] T029 [P] [US4] Create NPC placeholder sprites in `assets/sprites/` (elder.png, merchant.png, questgiver.png) as spritesheets with idle frames
- [x] T030 [US4] Create `js/entities/NPC.js` as a class wrapping a Phaser Arcade sprite: placed at tile coordinates from NPC data, interaction trigger zone, `interact()` method to start dialog sequence
- [ ] T031 [US4] Create `js/systems/QuestSystem.js`: accept quest (add QuestEntry to player), update progress on relevant events (enemy defeated, item found, NPC talked to), detect completion, distribute rewards (XP, gold, item via InventorySystem or direct), query active/completed quests
- [ ] T032 [US4] Add dialog box UI to `js/scenes/UIScene.js`: semi-transparent text box at bottom of screen, sequential dialog line display with Enter/Space to advance, quest accept/decline prompt at end of quest-giving dialog
- [ ] T033 [US4] Add quest log overlay to `js/scenes/UIScene.js` toggled by Q key: list active and completed quests with name, description, objective progress (e.g., "2/3 Slimes defeated"), close on Q or Escape
- [ ] T034 [US4] Place NPCs on world map in `js/scenes/WorldScene.js`: instantiate NPC entities from `npcs.js` data, register interaction key (Enter/Space) proximity check, connect dialog → QuestSystem accept flow, load NPC sprites in BootScene.js

**Checkpoint**: User Stories 1–4 work — explore, fight, level up, talk to NPCs, complete quests

---

## Phase 7: User Story 5 — Manage Inventory and Equipment (Priority: P5)

**Goal**: Player collects items from combat and quests, views inventory, equips weapons/armor affecting stats, and uses consumables in and out of combat

**Independent Test**: Defeat enemy → loot notification → press I → item in inventory → equip weapon → check character screen (C) for stat change → enter combat → use health potion → HP restored and potion consumed

### Implementation for User Story 5

- [ ] T035 [US5] Create `js/systems/InventorySystem.js`: addItem (with 20-item capacity check and full-inventory notification), removeItem, equipWeapon, equipArmor, unequip, useConsumable (restore HP capped at maxHp), getInventory, getEquipped — item data from `js/data/items.js`
- [ ] T036 [US5] Add inventory screen overlay to `js/scenes/UIScene.js` toggled by I key: scrollable item list showing name/description/type, equip action for weapons/armor, use action for consumables, equipped items highlighted, close on I or Escape
- [ ] T037 [US5] Integrate loot drops on combat victory: in WorldScene wake handler, roll against enemy `lootTable` drop chances, call `InventorySystem.addItem()` for dropped items, display loot notification
- [ ] T038 [US5] Integrate consumable usage in `js/scenes/CombatScene.js`: "Item" action (key 3) opens consumable sub-list from player inventory, selecting an item calls `InventorySystem.useConsumable()`, updates HP display, consumes player turn
- [ ] T039 [US5] Update character screen in `js/scenes/UIScene.js` to show equipped weapon name + attackBonus and equipped armor name + defenseBonus, and display total effective attack/defense (base + equipment bonuses)

**Checkpoint**: User Stories 1–5 work — full gameplay loop with items and equipment

---

## Phase 8: User Story 6 — Save and Load Game Progress (Priority: P6)

**Goal**: Player can save all progress to localStorage and restore it in a future session

**Independent Test**: Progress in game → press Escape → select "Save Game" → confirmation shown → refresh browser → select "Load Game" → game restores exact state (position, stats, inventory, quests, defeated enemies)

### Implementation for User Story 6

- [ ] T040 [US6] Create `js/systems/SaveSystem.js`: `save()` serializes full state (version, timestamp, player, questLog, defeatedEnemies) per contracts/game-state.md schema → `localStorage.setItem('rpg_save_v1', JSON.stringify(data))`; `load()` reads and parses with version check; `hasSave()` checks for existing save
- [ ] T041 [US6] Add pause menu overlay to `js/scenes/WorldScene.js` triggered by Escape key: "Save Game", "Load Game", "Resume" buttons — pause game loop while menu is open
- [ ] T042 [US6] Implement save flow: "Save Game" button → gather Player state + InventorySystem contents + QuestSystem log + defeated enemy IDs → `SaveSystem.save()` → display confirmation text
- [ ] T043 [US6] Implement load flow: MenuScene "Load Game" → `SaveSystem.load()` → start WorldScene with `{ mode: "load_game", saveData }` → restore player position, stats, inventory, equipment, quest progress, and mark defeated enemies as hidden
- [ ] T044 [US6] Enable "Load Game" button in `js/scenes/MenuScene.js` when `SaveSystem.hasSave()` returns true; add "Load Save" option in `js/scenes/GameOverScene.js` that loads last save via SaveSystem

**Checkpoint**: All 6 user stories complete — full RPG gameplay loop with persistence

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Visual polish, edge cases, and end-to-end validation

- [ ] T045 [P] Add scene transition effects between WorldScene and CombatScene per FR-017: fade-out/fade-in or screen wipe using Phaser camera effects in `js/scenes/WorldScene.js` and `js/scenes/CombatScene.js`
- [ ] T046 [P] Polish player walking animations in `js/scenes/WorldScene.js`: ensure smooth tile-to-tile tweened movement, correct directional sprite facing, idle frame on stop
- [ ] T047 Implement edge cases per spec: map boundary prevention (player cannot move beyond map edges), full inventory notification (reject item with message when at 20 items), rapid input debounce (one movement per keypress, discard queued inputs), mid-combat close recovery (load returns to last save point, not mid-combat) in `js/scenes/WorldScene.js`, `js/systems/InventorySystem.js`, and `js/systems/SaveSystem.js`
- [ ] T048 Run `specs/001-web-rpg-game/quickstart.md` validation scenarios 1–9 end-to-end in browser and fix any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational phase completion
  - Must be implemented sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6) due to cumulative gameplay dependencies
  - US2 (Combat) builds on US1 (World) — enemies exist on the same map
  - US3 (Level Up) builds on US2 (Combat) — XP comes from combat victories
  - US4 (Quests) builds on US1+US2 — quest objectives include combat and exploration
  - US5 (Inventory) builds on US2 (Combat) — loot comes from combat
  - US6 (Save/Load) serializes state from all prior stories
- **Polish (Phase 9)**: Depends on all user stories being complete

### Within Each User Story

- Data files and assets ([P] tasks) can be created in parallel
- Entity classes before scene integration
- System classes before scene usage
- Scene wiring and integration last

### Parallel Opportunities

- All [P] tasks within a phase can run in parallel
- T003 + T004 (style + main.js) in Phase 1
- T005 + T006 (assets + helpers) in Phase 2
- T009 + T010 (map + map config) in Phase 3
- T015 + T016 + T017 (enemy data + item data + enemy sprites) in Phase 4
- T027 + T028 + T029 (NPC data + quest data + NPC sprites) in Phase 6
- T045 + T046 (transition effects + animation polish) in Phase 9

---

## Parallel Example: User Story 2

```
# Launch data + asset tasks together (no dependencies between them):
T015: Create js/data/enemies.js with enemy stat tables
T016: Create js/data/items.js with item catalog
T017: Create placeholder enemy sprites in assets/sprites/

# Then sequentially:
T018: Create js/entities/Enemy.js (needs T015 for enemy data)
T019: Add enemy spawning to WorldScene (needs T018)
T020: Create js/systems/CombatSystem.js (needs T015, T016)
T021: Create js/scenes/CombatScene.js (needs T020)
T022: Create js/scenes/GameOverScene.js (independent)
T023: Implement scene transitions (needs T019, T021, T022)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Deployable Probe)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Explore World)
4. **STOP and VALIDATE**: Open in browser, test movement and collision
5. Deploy to GitHub Pages as probe (Constitution Principle III)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Explore World) → Validate → Deploy (MVP Probe!)
3. US2 (Combat) → Validate → Deploy (core gameplay)
4. US3 (Level Up) → Validate → Deploy (progression)
5. US4 (Quests) → Validate → Deploy (content)
6. US5 (Inventory) → Validate → Deploy (depth)
7. US6 (Save/Load) → Validate → Deploy (persistence)
8. Polish → Final validation → Release

---

## Notes

- [P] tasks = different files, no dependencies on other in-progress tasks
- [Story] label maps task to specific user story for traceability
- Each user story checkpoint should be independently verifiable in browser
- Commit after each task or logical group
- No automated tests — validate manually per quickstart.md scenarios
- All JS uses ES modules (`type="module"`); Phaser accessed as global `Phaser` object
- Constitution Principle IV: No build step, no bundler, no backend — static files only
