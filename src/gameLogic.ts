import { range } from 'lodash';
import * as PIXI from 'pixi.js';

export type Explosions = Set<number>[];

export type gridItem = {
    type: number;
    sprite?: PIXI.Sprite;
}

export type GameGrid = gridItem[][];

export function getExplosions(grid: GameGrid): Explosions {
    if (grid.length < 1 || grid[0].length < 1) {
        return [];
    }
    const explosions: Explosions = [];
    for (let y = 0; y < grid[0].length; y++) {
        let x = 0;
        let series = 0;
        let currentType = grid[x][y].type;
        while (x < grid.length) {
            if (x == grid.length - 1 || grid[x + 1][y].type !== currentType) {
                if (series >= 2) {
                    range(series + 1).forEach((i) => {
                        const column = x - i;
                        if (explosions[column] == undefined) {
                            explosions[column] = new Set();
                        }
                        explosions[column].add(y);
                    });
                }
                if (x < grid.length - 1) {
                    currentType = grid[x + 1][y].type;
                }
                series = 0;
            } else {
                series++;
            }
            x++;
        }
    }
    for (let x = 0; x < grid.length; x++) {
        let y = 0;
        let series = 0;
        let currentType = grid[x][y].type;
        while (y < grid[x].length) {
            if (y == grid[x].length - 1 || grid[x][y + 1].type !== currentType) {
                if (series >= 2) {
                    range(series + 1).forEach((i) => {
                        if (explosions[x] == undefined) {
                            explosions[x] = new Set();
                        }
                        explosions[x].add(y - i);
                    });
                }
                if (y < grid[x].length - 1) {
                    currentType = grid[x][y + 1].type;
                }
                series = 0;
            } else {
                series++;
            }
            y++;
        }
    }
    return explosions;
}

export function cloneGridShallow(grid: GameGrid) {
    return grid.map(i => i.map(j => ({ type: j.type })));
}

export function swapPoints(grid: GameGrid, a: PIXI.Point, b: PIXI.Point) {
    const temp = grid[a.x][a.y];
    grid[a.x][a.y] = grid[b.x][b.y];
    grid[b.x][b.y] = temp;
}

export function lerpPoint(point1: PIXI.Point, point2: PIXI.Point, rate: number) {
    return point1.multiplyScalar(1 - rate).add(point2.multiplyScalar(rate));
}

export function getDistanceSquared(point1: PIXI.Point, point2: PIXI.Point) {
    return Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2);
}