import { Application, Assets, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { CompositeTilemap, Tilemap } from '@pixi/tilemap';
import { Button, FancyButton } from "@pixi/ui";

enum CellType {
  Water = 1,
  Sand = 2,
  Grass = 3,
};

const App: Component = () => {
  const initMapRows = 50;
  const initMapCols = 50;
  let insertCellType = CellType.Sand;
  let map: CellType[][] = [];
  for (let i = 0; i < initMapRows; ++i) {
    let row: CellType[] = [];
    for (let j = 0; j < initMapCols; ++j) {
      row.push(CellType.Water);
    }
    map.push(row);
  }
  //
  let circleIsland = false;
  if (circleIsland) {
    for (let j = 0; j < initMapCols; ++j) {
      let r = 0.8 * 0.5 * initMapCols;
      let d = r * r - (j - initMapCols/2) * (j - initMapCols/2);
      if (d < 0.0) {
        continue;
      }
      let h = Math.round(Math.sqrt(d));
      let i1 = initMapRows/2 - h;
      let i2 = initMapRows/2 + h;
      for (let i = i1; i <= i2; ++i) {
        if (i < 0 || i >= initMapRows) {
          continue;
        }
        map[i][j] = CellType.Sand;
      }
    }
  }
  //
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  const app = new Application();
  let babyMeltySprite: Sprite | undefined = undefined;
  let [ isLoading, setIsLoading, ] = createSignal(true);
  let tilemap: CompositeTilemap | undefined = undefined;
  onMount(() => {
    let canvas2 = canvas();
    if (canvas2 == undefined) {
      return;
    }
    let fixCanvasSize = () => {
      let rect = canvas2.getBoundingClientRect();
      canvas2.width = rect.width;
      canvas2.height = rect.height;
    };
    fixCanvasSize();
    let resizeObserver = new ResizeObserver(() => {
      fixCanvasSize();
    });
    resizeObserver.observe(canvas2);
    onCleanup(() => {
      resizeObserver.unobserve(canvas2);
      resizeObserver.disconnect();
    });
    (async () => {
      let rect = canvas2.getBoundingClientRect();
      app.init({
        canvas: canvas2,
        background: "lightblue",
        width: rect.width,
        height: rect.height,
      });
      const babyMeltyTexture = await Assets.load<Texture>("./baby_melty.png");
      babyMeltySprite = new Sprite(babyMeltyTexture);
      const sandTileset = await Assets.load<Texture>("./Sprite-0001.png");
      const grassTileset = await Assets.load<Texture>("./Sprite-0002.png");
      tilemap = new CompositeTilemap([
        sandTileset.source,
        grassTileset.source,
      ]);
      updateTilemap(tilemap, sandTileset, grassTileset, map);
      {
        app.stage.eventMode = "static";
        let pointerDownId: number | undefined = undefined;
        app.stage.on("pointerdown", (e) => {
          pointerDownId = e.pointerId;
        });
        app.stage.on("pointerup", (e) => {
          if (e.pointerId == pointerDownId) {
            pointerDownId = undefined;
          }
        });
        app.stage.on("pointermove", (e) => {
          if (tilemap == undefined) {
            return;
          }
          if (pointerDownId == undefined) {
            return;
          }
          let col = Math.floor((e.globalX + 32) / 64);
          let row = Math.floor((e.globalY + 32) / 64);
          if (col < 0 || col >= initMapCols) {
            return;
          }
          if (row < 0 || row >= initMapRows) {
            return;
          }
          let oldVal = map[row][col];
          let newVal = insertCellType;
          if (newVal === oldVal) {
            return;
          }
          map[row][col] = newVal;
          app.stage.removeChild(tilemap);
          tilemap = new CompositeTilemap([sandTileset.source, grassTileset.source]);
          updateTilemap(tilemap, sandTileset, grassTileset, map);
          app.stage.addChild(tilemap);
        });
      }
      app.stage.addChild(tilemap);
      babyMeltySprite.position.set(200, 200);
      babyMeltySprite.zIndex = 1;
      app.stage.sortableChildren = true;
      app.stage.addChild(babyMeltySprite);
      const createDefaultView = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x007bff) // Blue
          .stroke({ width: 2, color: 0xffffff })
          .circle(20, 30, 8); // Add a small decorative circle
      const createHoverView = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x0056b3) // Darker blue on hover
          .stroke({ width: 3, color: 0xffff00 }); // Yellow stroke on hover
      const createPressedView = () =>
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x003366); // Even darker blue when pressed
      const createDefaultViewY = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0xffeb3b) // Bright Yellow
          .stroke({ width: 2, color: 0x000000 }); // Black stroke
      const createHoverViewY = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0xfbc02d) // Darker yellow on hover
          .stroke({ width: 3, color: 0x555555 }); // Grey stroke on hover
      const createPressedViewY = () =>
          new Graphics()
              .rect(0, 0, 200, 60)
              .fill(0xf9a825); // Even darker yellow when pressed
      const createDefaultViewG = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x4CAF50) // Green
          .stroke({ width: 2, color: 0xFFFFFF }); // White stroke
      const createHoverViewG = () => 
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x388E3C) // Darker green on hover
          .stroke({ width: 3, color: 0xFFFF00 }); // Yellow stroke on hover for contrast
      const createPressedViewG = () =>
        new Graphics()
          .rect(0, 0, 200, 60)
          .fill(0x2E7D32);
      let waterButton = new FancyButton({
        defaultView: createDefaultView(),
        hoverView: createHoverView(),
        pressedView: createPressedView(),
        text: new Text({
          text: "Water",
        }),
        anchor: 0.0,
      });
      waterButton.position.set(50, 50);
      waterButton.onPress.connect(() => insertCellType = CellType.Water);
      waterButton.zIndex = 2;
      app.stage.addChild(waterButton);
      let sandButton = new FancyButton({
        defaultView: createDefaultViewY(),
        hoverView: createHoverViewY(),
        pressedView: createPressedViewY(),
        text: new Text({
          text: "Sand",
        }),
        anchor: 0.0,
      });
      sandButton.position.set(300, 50);
      sandButton.onPress.connect(() => insertCellType = CellType.Sand);
      sandButton.zIndex = 2;
      app.stage.addChild(sandButton);
      let grassButton = new FancyButton({
        defaultView: createDefaultViewG(),
        hoverView: createHoverViewG(),
        pressedView: createPressedViewG(),
        text: new Text({
          text: "Grass",
        }),
        anchor: 0.0,
      });
      grassButton.position.set(550, 50);
      grassButton.onPress.connect(() => insertCellType = CellType.Grass);
      grassButton.zIndex = 2;
      app.stage.addChild(grassButton);
      app.ticker.add((time) => {
        babyMeltySprite!.rotation += 0.1 * time.deltaTime;
      });
      setIsLoading(false);
    })();
  });
  return (
    <canvas
      ref={setCanvas}
      style={{
        "width": "100%",
        "height": "100%",
      }}
    />
  );
};

