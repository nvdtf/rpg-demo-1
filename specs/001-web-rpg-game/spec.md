# Feature Specification: Web-Based RPG Game

**Feature Branch**: `001-web-rpg-game`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "build a web based rpg game"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore a Game World (Priority: P1)

A player opens the game in their browser and is placed in a 2D tile-based game world. They can move their character using keyboard controls (arrow keys or WASD) to explore the map, which contains terrain features such as grass, trees, water, and paths. The camera follows the player character as they move through the world.

**Why this priority**: World exploration is the foundational mechanic that all other RPG features build upon. Without a navigable world, no other gameplay is possible.

**Independent Test**: Can be fully tested by opening the game in a browser, verifying the map renders, and confirming the player character moves smoothly in all four directions with the camera following.

**Acceptance Scenarios**:

1. **Given** the player loads the game for the first time, **When** the page finishes loading, **Then** the game world is displayed with the player character visible on screen.
2. **Given** the player is in the game world, **When** they press an arrow key or WASD key, **Then** the character moves one tile in the corresponding direction with a smooth visual transition.
3. **Given** the player moves toward the edge of the visible area, **When** more map exists beyond the screen, **Then** the camera scrolls to keep the player centered.
4. **Given** the player moves toward a blocked tile (water, wall, dense trees), **When** they press the key in that direction, **Then** the character does not move and remains in place.

---

### User Story 2 - Engage in Turn-Based Combat (Priority: P2)

While exploring the world, the player encounters enemies. When the player makes contact with or approaches an enemy, combat begins. Combat is turn-based: the player and enemy take alternating turns choosing actions (attack, defend, use item). Combat ends when either the player or the enemy's health reaches zero. Defeated enemies yield experience points.

**Why this priority**: Combat is the core gameplay loop that gives exploration purpose and drives character progression. It is the primary source of challenge and reward.

**Independent Test**: Can be tested by triggering an encounter with an enemy, executing a sequence of attacks, and verifying damage calculation, turn order, and victory/defeat outcomes.

**Acceptance Scenarios**:

1. **Given** the player is exploring the world, **When** they make contact with an enemy sprite, **Then** the game transitions to a combat screen showing the player and enemy with health bars.
2. **Given** the player is in combat and it is their turn, **When** they select "Attack," **Then** the enemy takes damage based on the player's stats, and the turn passes to the enemy.
3. **Given** the player is in combat and it is their turn, **When** they select "Defend," **Then** the player takes reduced damage on the enemy's next attack.
4. **Given** the enemy's health reaches zero, **When** combat ends, **Then** the player receives experience points and returns to the exploration map.
5. **Given** the player's health reaches zero, **When** combat ends, **Then** the player sees a "Game Over" screen with an option to restart from their last save or the beginning.

---

### User Story 3 - Level Up and Manage Character (Priority: P3)

As the player defeats enemies and earns experience points, they progress through levels. Each level-up increases character stats (health, attack, defense) and may unlock new abilities. The player can open a character screen to view their current stats, level, experience progress, and equipped items.

**Why this priority**: Character progression provides long-term motivation and a sense of growth. It transforms individual combats into a meaningful arc.

**Independent Test**: Can be tested by accumulating enough experience to trigger a level-up, verifying stat increases are applied, and checking the character screen displays accurate information.

**Acceptance Scenarios**:

1. **Given** the player has earned enough experience points to level up, **When** the experience threshold is crossed, **Then** a level-up notification is displayed and the character's stats increase.
2. **Given** the player presses the character menu key, **When** the menu opens, **Then** the current level, stats, experience bar, and equipped items are displayed.
3. **Given** the player has leveled up, **When** they enter the next combat, **Then** their improved stats are reflected in damage dealt and damage received.

---

### User Story 4 - Interact with NPCs and Receive Quests (Priority: P4)

