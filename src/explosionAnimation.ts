import * as PIXI from 'pixi.js';
import {range} from 'lodash';
import explosions from "./explosions.png";

let Explosion1FrameData: { [key: string]: PIXI.ISpritesheetFrameData } = {};
let Explosion2FrameData: { [key: string]: PIXI.ISpritesheetFrameData } = {};
let Explosion3FrameData: { [key: string]: PIXI.ISpritesheetFrameData } = {};

range(10).forEach(i => {
    Explosion1FrameData[`explosion1_${i}.png`] = {
    frame: {
      h: 64,
      w: 64,
      x: i * 64,
      y: 0
    }
  };
});

range(10).forEach(i => {
    Explosion2FrameData[`explosion2_${i}.png`] = {
    frame: {
      h: 64,
      w: 64,
      x: i * 64,
      y: 64*6
    }
  };
});

range(10).forEach(i => {
    Explosion3FrameData[`explosion3_${i}.png`] = {
    frame: {
      h: 64,
      w: 64,
      x: i * 64,
      y: 64*7
    }
  };
});

export const explosionSheet = new PIXI.Spritesheet(PIXI.Texture.from(explosions), {
  frames: {
    ...Explosion1FrameData,
    ...Explosion2FrameData,
    ...Explosion3FrameData
  },
  animations: {
    "explosion1": Object.keys(Explosion1FrameData),
    "explosion2": Object.keys(Explosion2FrameData),
    "explosion3": Object.keys(Explosion3FrameData)
  },
  meta: {
    scale: "1",
  }
});