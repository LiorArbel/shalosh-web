import logo from './logo.svg';
import './App.css';
import { BLEND_MODES, BlurFilter, Filter, BaseTexture } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { Stage, Container, Sprite, Text, Graphics, useApp } from '@pixi/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { settings, SCALE_MODES } from 'pixi.js';
import '@pixi/math-extras';
import React from 'react';
import { create, random, range } from 'lodash';
import apple from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/AppleSLICE.png";
import kiwi from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/kiwiSLICE.png";
import mandarin from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/MandarinSLICE.png";
import watermelon from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/WatermelonSLICE.png";
import strawberry from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/StrawberrySLICE.png";

const FRUITS_IMAGES = [
  apple,
  kiwi,
  mandarin,
  watermelon,
  strawberry
]

const cellTypesAmount = FRUITS_IMAGES.length;

const CELL_WIDTH = 40;
const CELL_HEIGHT = 40;
const MIN_DRAG_THRESH = 1000;

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const app = new PIXI.Application<HTMLCanvasElement>({ height: 640, backgroundAlpha: 0 });

type animationCommand = {
  animFunction: (t: number) => void,
  meta: { finished: boolean },
};

let existingTicker;

function initGame(grid: GameGrid) {
  console.log("recieved grid", grid);
  app.stage.removeChildren();
  const gridSprite = createGrid(grid);
  app.stage.addChild(gridSprite);
  let movedChild: PIXI.Sprite | undefined;
  let isDragging = false;
  let isAnimating = false;
  let animationQueue: animationCommand[] = [];
  let startDragLocation: PIXI.Point | undefined;
  let startFruitPosition: PIXI.Point | undefined;
  let pendingChange: { original: PIXI.Sprite, swapped: PIXI.Sprite, originalCell: PIXI.Point, swappedCell: PIXI.Point } | undefined;

  const debugText = new PIXI.Text("hello");
  app.stage.addChild(debugText);

  app.stage.eventMode = 'static';

  async function animateForTime(point: PIXI.Point, target: PIXI.Point, time: number) {
    const promise = new Promise<void>((res, rej) => {
      const meta = { finished: false };
      const start = point.clone();
      let passedTime = 0;
      animationQueue.push({
        animFunction: t => {
          passedTime += t;
          if (passedTime >= time) {
            point.copyFrom(target);
            meta.finished = true;
            res();
            return;
          }
          point.copyFrom(lerpPoint(start, target, Math.min(passedTime, time) / time));
        },
        meta,
      })
    });
    return promise;
  }

  if (existingTicker) {
    app.ticker.remove(existingTicker);
  }

  existingTicker = ticker;
  app.ticker.add(ticker);
  console.log(app.ticker.count)

  function ticker(t) {
    debugText.text = getExplosions(grid).map(i => i.x + ',' + i.y).join('|');
    if (animationQueue.length > 0) {
      animationQueue.forEach(i => i.animFunction(t));
      animationQueue = animationQueue.filter(i => !i.meta.finished);
    } else {
      // TODO: This goes into inifinte explosions.
      // const explosions = getExplosions(grid);
      // if(explosions.length > 0){
      //   explode(grid, explosions);
      // }
    }
  }

  function commonPointerUp() {
    if (animationQueue.length > 0) {
      return;
    }
    isDragging = false;
    if (movedChild) {
      movedChild.position = startFruitPosition || movedChild.position;
      resetMoved();
    }
  }

  function commitChange() {
    if (!pendingChange) {
      return;
    }
    const { originalCell, original, swapped, swappedCell } = pendingChange;
    gridAt(originalCell).sprite = swapped;
    const temp = gridAt(originalCell).type;
    gridAt(originalCell).type = gridAt(swappedCell).type;
    gridAt(swappedCell).sprite = original;
    gridAt(swappedCell).type = temp;
    pendingChange = undefined;
  }

  function resetMoved() {
    if (!movedChild) {
      return
    }
    movedChild.alpha = 1;
    movedChild = undefined;
    startFruitPosition = undefined;
  }

  app.stage.on('pointerup', commonPointerUp);
  app.stage.on('pointerupoutside', commonPointerUp);

  app.stage.on('pointermove', async (e) => {
    const mouseCell = globalToGridCell(e.global);
    // t.text = mouseCell.toString();
    if (animationQueue.length > 0) {
      return;
    }
    if (movedChild && startDragLocation && startFruitPosition) {
      if (pendingChange) {
        pendingChange.swapped.position = movedChild.position;
        pendingChange = undefined;
      }
      if (getDistanceSquared(startDragLocation, e.global) > MIN_DRAG_THRESH) {
        const diretion = new PIXI.Point(0, 0);
        if (Math.abs(startDragLocation.x - e.global.x) > Math.abs(startDragLocation.y - e.global.y)) {
          diretion.x = Math.sign(e.global.x - startDragLocation.x);
        } else {
          diretion.y = Math.sign(e.global.y - startDragLocation.y);
        }
        const target = startFruitPosition.add(diretion.multiplyScalar(movedChild.width));
        const targetCell = globalToGridCell(movedChild.parent.toGlobal(target));
        const currentCell = globalToGridCell(movedChild.parent.toGlobal(startFruitPosition));
        if (canSwap(currentCell, targetCell)) {
          const swappedFruit = gridAt(targetCell).sprite;
          if (swappedFruit) {
            animateForTime(movedChild.position, target, 10);
            await animateForTime(swappedFruit.position, startFruitPosition, 10);
            if (validMove(currentCell, targetCell)) {
              pendingChange = {
                original: movedChild,
                swapped: swappedFruit,
                swappedCell: targetCell,
                originalCell: currentCell,
              }
              commitChange();
              explode(grid, getExplosions(grid));
            } else {
              animateForTime(movedChild.position, startFruitPosition, 10);
              await animateForTime(swappedFruit.position, target, 10);
              pendingChange = undefined;
            }
            resetMoved();
          }
        }
      } else {
        movedChild.position = startFruitPosition;
      }
    }
  });

  function globalToGridCell(point: PIXI.Point) {
    return new PIXI.Point(
      Math.floor((point.x - gridSprite.position.x) / CELL_WIDTH / gridSprite.scale.x),
      Math.floor((point.y - gridSprite.position.y) / CELL_WIDTH / gridSprite.scale.y)
    );
  }

  function createGrid(grid: GameGrid) {
    const rows = grid.length;
    const cols = grid[0].length;

    const g = new PIXI.Graphics();
    g.lineStyle({ color: "gray", width: 1, alpha: 0.2 });
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.drawRect(i * CELL_WIDTH, j * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
      }
    }

    const gridContainer = new PIXI.Container();
    gridContainer.position = { x: 100, y: 170 };
    gridContainer.scale = { x: 2, y: 2 };

    gridContainer.addChild(g);
    grid.map((row, rowIndex) => row.map((cell, colIndex) => {
      const fruit = createFruitSprite(colIndex, rowIndex, cell.type);
      grid[rowIndex][colIndex].sprite = fruit;
      gridContainer.addChild(fruit);
    }))
    return gridContainer;
  }

  function createFruitSprite(x: number, y: number, type: number) {
    const fruit = PIXI.Sprite.from(FRUITS_IMAGES[type]);
    fruit.eventMode = 'static';
    fruit.height = CELL_HEIGHT;
    fruit.width = CELL_WIDTH;
    fruit.x = CELL_WIDTH * x + 4 + fruit.width / 3;
    fruit.y = CELL_HEIGHT * y + 4 + fruit.height / 3;
    fruit.anchor.set(0.5, 0.5);
    fruit.on('pointerdown', (e) => {
      isDragging = true;
      startDragLocation = e.global.clone();
      movedChild = fruit;
      startFruitPosition = fruit.position.clone();
      fruit.alpha = 0.5;
    });
    return fruit;
  }

  function canSwap(fruitA: PIXI.Point, fruitB: PIXI.Point) {
    return grid[fruitA.x][fruitA.y] !== undefined && grid[fruitB.x][fruitB.y] !== undefined && fruitA.subtract(fruitB).magnitudeSquared() == 1;
  }

  function gridAt(point: PIXI.Point) {
    return grid[point.y][point.x];
  }

  function validMove(from: PIXI.Point, to: PIXI.Point) {
    return true;
  }

  async function explode(grid: GameGrid, explosions: { x: number, y: number }[]) {
    const shiftGrid: number[][] = range(grid.length).map(i => []);
    explosions.forEach(cell => {
      // range(cell.y + 1).reverse().forEach(i => shiftGrid[i][cell.x] = (shiftGrid[i][cell.x] || 0) + 1);
      grid[cell.y][cell.x].sprite?.destroy();
      grid[cell.y][cell.x].sprite = undefined;
      grid[cell.y][cell.x].type = -1;
    });
    for (let i = grid.length - 1; i >= 0; i--) {
      let toAdd: { x: number, y: number }[] = [];
      for (let j = grid[0].length - 1; j >= 0; j--) {
        // const shift = (shiftGrid[i][j] || 0);
        // const shifted = i - shift;
        // if (shifted < 0) {
        //   const type = random(0, cellTypesAmount - 1);
        //   const newFruit = createFruitSprite(-10, -10, type);
        //   gridSprite.addChild(newFruit);
        //   grid[i][j] = { type, sprite: newFruit };
        // } else if (shift > 0) {
        //   grid[i][j] = grid[shifted][j];
        // }
        // const sprite = grid[i][j].sprite;
        // if (sprite && shift > 0) {
        //   animateForTime(sprite.position, sprite.position.add(new PIXI.Point(0, sprite.height * (shift))).clone(), 20);
        // }
        if (grid[j][i].type == -1) {
          let k = -1;
          let above: gridItem | undefined;
          while (j + k >= 0 && !above) {
            if (grid[j + k][i].type !== -1) {
              above = grid[j + k][i];
            } else {
              k--;
            }
          }
          if (above) {
            grid[j][i] = above;
            if (above.sprite) {
              animateForTime(above.sprite.position, above.sprite.position.add(new PIXI.Point(0, above.sprite.height * k * -1)), 20);
            }
            grid[j + k][i].type = -1;
          } else {
            toAdd.push({ x: i, y: j });
          }
        }
      }
      toAdd.forEach(({ x, y }, index) => {
        const type = random(0, cellTypesAmount - 1);
        const sprite = createFruitSprite(x, -1 * (1 + index), type);
        gridSprite.addChild(sprite);
        animateForTime(sprite.position, sprite.position.add(new PIXI.Point(0, sprite.height * toAdd.length)), 20);
        grid[y][x] = {
          sprite: sprite,
          type
        };
      })
    }
  }

  function getExplosions(grid: GameGrid) {
    if (grid.length < 1 || grid[0].length < 1) {
      return [];
    }
    const explosions: { x: number, y: number }[] = [];
    for (let y = 0; y < grid.length; y++) {
      let x = 0;
      let series = 0;
      let currentType = grid[y][x].type;
      while (x < grid[y].length) {
        if (grid[y][x].type == currentType) {
          series++;
        } else {
          if (series >= 3) {
            [...Array(series).keys()].forEach((unused, i) => {
              explosions.push({ x: x - 1 - i, y });
            })
          }
          series = 0;
          currentType = grid[y][x].type;
        }
        x++;
      }
    }
    for (let x = 0; x < grid[0].length; x++) {
      let y = 0;
      let series = 0;
      let currentType = grid[y][x].type;
      while (y < grid.length) {
        if (grid[y][x].type == currentType) {
          series++;
        } else {
          if (series >= 3) {
            [...Array(series).keys()].forEach((unused, i) => {
              explosions.push({ x: x, y: y - 1 - i });
            })
          }
          series = 0;
          currentType = grid[y][x].type;
        }
        y++;
      }
    }
    return explosions.sort((a, b) => a.x - b.x || a.y - b.y);
  }
}

