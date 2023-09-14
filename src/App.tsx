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

const CELL_WIDTH = 40;
const CELL_HEIGHT = 40;
const MIN_DRAG_THRESH = 1000;

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const app = new PIXI.Application<HTMLCanvasElement>({ height: 640, backgroundAlpha: 0 });

function initGame(grid: GameGrid) {
  app.stage.removeChildren();
  const gridSprite = createGrid(grid);
  app.stage.addChild(gridSprite);
  let movedChild: PIXI.Sprite | undefined;
  let isDragging = false;
  let startDragLocation: PIXI.Point | undefined;
  let startFruitPosition: PIXI.Point | undefined;
  let pendingChange: {original: PIXI.Sprite, swapped: PIXI.Sprite, originalCell: PIXI.Point, swappedCell: PIXI.Point} | undefined;

  app.stage.eventMode = 'static';

  function commonPointerUp() {
    isDragging = false;
    if (movedChild) {
      if(pendingChange){
        const {originalCell, original, swapped, swappedCell} = pendingChange;
        gridAt(originalCell).sprite = swapped;
        const temp = gridAt(originalCell).type;
        gridAt(originalCell).type = gridAt(swappedCell).type;
        gridAt(swappedCell).sprite = original;
        gridAt(swappedCell).type = temp;
        pendingChange = undefined;
      } else {
        movedChild.position = startFruitPosition || movedChild.position;
      }
      movedChild.alpha = 1;
      movedChild = undefined;
      startFruitPosition = undefined;
    }
  }
  app.stage.on('pointerup', commonPointerUp);
  app.stage.on('pointerupoutside', commonPointerUp);

  const t = new PIXI.Text("hello");
  app.stage.addChild(t);

  app.stage.on('pointermove', (e) => {
    const mouseCell = globalToGridCell(e.global);
    t.text = mouseCell.toString();
    if (movedChild && startDragLocation && startFruitPosition) {
      if(pendingChange){
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
        if(canSwap(currentCell, targetCell)){
          movedChild.position = target;
          const swappedFruit = grid[targetCell.y][targetCell.x].sprite;
          if(swappedFruit){
            swappedFruit.position = startFruitPosition;
            pendingChange = {
              original: movedChild,
              swapped: swappedFruit,
              swappedCell: targetCell,
              originalCell: currentCell,
            }
          }
        }
      } else {
        movedChild.position = startFruitPosition;
      }
    }
  });

  function globalToGridCell(point: PIXI.Point){
    return new PIXI.Point(
      Math.floor((point.x - gridSprite.position.x) / CELL_WIDTH/gridSprite.scale.x),
      Math.floor((point.y - gridSprite.position.y) / CELL_WIDTH/gridSprite.scale.y)
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
    gridContainer.position = { x: 100, y: 20 };
    gridContainer.scale = { x: 1.5, y: 1.5 };

    gridContainer.addChild(g);
    grid.map((row, rowIndex) => row.map((cell, colIndex) => {
      const x = CELL_WIDTH * colIndex + 4;
      const y = CELL_HEIGHT * rowIndex + 4;
      const fruit = PIXI.Sprite.from(FRUITS_IMAGES[cell.type]);
      fruit.eventMode = 'static';
      fruit.height = CELL_HEIGHT;
      fruit.width = CELL_WIDTH;
      fruit.x = x + fruit.width / 3;
      fruit.y = y + fruit.height / 3;
      fruit.anchor.set(0.5, 0.5);
      fruit.on('pointerdown', (e) => {
        isDragging = true;
        startDragLocation = e.global.clone();
        movedChild = fruit;
        startFruitPosition = fruit.position.clone();
        fruit.alpha = 0.5;
      });
      grid[rowIndex][colIndex].sprite = fruit;
      gridContainer.addChild(fruit);
    }))
    return gridContainer;
  }

  function canSwap(fruitA: PIXI.Point, fruitB: PIXI.Point){
    return grid[fruitA.x][fruitA.y] !== undefined && grid[fruitB.x][fruitB.y] !== undefined && fruitA.subtract(fruitB).magnitudeSquared() == 1;
  }

  function gridAt(point: PIXI.Point){
    return grid[point.y][point.x];
  }
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
  const gridRows = 8;
  const gridCols = 8;
  const startingTurns = 10;
  const cellTypesAmount = 5;
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
    setGrid(
      range(gridRows).map(i => range(gridCols).map(i => ({ type: random(0, cellTypesAmount - 1) })))
    );
  }

  return <>
    <div ref={appContainer}></div>
    <button onClick={newGame}>new game</button>
  </>;
};