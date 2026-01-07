import { Application, Assets, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Component, createComputed, createMemo, createSignal, on, onCleanup, onMount } from "solid-js";
import { CompositeTilemap, Tilemap } from '@pixi/tilemap';
import { Button, FancyButton } from "@pixi/ui";
import { createStore } from "solid-js/store";

class NoTrack<A> {
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }
}

enum CellType {
  Water = 0,
  Sand = 1,
  Grass = 2,
};

const App: Component = () => {
  let [ state, setState, ] = createStore<{
    cameraPos: { x: number, y: number, },
    mousePos: NoTrack<{ x: number, y: number, }> | undefined,
    playerPos: NoTrack<{ x: number, y: number, }> | undefined,
  }>({
    cameraPos: { x: 32, y: 32, },
    mousePos: undefined,
    playerPos: new NoTrack({ x: 32.0, y: 32.0, }),
  });
  let cellPos = createMemo(
    () => {
      let mousePos = state.mousePos?.value;
      if (mousePos == undefined) {
        return undefined;
      }
      return {
        x: Math.floor((state.cameraPos.x + mousePos.x) / 64),
        y: Math.floor((state.cameraPos.y + mousePos.y) / 64),
      };
    },
    undefined,
    {
      equals(prev, next) {
        if (next == undefined) {
          return prev == undefined;
        } else if (prev == undefined) {
          return false;
        } else {
          return next.x == prev.x && next.y == prev.y;
        }
      },
    }
  );
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
      {
        let g = new Graphics()
          .rect(0, 0, 64, 64)
          .stroke({
            width: 2,
            color: 0xFF0000,
          });
        let hasG = false;
        createComputed(on(
          cellPos,
          (cellPos) => {
            if (cellPos == undefined) {
              if (hasG) {
                app.stage.removeChild(g);
                hasG = false;
              }
              return;
            }
            if (!hasG) {
              app.stage.addChild(g);
              hasG = true;
            }
            g.position.set(cellPos.x * 64 - state.cameraPos.x, cellPos.y * 64 - state.cameraPos.y);
          },
        ));
      }
      const babyMeltyTexture = await Assets.load<Texture>("./baby_melty.png");
      babyMeltySprite = new Sprite(babyMeltyTexture);
      const sandTileset = await Assets.load<Texture>("./Sprite-0003.png");
      const grassTileset = await Assets.load<Texture>("./Sprite-0004.png");
      tilemap = new CompositeTilemap([
        sandTileset.source,
        grassTileset.source,
      ]);
      tilemap.position.set(-state.cameraPos.x, -state.cameraPos.y);
      updateTilemap(tilemap, sandTileset, grassTileset, map);
      let placeTile = () => {
        let cellPos2 = cellPos();
        if (cellPos2 == undefined) {
          return;
        }
        let col = cellPos2.x;
        let row = cellPos2.y;
        if (col < 0 || col >= initMapCols) {
          return;
        }
        if (row < 0 || row >= initMapRows) {
          return;
        }
        if (tilemap == undefined) {
          return;
        }
        let oldVal = map[row][col];
        let newVal: CellType;
        if (insertCellType == CellType.Water) {
          newVal = 0;
        } else {
          newVal = oldVal | insertCellType;
        }
        if (newVal === oldVal) {
          return;
        }
        map[row][col] = newVal;
        let idx = app.stage.getChildIndex(tilemap);
        app.stage.removeChild(tilemap);
        tilemap = new CompositeTilemap([sandTileset.source, grassTileset.source]);
        tilemap.position.set(-state.cameraPos.x, -state.cameraPos.y);
        updateTilemap(tilemap, sandTileset, grassTileset, map);
        app.stage.addChildAt(tilemap, idx);
      };
      {
        app.stage.eventMode = "static";
        let pointerDownId: number | undefined = undefined;
        app.stage.on("pointerdown", (e) => {
          pointerDownId = e.pointerId;
          setState(
            "mousePos",
            new NoTrack({
              x: e.globalX,
              y: e.globalY,
            }),
          );
          placeTile();
        });
        app.stage.on("pointerup", (e) => {
          if (e.pointerId == pointerDownId) {
            pointerDownId = undefined;
          }
        });
        app.stage.on("pointermove", (e) => {
          setState(
            "mousePos",
            new NoTrack({
              x: e.globalX,
              y: e.globalY,
            }),
          );
          if (tilemap == undefined) {
            return;
          }
          if (pointerDownId == undefined) {
            return;
          }
          placeTile();
        });
      }
      app.stage.addChild(tilemap);
      babyMeltySprite.zIndex = 1;
      app.stage.sortableChildren = true;
      {
        let babyMeltySprite2 = babyMeltySprite;
        let hasPlayerPos = createMemo(() => state.playerPos != undefined);
        createComputed(() => {
          if (!hasPlayerPos()) {
            return;
          }
          let playerPos = () => state.playerPos!.value;
          app.stage.addChild(babyMeltySprite2);
          onCleanup(() => {
            app.stage.removeChild(babyMeltySprite2);
          });
          createComputed(on(
            playerPos,
            (playerPos) => {
              babyMeltySprite2.position.set(playerPos.x - state.cameraPos.x, playerPos.y - state.cameraPos.y);
            }
          ));
        });
      }
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
      waterButton.on("pointerdown", (e) => e.stopPropagation());
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
      sandButton.on("pointerdown", (e) => e.stopPropagation());
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
      grassButton.on("pointerdown", (e) => e.stopPropagation());
      grassButton.onPress.connect(() => insertCellType = CellType.Grass);
      grassButton.zIndex = 2;
      app.stage.addChild(grassButton);
      let leftDown = false;
      let rightDown = false;
      let upDown = false;
      let downDown = false;
      let keyDownListener = (e: KeyboardEvent) => {
        if (e.key == "ArrowLeft") {
          leftDown = true;
        } else if (e.key == "ArrowRight") {
          rightDown = true;
        } else if (e.key == "ArrowUp") {
          upDown = true;
        } else if (e.key == "ArrowDown") {
          downDown = true;
        }
      };
      let keyUpListener = (e: KeyboardEvent) => {
        if (e.key == "ArrowLeft") {
          leftDown = false;
        } else if (e.key == "ArrowRight") {
          rightDown = false;
        } else if (e.key == "ArrowUp") {
          upDown = false;
        } else if (e.key == "ArrowDown") {
          downDown = false;
        }
      };
      document.addEventListener("keydown", keyDownListener);
      document.addEventListener("keyup", keyUpListener);
      onCleanup(() => {
        document.removeEventListener("keydown", keyDownListener);
        document.removeEventListener("keyup", keyUpListener);
      });
      let fps = 60.0;
      let fpsDelayMs = 1000.0 / fps;
      let atT = 0.0;
      let outXY = { x: 0.0, y: 0.0, };
      app.ticker.add((time) => {
        atT += time.deltaMS;
        while (atT > 0.0) {
          atT -= fpsDelayMs;
          let mx = 0;
          let my = 0;
          if (leftDown) {
            mx -= 3;
          }
          if (rightDown) {
            mx += 3;
          }
          if (upDown) {
            my -= 3;
          }
          if (downDown) {
            my += 3;
          }
          if (mx != 0.0 || my != 0.0) {
            if (mx != 0.0 && my != 0.0) {
              mx *= Math.SQRT1_2;
              my *= Math.SQRT1_2;
            }
            babyMeltySprite!.position.x += mx;
            babyMeltySprite!.position.y += my;
            let changed = mapBoxCollisionResolution(
              map,
              babyMeltySprite!.position.x + state.cameraPos.x,
              babyMeltySprite!.position.y + state.cameraPos.y,
              babyMeltySprite!.width,
              babyMeltySprite!.height,
              outXY,
            );
            if (changed) {
              babyMeltySprite!.position.x = outXY.x - state.cameraPos.x;
              babyMeltySprite!.position.y = outXY.y - state.cameraPos.y;
            }
          }
        }
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

function mapBoxCollisionResolution(
  map: CellType[][],
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  outNewBoxPos: { x: number, y: number, },
): boolean {
  let changed = false;
  outNewBoxPos.x = boxX;
  outNewBoxPos.y = boxY;
  if (map.length == 0) {
    return changed;
  }
  let minCol = Math.floor(boxX / 64);
  let minRow = Math.floor(boxY / 64);
  let maxCol = Math.ceil((boxX + boxWidth) / 64);
  let maxRow = Math.ceil((boxY + boxHeight) / 64);
  if (maxRow < 0 || maxCol < 0) {
    return changed;
  }
  if (minCol >= map[0].length || minRow >= map.length) {
    return changed;
  }
  minCol = Math.max(minCol, 0);
  maxCol = Math.min(map[0].length-1, maxCol);
  minRow = Math.max(minRow, 0);
  maxRow = Math.min(map.length-1, maxRow);
  for (let i = minRow; i <= maxRow; ++i) {
    let row = map[i];
    let upRow = i > 0 ? map[i - 1] : undefined;
    let downRow = i < map.length - 1 ? map[i + 1] : undefined;
    for (let j = minCol; j <= maxCol; ++j) {
      let cell = row[j];
      let leftCell = j > 0 ? row[j - 1] : undefined;
      let rightCell = j < row.length-1 ? row[j + 1] : undefined;
      let upCell = upRow?.[j];
      let downCell = downRow?.[j];
      let changed2 = mapCellBoxCollisionResolution(
        i,
        j,
        cell,
        leftCell,
        rightCell,
        upCell,
        downCell,
        boxX,
        boxY,
        boxWidth,
        boxHeight,
        outNewBoxPos,
      );
      changed ||= changed2;
      boxX = outNewBoxPos.x;
      boxY = outNewBoxPos.y;
    }
  }
  return changed;
}

function mapCellBoxCollisionResolution(
  row: number,
  col: number,
  cell: CellType,
  leftCell: CellType | undefined,
  rightCell: CellType | undefined,
  upCell: CellType | undefined,
  downCell: CellType | undefined,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  outNewBoxPos: { x: number, y: number, },
): boolean {
  let cellX = col * 64;
  let cellY = row * 64;
  outNewBoxPos.x = boxX;
  outNewBoxPos.y = boxY;
  let atSolid = isCellSolid(cell);
  if (!atSolid) {
    return false;
  }
  let changed = false;
  let leftSolid = isCellSolid(leftCell);
  let rightSolid = isCellSolid(rightCell);
  let upSolid = isCellSolid(upCell);
  let downSolid = isCellSolid(downCell);
  let overlapX = Math.max(boxX + boxWidth - cellX, cellX + 64 - boxX);
  let overlapY = Math.max(boxY + boxHeight - cellY, cellY + 64 - boxY);
  let doXFirst = overlapX < overlapY;
  for (let i = 0; i < 2; ++i) {
    if (doXFirst && i == 0 || !doXFirst && i == 1) {
      if (boxX + boxWidth > cellX && boxX < cellX + 64) {
        if (!upSolid && boxY + boxHeight > cellY && boxY < cellY) {
          boxY = cellY - boxHeight;
          outNewBoxPos.y = boxY;
          changed = true;
        }
        if (!downSolid && boxY < cellY + 64 && boxY + boxHeight > cellY + 64) {
          boxY = cellY + 64;
          outNewBoxPos.y = boxY;
          changed = true;
        }
      }
    }
    if (!doXFirst && i == 0 || doXFirst && i == 1) {
      if (boxY + boxHeight > cellY && boxY < cellY + 64) {
        if (!leftSolid && boxX + boxWidth > cellX && boxX < cellX) {
          boxX = cellX - boxWidth;
          outNewBoxPos.x = boxX;
          changed = true;
        }
        if (!rightSolid && boxX < cellX + 64 && boxX + boxWidth > cellX + 64) {
          boxX = cellX + 64;
          outNewBoxPos.x = boxX;
          changed = true;
        }
      }
    }
  }
  return changed;
}

function isCellSolid(cell: CellType | undefined): boolean {
  if (cell == undefined) {
    return true;
  }
  if (cell == CellType.Water) {
    return true;
  }
  return false;
}

function updateTilemap(tilemap: CompositeTilemap, sandTileset: Texture, grassTileset: Texture, map: CellType[][]) {
  tilemap.clear();
  let atY = 32;
  for (let i = 0; i < map.length-1; ++i, atY += 64) {
    let row = map[i];
    let nextRow = map[i+1];
    let atX = 32;
    for (let j = 0; j < row.length-1; ++j, atX += 64) {
      let tlCell = row[j];
      let trCell = row[j+1];
      let blCell = nextRow[j];
      let brCell = nextRow[j+1];
      let sandIdx
        = (tlCell & CellType.Sand ? 1 : 0)
        | (trCell & CellType.Sand ? 2 : 0)
        | (blCell & CellType.Sand ? 4 : 0)
        | (brCell & CellType.Sand ? 8 : 0);
      let grassIdx
        = (tlCell & CellType.Grass ? 1 : 0)
        | (trCell & CellType.Grass ? 2 : 0)
        | (blCell & CellType.Grass ? 4 : 0)
        | (brCell & CellType.Grass ? 8 : 0);
      if (grassIdx != 15) {
        let coords = tilesetCoords[sandIdx];
        tilemap.tile(
          sandTileset,
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
      {
        let coords = tilesetCoords[grassIdx];
        tilemap.tile(
          grassTileset,
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
