import { Explosions, getExplosions } from "../gameLogic";

function simpleToGrid(simple: number[][]) {
    return simple.map(i => i.map(j => ({ type: j })));
}

it('should return no results', () => {
    const grid = simpleToGrid([
        [1, 298, 2938],
        [2, 3, 4],
        [5, 6, 7]
    ])
    const explosions = getExplosions(grid);
    expect(explosions.length).toBe(0);
});

it('should return result for 3 in beginning of column', () => {
    const grid = simpleToGrid([
        [1, 1, 1, 9],
        [2, 3, 4, 11],
        [5, 6, 7, 12],
        [13, 14, 15, 16]
    ])
    const explosions = getExplosions(grid);
    expect(explosions[0].has(0)).toBeTruthy();
    expect(explosions[0].has(1)).toBeTruthy();
    expect(explosions[0].has(2)).toBeTruthy();
});

it('should return result for 3 in end of column', () => {
    const grid = simpleToGrid([
        [9, 1, 1, 1],
        [2, 3, 4, 11],
        [5, 6, 7, 12],
        [13, 14, 15, 16]
    ])
    const explosions = getExplosions(grid);
    expect(explosions.length).toBe(1);
    expect(explosions[0].has(1)).toBeTruthy();
    expect(explosions[0].has(2)).toBeTruthy();
    expect(explosions[0].has(3)).toBeTruthy();
});

it('should return result for 3 in a whole column', () => {
    const grid = simpleToGrid([
        [1, 1, 1],
        [2, 3, 4],
        [5, 6, 7],
    ])
    expect(getExplosions(grid).length).toBeGreaterThan(0);
});

it('should return one result for 4 in a whole column', () => {
    const grid = simpleToGrid([
        [1, 1, 1, 1],
        [2, 3, 4, 8],
        [5, 6, 7, 9],
        [15, 16, 17, 19],
    ])
    expect(getExplosions(grid).length).toBeGreaterThan(0);
});


it('should return result for 3 in beginning of row', () => {
    const grid = simpleToGrid([
        [1, 17, 18, 9],
        [1, 3, 4, 11],
        [1, 6, 7, 12],
        [13, 14, 15, 16]
    ])
    expect(getExplosions(grid).length).toBeGreaterThan(0);
});

it('should return result for 3 in a whole row', () => {
    const grid = simpleToGrid([
        [1, 2, 5],
        [1, 3, 4],
        [1, 6, 7],
    ])
    expect(getExplosions(grid).length).toBeGreaterThan(0);
});

it('should return a cross', () => {
    const grid = simpleToGrid([
        [2, 1, 3],
        [1, 1, 1],
        [7, 1, 9],
    ])
    const explosions = getExplosions(grid);
    expect(explosions.length).toBe(3);
    expect(explosions[0].has(1)).toBeTruthy();
    expect(explosions[1].has(0)).toBeTruthy();
    expect(explosions[1].has(1)).toBeTruthy();
    expect(explosions[1].has(2)).toBeTruthy();
    expect(explosions[2].has(1)).toBeTruthy();
});