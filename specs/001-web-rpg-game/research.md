# Research: Web-Based RPG Game

**Spec**: `specs/001-web-rpg-game/spec.md` | **Date**: 2026-06-15

## R1: Phaser 3 CDN Loading Strategy

**Decision**: Load Phaser 3 via `<script>` tag from jsDelivr CDN, access as global `Phaser`. Application code uses ES modules (`type="module"`) but Phaser itself is loaded as a UMD global.

**Rationale**: Phaser 3.87.0 provides both UMD and ESM builds on jsDelivr (`phaser.esm.min.js` exists at 1.14 MB). However, the ESM build cannot reliably be `import`-ed from a CDN URL in all browsers without an import map. The simpler, officially recommended pattern is a `<script>` tag for Phaser followed by `<script type="module">` for application code, which accesses the global `Phaser` object. This avoids import map complexity while still using ES modules for all project code.

**Alternatives considered**:
- ESM import from CDN: Requires import maps, browser support inconsistent, adds complexity for no gain
- Download Phaser locally: Would work but adds a 1.14 MB file to the repo; CDN is cleaner for a GitHub Pages deploy
- `phaser-arcade-physics.min.js` (1.03 MB, smaller): Only includes Arcade Physics, sufficient for this project — **use this instead of full Phaser** to reduce load time

**Concrete pattern**:
```html
<script src="https://cdn.jsdelivr.net/npm/phaser@3.87.0/dist/phaser-arcade-physics.min.js"></script>
<script type="module" src="js/main.js"></script>
```

## R2: Tile Map Loading and Collision

**Decision**: Use Tiled map editor to create JSON map files. Load with Phaser's built-in `tilemapTiledJSON` loader. Set collision via tile properties.

**Rationale**: Phaser 3 has first-class support for Tiled JSON exports. The workflow is: design map in Tiled → export as JSON → load in Phaser → create layers → set collision by property. This is the standard, well-documented approach.

**Alternatives considered**:
- Programmatic tile arrays in JS: Works for simple maps but becomes unwieldy for the map sizes in scope (50x50 to 100x100). Tiled provides visual editing.
- CSV tile maps: Phaser supports these but they lack layer/property metadata needed for collision.

**Concrete pattern**:
```javascript
// preload
this.load.tilemapTiledJSON('map', 'assets/maps/world.json');
this.load.image('tileset', 'assets/tiles/tileset.png');

// create
const map = this.make.tilemap({ key: 'map' });
const tileset = map.addTilesetImage('tileset-name', 'tileset');
const groundLayer = map.createLayer('Ground', tileset);
const wallLayer = map.createLayer('Walls', tileset);
wallLayer.setCollisionByProperty({ collides: true });
this.physics.add.collider(this.player, wallLayer);
```

## R3: Scene Management — Parallel Scenes and Transitions

**Decision**: Use Phaser's `scene.launch()` for parallel scenes (HUD overlay) and `scene.sleep()`/`scene.wake()` for combat transitions. Pass data via the second argument to `scene.start()`/`scene.launch()`.

**Rationale**: Phaser 3's scene manager natively supports multiple active scenes. `scene.launch()` starts a new scene while keeping the current one running — perfect for a HUD overlay. `scene.sleep()` pauses a scene's update loop and rendering but preserves all state, which is ideal for the WorldScene during combat.

**Alternatives considered**:
- Destroying and recreating WorldScene: Wasteful and loses state
- Storing world state in a global manager: Unnecessary when `sleep`/`wake` preserves it natively

**Concrete pattern**:
```javascript
// WorldScene: entering combat
this.scene.sleep('WorldScene');
this.scene.launch('CombatScene', { enemy: enemyData, player: playerData });

// CombatScene: combat ends
this.scene.stop('CombatScene');
this.scene.wake('WorldScene', { combatResult: result });

// WorldScene: HUD overlay (launched once, runs in parallel)
this.scene.launch('UIScene');
```

