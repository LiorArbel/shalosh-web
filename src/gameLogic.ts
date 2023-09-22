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
    for (let y = 0; y < grid.length; y++) {
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
    for (let x = 0; x < grid[0].length; x++) {
        let y = 0;
        let series = 0;
        let currentType = grid[x][y].type;
        while (y < grid.length) {
            if (y == grid[x].length - 1 || grid[x][y+1].type !== currentType) {
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
            // if (grid[x][y].type == currentType) {
            //     series++;
            // } else {
            //     if (series >= 3) {
            //         [...Array(series).keys()].forEach((unused, i) => {
            //             if (explosions[x] == undefined) {
            //                 explosions[x] = new Set();
            //             }
            //             explosions[x].add(y - 1 - i);
            //         })
            //     }
            //     series = 0;
            //     currentType = grid[x][y].type;
            // }
        }
    }
    return explosions;
}