The game world contains non-player characters (NPCs) that the player can interact with. NPCs display dialog when approached and may offer quests (e.g., "Defeat 3 slimes," "Find the lost amulet"). Active quests are tracked in a quest log accessible from the menu. Completing a quest grants rewards such as experience, items, or gold.

**Why this priority**: Quests give structure and narrative purpose to exploration and combat. They transform a sandbox into a guided experience with goals.

**Independent Test**: Can be tested by approaching an NPC, reading dialog, accepting a quest, completing its objective, and returning to the NPC to claim the reward.

**Acceptance Scenarios**:

1. **Given** the player approaches an NPC, **When** they press the interaction key, **Then** a dialog box appears with the NPC's text.
2. **Given** an NPC offers a quest, **When** the player accepts, **Then** the quest appears in the quest log with its objective and status.
3. **Given** the player has completed a quest objective, **When** they return to the quest-giving NPC and interact, **Then** the quest is marked complete and rewards are granted.
4. **Given** the player opens the quest log, **When** active quests exist, **Then** each quest shows its name, description, current progress, and objective.

---

### User Story 5 - Manage Inventory and Equipment (Priority: P5)

The player can collect items from defeated enemies, quest rewards, and objects found in the world. An inventory screen allows viewing, using, and equipping items. Equipping a weapon or armor changes the character's combat stats. Consumable items (health potions) can be used in or out of combat.

**Why this priority**: Inventory management adds tactical depth to combat and rewards exploration with tangible loot.

**Independent Test**: Can be tested by collecting an item, opening the inventory, equipping it, and verifying the stat change is reflected in the character screen and combat.

**Acceptance Scenarios**:

1. **Given** the player defeats an enemy that drops loot, **When** combat ends, **Then** the item is added to the player's inventory with a notification.
2. **Given** the player opens the inventory screen, **When** they select an equippable item, **Then** they can equip it and see their stats update accordingly.
3. **Given** the player is in combat, **When** they choose to use a health potion on their turn, **Then** the player's health is restored by the potion's value and the potion is consumed.

---

### User Story 6 - Save and Load Game Progress (Priority: P6)

The player can save their current game progress and load it in a future session. Saved data includes character stats, inventory, quest progress, and position in the world. The game uses local browser storage so no account or server is required.

**Why this priority**: Persistence is essential for an RPG to be playable across sessions. Without it, all progress is lost on page refresh.

**Independent Test**: Can be tested by progressing in the game, saving, refreshing the browser, loading the save, and verifying the character is at the same position with the same stats and inventory.

**Acceptance Scenarios**:

1. **Given** the player selects "Save Game" from the menu, **When** the save completes, **Then** a confirmation message is shown and game state is persisted to browser storage.
2. **Given** the player opens the game and a save file exists, **When** they select "Load Game," **Then** the game restores to the exact state when saved (position, stats, inventory, quests).
3. **Given** no save file exists, **When** the player selects "Load Game," **Then** they are informed that no saved game is available.

---

### Edge Cases