**Scene lifecycle methods**:
- `init(data)` — receives data passed from launching scene
- `create()` — set up game objects
- `update()` — game loop
- `wake` event — handle return from combat

## R4: Sprite Animation

**Decision**: Use Phaser's spritesheet loader with fixed `frameWidth`/`frameHeight`. Define animation keys for each direction/action. Sprite sheets are horizontal strips or grids.

**Rationale**: Phaser's animation manager creates animations from frame ranges within a spritesheet. The standard format is a grid of equally-sized frames. For pixel-art RPGs, 16x16 or 32x32 frames (deferred — D7) organized as 4-direction walk cycles (3–4 frames per direction) is the norm.

**Alternatives considered**:
- Texture atlas (JSON + PNG): More flexible but overkill for simple pixel art with uniform frame sizes
- Individual frame images: Too many HTTP requests, poor for performance

**Concrete pattern**:
```javascript
// preload
this.load.spritesheet('player', 'assets/sprites/player.png', {
  frameWidth: 16, frameHeight: 16
});

// create
this.anims.create({
  key: 'walk-down',
  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
  frameRate: 8,
  repeat: -1
});
```

## R5: Combat System Design

**Decision**: String-based finite state machine in CombatScene. Five states: `PLAYER_TURN`, `PLAYER_ANIMATING`, `ENEMY_TURN`, `ENEMY_ANIMATING`, `COMBAT_END`. No FSM library needed.

**Rationale**: With only 5 states, a simple string comparison (`if (this.state !== 'PLAYER_TURN') return`) is clearer than a library. Input is gated behind state checks. Transitions are driven by `time.delayedCall` for animation windows (300–500ms).

**Alternatives considered**:
- FSM library (e.g., xstate): Adds a CDN dependency for minimal benefit at this scale
- Event-driven architecture: More flexible but harder to reason about for a linear turn sequence

**Damage formula** (from spec): `max(1, attacker.attack - defender.defense)`

**Defend action**: Set `isDefending = true` on the player. When enemy attacks a defending player, halve the damage: `max(1, floor(damage / 2))`. Clear flag at end of enemy turn.

**Combat UI**: Phaser `Graphics` + `Text` objects (no DOM overlay). Health bars as filled rectangles. Action menu as interactive text with keyboard (arrow keys + Enter) and click support.

## R6: Save/Load with localStorage

**Decision**: Direct `JSON.stringify()`/`JSON.parse()` to/from `localStorage` under key `rpg_save_v1`. No Phaser plugin needed.

**Rationale**: The save data is a simple object (see `contracts/game-state.md`). Phaser has no built-in save system, and a localStorage plugin adds unnecessary abstraction. Direct localStorage is simpler and gives full control over the serialization format.

**Alternatives considered**:
- Phaser Data Manager / Registry: These are in-memory only, not persisted
- IndexedDB: More powerful but unnecessary for < 10 KB of save data
- rexrainbow localStorage plugin: Adds a dependency for something that's a few lines of vanilla JS

**Concrete pattern**:
```javascript
// Save
const saveData = { version: 1, timestamp: new Date().toISOString(), player: {...}, questLog: [...], defeatedEnemies: [...] };
localStorage.setItem('rpg_save_v1', JSON.stringify(saveData));

// Load
const raw = localStorage.getItem('rpg_save_v1');
if (raw) {
  const saveData = JSON.parse(raw);
  if (saveData.version === 1) { /* restore state */ }
}
```

## R7: Phaser Loading — Arcade Physics Build

**Decision**: Use `phaser-arcade-physics.min.js` (1.03 MB) instead of full `phaser.min.js` (1.14 MB).

**Rationale**: The game only needs Arcade Physics for tile-based collision and simple overlap detection. The full Phaser build includes Matter.js and other physics engines that are unused. The arcade-only build is ~10% smaller, improving load time toward the 3-second SC-001 target.

**Alternatives considered**:
- Full Phaser build: Larger, no benefit since Matter.js is unused
- No-physics build: Would require manual collision detection, not worth the effort