function updateTilemap(tilemap: CompositeTilemap, sandTileset: Texture, grassTileset: Texture, map: CellType[][]) {
  tilemap.clear();
  let atY = -32;
  for (let i = 0; i < map.length-1; ++i, atY += 64) {
    let row = map[i];
    let nextRow = map[i+1];
    let atX = -32;
    for (let j = 0; j < row.length-1; ++j, atX += 64) {
      let tlCell = row[j];
      let trCell = row[j+1];
      let blCell = nextRow[j];
      let brCell = nextRow[j+1];
      let sandIdx
        = (tlCell == CellType.Sand ? 1 : 0)
        | (trCell == CellType.Sand ? 2 : 0)
        | (blCell == CellType.Sand ? 4 : 0)
        | (brCell == CellType.Sand ? 8 : 0);
      let grassIdx
        = (tlCell == CellType.Grass ? 1 : 0)
        | (trCell == CellType.Grass ? 2 : 0)
        | (blCell == CellType.Grass ? 4 : 0)
        | (brCell == CellType.Grass ? 8 : 0);
      let idx: number;
      let tileset: Texture;
      if (grassIdx != 0) {
        idx = grassIdx;
        tileset = grassTileset;
      } else {
        idx = sandIdx;
        tileset = sandTileset;
      }
      let coords = tilesetCoords[idx];
      tilemap.tile(
        tileset,
        atX,
        atY,
        {
          u: coords[0],
          v: coords[1],
          tileWidth: 64,
          tileHeight: 64,
        },
      );
    }
  }
}

const tilesetCoords = [
  // 0
  [   0, 192, ],
  // 1
  [ 192, 192, ],
  // 2 
  [   0, 128, ],
  // 3
  [  64, 128, ],
  // 4
  [   0,   0, ],
  // 5
  [ 192, 128, ],
  // 6
  [ 128, 192, ],
  // 7
  [ 192,  64, ],
  // 8
  [  64, 192, ],
  // 9
  [   0,  64, ],
  // 10
  [  64,   0, ],
  // 11
  [ 128, 128, ],
  // 12
  [ 192,   0, ],
  // 13
  [ 128,   0, ],
  // 14
  [  64,  64, ],
  // 15
  [ 128,  64, ],
];

export default App;