function lerpPoint(point1: PIXI.Point, point2: PIXI.Point, rate: number) {
  return point1.multiplyScalar(1 - rate).add(point2.multiplyScalar(rate));
}

function getDistanceSquared(point1: PIXI.Point, point2: PIXI.Point) {
  return Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2);
}

type gridItem = {
  type: number;
  sprite?: PIXI.Sprite;
}

type GameGrid = gridItem[][];

function App() {
  return (
    <div className="App">
      <MyComponent />
    </div>
  );
}

export default App;

export const MyComponent = () => {
  const gridRows = 4;
  const gridCols = 4;
  const startingTurns = 10;
  const [grid, setGrid] = useState<GameGrid>([[]]);
  const [turns, setTurns] = useState(0);
  const appContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    newGame();
  }, []);

  useEffect(() => {
    initGame(grid);
  }, [grid])

  useEffect(() => {
    if (appContainer.current) {
      appContainer.current.appendChild(app.view);
    }
    return () => {
      appContainer.current?.removeChild(app.view);
    }
  }, []);

  function newGame() {
    setTurns(startingTurns);
    const grid = range(gridRows).map(i => range(gridCols).map(i => ({ type: random(0, cellTypesAmount - 1) })));
    console.log(grid);
    setGrid(
      grid
    );
  }

  return <>
    <div ref={appContainer}></div>
    <button onClick={newGame}>new game</button>
  </>;
};