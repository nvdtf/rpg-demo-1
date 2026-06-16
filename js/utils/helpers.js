export const TILE_SIZE = 16;

export const Direction = Object.freeze({
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
});

export function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
}

export function tileToPixel(tileX, tileY) {
    return {
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE + TILE_SIZE / 2,
    };
}

export function pixelToTile(px, py) {
    return {
        x: Math.floor(px / TILE_SIZE),
        y: Math.floor(py / TILE_SIZE),
    };
}
