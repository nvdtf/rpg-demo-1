/**
 * Map configuration for the game world.
 * Keys correspond to assets loaded in BootScene.js.
 */

export const MAP_CONFIG = {
    key: 'world',
    tilesetName: 'tileset',
    tilesetImage: 'tileset',
    layers: {
        ground: 'Ground',
        walls: 'Walls',
        objects: 'Objects'
    },
    playerSpawn: { x: 25, y: 25 }
};
