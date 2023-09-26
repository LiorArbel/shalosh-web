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
import { bind, Subscribe } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import apple from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/AppleSLICE.png";
import kiwi from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/kiwiSLICE.png";
import mandarin from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/MandarinSLICE.png";
import watermelon from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/WatermelonSLICE.png";
import strawberry from "./Helmt_32x32_fruit_asset_pack/SLICES/SLICES_LINE/StrawberrySLICE.png";
import { GameGrid, Explosions, getExplosions, cloneGridShallow, swapPoints, lerpPoint, getDistanceSquared } from './gameLogic';
import { explosionSheet } from './explosionAnimation';
import { animateForSpeed, animateForTime, animationCommand, shake } from './animationLogic';

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
const MIN_DRAG_THRESH = CELL_WIDTH;

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const app = new PIXI.Application<HTMLCanvasElement>({ height: 640, backgroundAlpha: 0 });

let existingTicker;

const startingTurns = 10;
const [turnsChange$, setTurns] = createSignal<number>();
const [useTurns, turns$] = bind(turnsChange$, startingTurns);

async function initGame(grid: GameGrid) {
  await explosionSheet.parse();
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

  if (existingTicker) {
    app.ticker.remove(existingTicker);
  }

  existingTicker = ticker;
  app.ticker.add(ticker);
  console.log(app.ticker.count)

  function ticker(t) {
    if (animationQueue.length > 0) {
      isAnimating = true;
      animationQueue.forEach(i => i.animFunction(t));
      animationQueue = animationQueue.filter(i => !i.meta.finished);
    } else {
      isAnimating = false;
      const explosions = getExplosions(grid);
      if (explosions.length > 0) {
        explode(explosions);
      }
    }
  }

  function commonPointerUp() {
    if (animationQueue.length > 0) {
      return;
    }
    isDragging = false;
    if (movedChild && !movedChild.destroyed) {
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
    // const mouseCell = globalToGridCell(e.global);
    // const cellPos = gridCellToGlobal(mouseCell);
    // debugText.text = 
    //   Math.floor(e.global.x) + ',' + Math.floor(e.global.y) + ',\n' 
    //   + mouseCell.toString() + '\n' 
    //   + cellPos.toString()
    //   + gridSprite.toLocal(cellPos);
    if (isAnimating) {
      return;
    }
    if (movedChild && startDragLocation && startFruitPosition && !movedChild.destroyed) {
      if (pendingChange) {
        pendingChange.swapped.position = movedChild.position;
        pendingChange = undefined;
      }
      if (startDragLocation.subtract(e.global).magnitude() > MIN_DRAG_THRESH * gridSprite.scale.x) {
        const diretion = new PIXI.Point(0, 0);
        if (Math.abs(startDragLocation.x - e.global.x) > Math.abs(startDragLocation.y - e.global.y)) {
          diretion.x = Math.sign(e.global.x - startDragLocation.x);
        } else {
          diretion.y = Math.sign(e.global.y - startDragLocation.y);
        }
        const currentCellX = grid.findIndex(row => row.find(i => i.sprite === movedChild));
        const currentCellY = grid[currentCellX].findIndex(i => i.sprite === movedChild);
        const currentCell = new PIXI.Point(currentCellX, currentCellY);
        const targetCell = currentCell.add(diretion);
        if (canSwap(currentCell, targetCell)) {
          const swappedFruit = gridAt(targetCell).sprite;
          if (swappedFruit) {
            const target = startFruitPosition.add(diretion.multiplyScalar(movedChild.width));
            animateForTime(animationQueue, movedChild.position, target, 10);
            await animateForTime(animationQueue, swappedFruit.position, startFruitPosition, 10);
            if (validMove(grid, currentCell, targetCell)) {
              pendingChange = {
                original: movedChild,
                swapped: swappedFruit,
                swappedCell: targetCell,
                originalCell: currentCell,
              }
              commitChange();
              setTurns(turns$.getValue() - 1);
              await explode(getExplosions(grid));
              await enlargeGrid();
            } else {
              animateForTime(animationQueue, movedChild.position, startFruitPosition, 10);
              await animateForTime(animationQueue, swappedFruit.position, target, 10);
              pendingChange = undefined;
            }
            console.log("finished pointermove");
            resetMoved();
          }
        }
      } else {
        movedChild.position = startFruitPosition;
      }
    }
  });

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
    gridContainer.position = { x: 250, y: 50 };
    gridContainer.scale = { x: 2, y: 2 };

    gridContainer.addChild(g);
    grid.map((row, rowIndex) => row.map((cell, colIndex) => {
      const fruit = createFruitSprite(rowIndex, colIndex, cell.type);
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
    fruit.x = CELL_WIDTH * x;
    fruit.y = CELL_HEIGHT * y;
    fruit.on('pointerdown', (e) => {
      if (isAnimating) {
        return;
      }
      isDragging = true;
      startDragLocation = e.global.clone();
      movedChild = e.currentTarget as PIXI.Sprite;
      startFruitPosition = movedChild.position.clone();
      movedChild.alpha = 0.5;
    });
    return fruit;
  }

  function gridCellToGlobal(cell: PIXI.Point) {
    return new PIXI.Point(
      gridSprite.position.x + cell.x * CELL_WIDTH * gridSprite.scale.x,
      gridSprite.position.y + cell.y * CELL_HEIGHT * gridSprite.scale.y
    )
  }

  function globalToGridCell(point: PIXI.Point) {
    return new PIXI.Point(
      Math.floor((point.x - gridSprite.position.x) / CELL_WIDTH / gridSprite.scale.x),
      Math.floor((point.y - gridSprite.position.y) / CELL_WIDTH / gridSprite.scale.y)
    );
  }

  function canSwap(fruitA: PIXI.Point, fruitB: PIXI.Point) {
    return grid[fruitA.x][fruitA.y] !== undefined && grid[fruitB.x][fruitB.y] !== undefined && fruitA.subtract(fruitB).magnitudeSquared() == 1;
  }

  function gridAt(point: PIXI.Point) {
    return grid[point.x][point.y];
  }

  function validMove(grid: GameGrid, from: PIXI.Point, to: PIXI.Point) {
    const cloned = cloneGridShallow(grid);
    swapPoints(cloned, from, to);
    const explosions = getExplosions(cloned);
    return explosions.length > 0;
  }

  function createExplosionSprite(location: PIXI.Point) {
    const anim = new PIXI.AnimatedSprite(explosionSheet.animations['explosion' + random(1, 3, false)]);
    anim.position = location;
    gridSprite.addChild(anim);
    anim.anchor.set(0, 0);
    anim.scale.set(0.6, 0.6);
    anim.animationSpeed = 1 / 4;
    anim.loop = false;
    anim.onComplete = () => {
      anim.destroy();
    }
    anim.play();
  }

  async function explode(explosions: Explosions) {
    let shakePromise;
    if (explosions.find(i => i && i.size > 0)) {
      shakePromise = shake(app, gridSprite, 10);
    }
    explosions.forEach((set, x) => {
      if (!set) {
        return;
      }
      const valuesSorted = Array.from(set.values()).sort().reverse();
      valuesSorted.forEach(y => {
        createExplosionSprite(grid[x][y].sprite.position);
        grid[x][y].sprite?.destroy();
      });
      grid = grid.map(row => row.filter(cell => cell.sprite && !cell.sprite.destroyed));
      range(valuesSorted.length).forEach((i) => {
        const type = random(0, cellTypesAmount - 1);
        const sprite = createFruitSprite(x, -1 * (1 + i), type);
        gridSprite.addChild(sprite);
        grid[x].unshift({ type, sprite });
      });
    });
    await Promise.all([synchFruitPositions(), shakePromise]);
  }

  async function synchFruitPositions() {
    const promises = [];
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const sprite = grid[x][y].sprite;
        if (sprite) {
          const diff = gridSprite.toLocal(gridCellToGlobal(new PIXI.Point(x, y))).subtract(sprite.position);
          promises.push(animateForSpeed(animationQueue, sprite.position, sprite.position.add(diff), 10));
        }
      }
    }
    await Promise.all(promises);
  }

  function addFruit(at:PIXI.Point): { type: number, sprite: PIXI.Sprite } {
    const type = random(0, cellTypesAmount - 1);
    const sprite = createFruitSprite(at.x, at.y, type);
    gridSprite.addChild(sprite);
    return { type, sprite };
  }

  async function enlargeGrid() {
    range(grid.length).forEach(col => {
      grid[col].unshift(addFruit(new PIXI.Point(col, -1)));
    });
    grid.push(range(grid[0].length).reverse().map(y => {
      return addFruit(new PIXI.Point(grid.length, -1 * (1 + y)));
    }));
    gridSprite.scale = gridSprite.scale.multiplyScalar(gridSprite.width/(gridSprite.width + CELL_WIDTH*gridSprite.scale.x));
    await synchFruitPositions();
  }
}

function App() {
  return (
    <div className="App">
      <MyComponent />
    </div>
  );
}

export default App;

export const MyComponent = () => {
  const gridRows = 3;
  const gridCols = 3;
  const [grid, setGrid] = useState<GameGrid>([[]]);
  const turns = useTurns();
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
    <div>
      <button onClick={newGame}>new game</button>
      You have {turns} turns left
    </div>
  </>;
};