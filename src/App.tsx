import logo from './logo.svg';
import './App.css';
import PIXI, { BLEND_MODES, BlurFilter, Filter } from 'pixi.js';
import { Stage, Container, Sprite, Text, Graphics } from '@pixi/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { settings, SCALE_MODES } from 'pixi.js';
import React from 'react';
import { random, range } from 'lodash';
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

settings.SCALE_MODE = SCALE_MODES.NEAREST;

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
  useEffect(() => {
    newGame();
  }, [])

  function newGame() {
    setTurns(startingTurns);
    setGrid(
      range(gridRows).map(i => range(gridCols).map(i => ({ type: random(0, cellTypesAmount - 1) })))
    );
  }

  return <>
    <Stage options={{ backgroundColor: "lightgray" }} >
      <GridDrawer grid={grid} />
    </Stage>
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
      if (cell.type >= FRUITS_IMAGES.length) {
        throw "NON EXISTING FRUIT NUMBER";
      }
      return <Sprite
        anchor={{ x: 0, y: 0 }}
        position={[width * colIndex + 4, height * rowIndex + 4]} image={FRUITS_IMAGES[cell.type]}
      />
    }))}
  </Container>
}