- What happens when the player tries to move off the edge of the map? The character is prevented from moving beyond map boundaries.
- How does the system handle the inventory when it is full? The player is notified that their inventory is full and must discard or use an item before picking up new ones. Inventory capacity is 20 items.
- What happens if the player closes the browser mid-combat? The combat state is not saved; on next load the player returns to their last save point.
- What happens when the player tries to use an item they don't have? The action is disabled or grayed out; no invalid action can be submitted.
- How does the game handle multiple rapid key presses? Input is processed one action at a time; queued inputs beyond the current action are discarded to prevent unintended movement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a 2D tile-based game world that the player can navigate using keyboard input. — *Provenance: User request @ 100%*
- **FR-002**: System MUST display a player character sprite that moves smoothly between tiles in response to arrow key or WASD input. — *Provenance: User request @ 60%, reasonable default @ 40%*
- **FR-003**: System MUST implement tile-based collision detection to prevent the player from walking through solid objects (walls, water, dense obstacles). — *Provenance: Reasonable default @ 100%*
- **FR-004**: System MUST provide a camera that follows the player character and scrolls the visible map area. — *Provenance: Reasonable default @ 100%*
- **FR-005**: System MUST support turn-based combat encounters triggered by contact with enemy sprites in the world. — *Provenance: User request @ 100%*
- **FR-006**: System MUST provide combat actions: Attack, Defend, and Use Item, each with distinct effects on combat state. — *Provenance: Reasonable default @ 100%*
- **FR-007**: System MUST calculate combat damage using character and enemy stats (attack, defense), with visible health bars for both combatants. — *Provenance: Reasonable default @ 100%*
- **FR-008**: System MUST award experience points upon defeating enemies and trigger level-ups with stat increases when thresholds are met. — *Provenance: User request @ 60%, reasonable default @ 40%*
- **FR-009**: System MUST provide a character screen showing current level, stats, experience progress, and equipped items. — *Provenance: Reasonable default @ 100%*
- **FR-010**: System MUST support NPC interaction via a dialog system activated by an interaction key (Enter or Space). — *Provenance: Reasonable default @ 100%*
- **FR-011**: System MUST support a quest system with trackable objectives, a quest log, and reward distribution on completion. — *Provenance: Reasonable default @ 100%*
- **FR-012**: System MUST provide an inventory system with a capacity of 20 items, supporting equippable gear and consumable items. — *Provenance: Reasonable default @ 100%*
- **FR-013**: System MUST persist game state (position, stats, inventory, quest progress) to browser local storage for save/load functionality. — *Provenance: Reasonable default @ 100%*
- **FR-014**: System MUST display a main menu with options for New Game, Load Game (if save exists), and Controls/Help. — *Provenance: Reasonable default @ 100%*
- **FR-015**: System MUST display a Game Over screen when the player's health reaches zero, with options to load a saved game or start over. — *Provenance: Reasonable default @ 100%*

### Key Entities

- **Player Character**: Represents the player in the game world. Attributes include name, level, experience points, health, attack power, defense, position on map, and current equipment slots (weapon, armor).
- **Enemy**: A hostile entity on the map that triggers combat. Attributes include name, health, attack, defense, experience reward, and possible loot drops.
- **Item**: An object the player can collect and use. Categories: equipment (weapons, armor that modify stats) and consumables (potions that restore health). Attributes include name, type, stat modifiers, and quantity.
- **NPC**: A non-hostile character in the world that provides dialog and quests. Attributes include name, dialog lines, and associated quests.
- **Quest**: A task the player can accept and complete for rewards. Attributes include title, description, objective type (defeat enemies, find item, talk to NPC), progress counter, completion status, and rewards.
- **Tile Map**: The game world represented as a grid of tiles. Each tile has a type (grass, water, wall, path, etc.) and a traversability flag.
- **Save File**: A snapshot of all player progress stored in browser storage. Includes character state, inventory contents, quest log, and world position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can begin exploring the game world within 3 seconds of opening the game in a browser (no installation, no sign-up).
- **SC-002**: Players can complete a full gameplay loop (explore, fight an enemy, gain experience, level up) within 10 minutes of starting.
- **SC-003**: Players can save their game and successfully resume from the exact same state in a new browser session.
- **SC-004**: 90% of first-time players can navigate the world and engage in combat without reading external instructions (controls are intuitive or explained in-game).
- **SC-005**: The game world contains at least one complete quest line that can be accepted, progressed, and completed with visible rewards.
- **SC-006**: Players can manage at least 3 different equipment items and observe stat changes reflected in combat performance.
- **SC-007**: The game runs smoothly (no visible stutter or lag) on standard consumer hardware in modern browsers.

## Assumptions

