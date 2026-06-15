# Implementation Plan: Web-Based RPG Game

**Branch**: `001-web-rpg-game` | **Date**: 2026-06-15 | **Spec**: `specs/001-web-rpg-game/spec.md`

**Input**: Feature specification from `specs/001-web-rpg-game/spec.md`

## Summary

Build a browser-based 2D tile-map RPG with turn-based combat, character progression, NPC quests, inventory management, and local-storage persistence. The game uses Phaser 3 loaded via CDN on a static site with vanilla JavaScript — no build step, no backend. Deployment target is GitHub Pages.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES modules)

**Primary Dependencies**: Phaser 3 (loaded via CDN, approved per spec FR-016 / D1)

**Storage**: Browser `localStorage` for save/load (FR-013)

**Testing**: Manual browser testing; no automated test framework (static site, no build step — automated testing would require a build tool or test runner that violates Constitution Principle IV)

**Target Platform**: Modern desktop browsers (Chrome, Firefox, Safari, Edge) — mobile/touch out of scope per spec assumptions

**Project Type**: Static web application (single-page game)

**Performance Goals**: 60 fps rendering, game world loads within 3 seconds (SC-001, SC-007)

**Constraints**: No build step, no transpilation, no bundler, no backend server (Constitution Principle IV). Fully offline-capable after initial page load. Single save slot. No audio.

**Scale/Scope**: Single contiguous tile map (size deferred to probe — D4), 6 user stories (P1–P6), single-player only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Human-Agent Boundary | PASS | Spec defines WHAT/WHY; plan addresses HOW only. No scope changes. |
| II. Escalation Discipline | PASS | No ambiguities requiring escalation — deferred dimensions (D3, D4, D7, D8) are explicitly deferred to probe. |
| III. Deployable Probe First | PASS | Probe scope identified: P1 (tile-map exploration with movement + collision) is a minimal deployable slice. |
| IV. Static-Only Stack | PASS | Vanilla JS, no build step, no backend. Phaser 3 via CDN (justified in spec FR-016). |
| V. Requirement Provenance | PASS | All requirements in spec carry provenance annotations. |
| VI. Spec-Only Review | PASS | Plan defers all spec-silent choices (file naming, code structure) to implementation. |

**Gate result**: ALL PASS — proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-web-rpg-game/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── game-state.md    # Save/load state contract
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
index.html               # Entry point — loads Phaser via CDN, boots game
css/
└── style.css            # Minimal page/canvas styling
js/
├── main.js              # Phaser game config + scene registration
├── scenes/
│   ├── BootScene.js     # Asset preloading
│   ├── MenuScene.js     # Main menu (New Game / Load Game / Help)
│   ├── WorldScene.js    # Tile-map exploration, NPCs, enemies
│   ├── CombatScene.js   # Turn-based combat (FF/DQ side-view)
│   ├── GameOverScene.js # Game over screen
│   └── UIScene.js       # HUD overlay (runs parallel to WorldScene)
├── entities/
│   ├── Player.js        # Player character class
│   ├── Enemy.js         # Enemy class + encounter behavior
│   └── NPC.js           # NPC class + dialog trigger
├── systems/
│   ├── CombatSystem.js  # Damage calc, turn logic, actions
│   ├── QuestSystem.js   # Quest tracking, objectives, rewards
│   ├── InventorySystem.js # Item management, equip/unequip
│   ├── LevelSystem.js   # XP thresholds, stat growth
│   └── SaveSystem.js    # localStorage serialization
├── data/
│   ├── maps.js          # Map definitions or Tiled JSON references
│   ├── enemies.js       # Enemy stat tables
│   ├── items.js         # Item catalog
│   ├── npcs.js          # NPC dialog + quest data
│   └── quests.js        # Quest definitions
└── utils/
    └── helpers.js       # Small shared utilities
assets/
├── sprites/             # Character, enemy, NPC sprite sheets
├── tiles/               # Tileset images
└── ui/                  # UI elements (buttons, frames, icons)
```

**Structure Decision**: Flat static site at repo root. `index.html` is the entry point. All JS uses ES modules (`type="module"`). No `src/` wrapper — unnecessary indirection for a static site. `js/` contains all game logic organized by responsibility. `assets/` holds pixel-art sprites and tilesets. Phaser 3 loaded from CDN in `index.html`.

## Complexity Tracking

No constitution violations — table not needed.
