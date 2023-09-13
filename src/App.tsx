import logo from './logo.svg';
import './App.css';
import { BLEND_MODES, BlurFilter, Filter, BaseTexture } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { Stage, Container, Sprite, Text, Graphics, useApp } from '@pixi/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { settings, SCALE_MODES } from 'pixi.js';
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

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const app = new PIXI.Application<HTMLCanvasElement>({ height: 640, backgroundAlpha: 0 });

function initGame(grid: GameGrid) {
  app.stage.removeChildren();
  const gridSprite = createGrid(grid);
  app.stage.addChild(gridSprite);
  let movedChild:PIXI.Sprite | undefined;
  let isDragging = false;
  let startDragLocation: PIXI.Point | undefined;

  app.stage.eventMode = 'static';

  app.stage.on('pointerup', () => {
    isDragging = false;
    if(movedChild){
      movedChild.alpha = 1;
      movedChild = undefined;
    }
  });
  app.stage.on('pointermove', (e) =>{
    if(movedChild && startDragLocation){
      if(getDistanceSquared(startDragLocation, e.global) > 2000){
        movedChild.position = movedChild.parent.toLocal(e.global);
      }
    }
  });

  function createGrid(grid: GameGrid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const width = 40;
    const height = 40;

    const g = new PIXI.Graphics();
    g.lineStyle({ color: "gray", width: 1, alpha: 0.2 });
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.drawRect(i * width, j * height, width, height);
      }
    }

    const gridContainer = new PIXI.Container();
    gridContainer.position = { x: 100, y: 20 };
    gridContainer.scale = { x: 1.5, y: 1.5 };

    gridContainer.addChild(g);
    grid.map((row, rowIndex) => row.map((cell, colIndex) => {
      const x = width * colIndex + 4;
      const y = height * rowIndex + 4;
      const fruit = PIXI.Sprite.from(FRUITS_IMAGES[cell.type]);
      fruit.eventMode = 'static';
      fruit.height = height;
      fruit.width = width;
      fruit.x = x + fruit.width/3;
      fruit.y = y + fruit.height/3;
      fruit.anchor.set(0.5,0.5);
      fruit.on('pointerdown', (e) => {
        isDragging = true;
        startDragLocation = e.global.clone();
        movedChild = fruit;
        fruit.alpha = 0.5;
      });
      gridContainer.addChild(fruit);
    }))
    return gridContainer;
  }
}

function getDistanceSquared(point1: PIXI.Point, point2: PIXI.Point){
  return Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2);
}

type gridItem = {
  type: number;
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

function GridDrawer({ grid }: { grid: GameGrid }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const width = 40;
  const height = 40;

  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.lineStyle({ color: "gray", width: 1 });
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.drawRect(i * width, j * height, width, height);
      }
    }
  }, [grid]);

  return <Container position={[100, 20]} anchor={[0.5, 0.5]} scale={[1.5, 1.5]}>
    <Graphics filters={[new BlurFilter(2)]} draw={draw} />
    {grid.map((row, rowIndex) => row.map((cell, colIndex) => {
      const x = width * colIndex + 4;
      const y = height * rowIndex + 4;
      return <DraggableFruit type={cell.type} height={height} width={width} x={x} y={y} />
    }))}
  </Container>
}

function DraggableFruit({ type, width, height, x, y }) {
  const dragProps = useDrag({ x, y });
  if (type >= FRUITS_IMAGES.length) {
    throw "NON EXISTING FRUIT NUMBER";
  }
  return <Sprite
    image={FRUITS_IMAGES[type]}
    {...dragProps}
  />
}

function useDrag({ x, y }) {
  const sprite = useRef<PIXI.Sprite | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x, y });

  const onDown = useCallback(() => setIsDragging(true), []);
  const onUp = useCallback(() => setIsDragging(false), []);
  const onMove = useCallback<PIXI.FederatedEventHandler<PIXI.FederatedPointerEvent>>(e => {
    console.log(e.global);
    if (isDragging && sprite.current) {
      setPosition(sprite.current.parent.toLocal(e.global));
    }
  }, [isDragging, setPosition]);

  return {
    ref: sprite,
    interactive: true,
    pointerdown: onDown,
    pointerup: onUp,
    pointerupoutside: onUp,
    pointermove: onMove,
    alpha: isDragging ? 0.5 : 1,
    anchor: 0,
    position,
  };
};