- The target audience is casual gamers and RPG enthusiasts playing on desktop browsers with keyboard input. Mobile/touch support is out of scope for this version.
- The game is a single-player experience; multiplayer functionality is out of scope.
- The game world is a single contiguous map of moderate size (roughly 50x50 to 100x100 tiles) with hand-designed layout, not procedurally generated.
- Art assets will use a simple pixel-art style that can be created or sourced as free/open-source sprites.
- Audio and music are out of scope for this version; the game is playable without sound.
- The game does not require an internet connection after initial page load (fully offline-capable once loaded).
- Browser local storage is available and sufficient for save data (typical RPG save data is well under the 5MB local storage limit).
- The game targets modern evergreen browsers (Chrome, Firefox, Safari, Edge) and does not need to support legacy browsers.
- There is one save slot per browser; multiple save slots are out of scope for this version.
- The combat system uses a simple stat-based formula (damage = attacker's attack minus defender's defense, with a minimum of 1). No elemental types or complex ability trees are included in this version.

## Clarifications

- **Rendering Engine / Framework** → Phaser 3 (full game framework) (70% weighted, D1)
- **Combat Scene Presentation** → Separate full-screen side-view scene (FF/DQ style) (100% weighted, D2)
- **Enemy Encounter Model** → Visible enemy sprites on map (Chrono Trigger style) (80% weighted, D5)
- **Deployment Target** → GitHub Pages (static, auto-deploy from repo) (100% weighted, D6)
- **Ability Unlock on Level-Up** → Stats only — fixed 3 actions (Attack/Defend/Use Item) (70% weighted) (70% weighted, D3)
- **World Map Size** → Small (~50x50 tiles, tight and focused) (70% weighted) (70% weighted, D4)
- **HUD Density During Exploration** → Light — small health bar in corner only (70% weighted) (70% weighted, D8)


## Requirements

- FR-016: The game MUST be built using the Phaser 3 framework as the rendering engine, physics provider, and game-loop manager. — *provenance: decided: 70% weighted (D1)*
- FR-017: Combat encounters MUST be presented in a separate full-screen side-view scene (Final Fantasy / Dragon Quest style), visually distinct from the exploration map, with a transition effect between scenes. — *provenance: decided: 100% weighted (D2)*
- FR-018: Enemies MUST appear as visible sprites on the exploration map (Chrono Trigger style); combat is initiated when the player character makes contact with an enemy sprite. There are no random/invisible encounters. — *provenance: decided: 80% weighted (D5)*
- FR-019: The game MUST be deployable as a static site to GitHub Pages with automated deployment configured from the repository (no server-side runtime required). — *provenance: decided: 100% weighted (D6)*
- R100: Level-ups MUST increase stats only (health, attack, defense); the combat system MUST provide exactly three fixed actions — Attack, Defend, and Use Item — with no additional abilities unlocked through leveling. — *provenance: probe: 70% weighted (D3)*
- R101: The game world MUST use a small map of approximately 50×50 tiles, tightly focused with minimal empty space. — *provenance: probe: 70% weighted (D4)*
- R102: During exploration, the HUD MUST display only a small health bar in one corner of the screen; all other player information (stats, inventory, quests) MUST be accessible only through menu screens. — *provenance: probe: 70% weighted (D8)*


## Deferred to Probe

These dimensions are **intentionally deferred**: the group reacts to the deployed probe instead of predicting from text.

- D3 — Ability Unlock on Level-Up (a: Stats only — fixed 3 actions (Attack/Defend/Use Item) · b: Unlock 1–2 extra combat abilities via leveling · c: Skill tree with 4+ unlockable abilities)
- D4 — World Map Size (a: Small (~50x50 tiles, tight and focused) · b: Medium (~75x75 tiles, village + wilderness + dungeon) · c: Large (~100x100 tiles, expansive))
- D7 — Visual Style & Pixel Density (a: 16x16 tiles, Game Boy palette (ultra-retro) · b: 16x16 tiles, SNES-era full color (nostalgic) · c: 32x32 tiles, modern indie pixel art (higher fidelity))
- D8 — HUD Density During Exploration (a: Minimal — no persistent HUD, stats via menu only · b: Light — small health bar in corner only · c: Full — health bar, minimap, quest tracker, hotkey hints)
