# Quickstart Validation Guide: Web-Based RPG Game

**Spec**: `specs/001-web-rpg-game/spec.md` | **Date**: 2026-06-15

## Prerequisites

- A modern desktop browser (Chrome, Firefox, Safari, or Edge)
- The repository cloned locally, OR the game deployed to GitHub Pages
- No installation, build step, or server required

## Running Locally

**Option A — Local file server** (recommended):

```bash
# From the repository root
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

> A local server is needed because ES modules cannot load over `file://` in most browsers.

**Option B — GitHub Pages**:

Push to the deployment branch and open the GitHub Pages URL.

## Validation Scenarios

### Scenario 1: Game Loads and World Renders (SC-001, FR-001, FR-002, FR-004)

1. Open the game URL
2. **Expected**: Main menu appears with "New Game," "Load Game" (grayed if no save), and "Controls"
3. Click "New Game"
4. **Expected**: The tile-based game world renders within 3 seconds. The player character sprite is visible on screen, centered on the map.

### Scenario 2: Player Movement and Collision (FR-002, FR-003, FR-004)

1. Press arrow keys or WASD
2. **Expected**: Player character moves one tile per keypress with smooth transition animation
3. Move toward a water or wall tile
4. **Expected**: Character stops — no movement onto blocked tiles
5. Move toward the edge of the visible area
6. **Expected**: Camera scrolls to keep the player centered

### Scenario 3: Combat Encounter (FR-005, FR-006, FR-007, FR-017, FR-018)

1. Move the player toward a visible enemy sprite on the map
2. **Expected**: Contact triggers transition to combat scene — full-screen side-view (FF/DQ style)
3. **Expected**: Player and enemy displayed with health bars, action menu visible (Attack / Defend / Item)
4. Select "Attack"
5. **Expected**: Enemy takes damage (`max(1, player.attack - enemy.defense)`), turn passes to enemy
6. Select "Defend" on next turn
7. **Expected**: Player's effective defense doubles for the incoming enemy attack
8. Repeat attacks until enemy HP reaches 0
9. **Expected**: Victory message, XP awarded, possible loot drop, return to world map
10. **Expected**: Defeated enemy sprite is gone from the world map

### Scenario 4: Level Up (FR-008, FR-009)

1. Defeat enemies until XP threshold is reached (100 XP for level 2)
2. **Expected**: Level-up notification displayed, stats increase per the progression table (see `data-model.md`)
3. Press C to open character screen
4. **Expected**: Updated level, stats, XP bar, and equipped items displayed

### Scenario 5: NPC Interaction and Quests (FR-010, FR-011)

1. Approach an NPC and press Enter or Space
2. **Expected**: Dialog box appears with NPC text
3. If NPC offers a quest, accept it
4. **Expected**: Quest appears in quest log (press Q)
5. Complete the quest objective (e.g., defeat required enemies)
6. Return to the NPC and interact
7. **Expected**: Quest marked complete, rewards granted (XP, gold, or item)

### Scenario 6: Inventory and Equipment (FR-012)

1. Collect an item from a defeated enemy or quest reward
2. Press I to open inventory
3. **Expected**: Item visible in inventory list with name and description
4. Select an equippable item (weapon or armor) and equip it
5. **Expected**: Character stats update — visible in character screen (C)
6. Enter combat and attack
7. **Expected**: Damage reflects the equipped weapon bonus

### Scenario 7: Save and Load (FR-013, SC-003)

1. Progress through the game (move, fight, level up, accept a quest)
2. Press Escape, select "Save Game"
3. **Expected**: Confirmation message — state persisted to localStorage
4. Refresh the browser (or close and reopen)
5. From main menu, select "Load Game"
6. **Expected**: Game restores to exact saved state — position, stats, inventory, quest progress

### Scenario 8: Game Over (FR-015)

1. Enter combat and let the enemy reduce player HP to 0
2. **Expected**: Game Over screen displayed with "Load Save" and "New Game" options
3. Select "Load Save" (if save exists)
4. **Expected**: Game restores from saved state

### Scenario 9: Edge Cases

1. **Map boundary**: Walk to the edge of the map — character cannot move beyond
2. **Full inventory**: Collect 20 items, defeat another enemy with loot — notification that inventory is full
3. **Rapid input**: Press multiple keys quickly — only one movement processed at a time, no stacking
4. **No save exists**: Select "Load Game" on fresh browser — informed no save available
5. **Browser close mid-combat**: Reopen game, load save — returns to last save point (not mid-combat)

## Probe Scope (Constitution Principle III)

The first deployable probe covers **Scenario 1 + Scenario 2 only** (P1 — World Exploration):

- `index.html` loads Phaser 3 via CDN
- A small test tile map renders (e.g., 20x15 visible tiles)
- Player sprite moves with arrow keys / WASD
- Camera follows player
- Collision with blocked tiles works
- No combat, no NPCs, no menus — just a navigable world

This is the minimum verifiable slice that proves the stack works end-to-end.
