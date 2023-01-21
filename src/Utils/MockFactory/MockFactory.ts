import { GridCharacter } from "../../GridCharacter/GridCharacter";
import { NumberOfDirections } from "../../GridEngine";
import { GridTilemap } from "../../GridTilemap/GridTilemap";
import { Vector2 } from "../Vector2/Vector2";
import { Random, MersenneTwister19937 } from "random-js";
import { LayerVecPos } from "../../Pathfinding/ShortestPathAlgorithm";
import {
  Orientation,
  Tile,
  TileLayer,
  Tilemap,
} from "../../GridTilemap/Tilemap";

export const LOWER_CHAR_LAYER = "lowerCharLayer";
export const HIGHER_CHAR_LAYER = "testCharLayer";
export const COLLISION_GROUP = "testCollisionGroup";

export class MockTilemap implements Tilemap {
  constructor(
    private layers: TileLayer[] = [],
    private orientation: Orientation = "orthogonal"
  ) {}

  getTileWidth(): number {
    return 10;
  }
  getTileHeight(): number {
    return 10;
  }
  getWidth(): number {
    return 20;
  }
  getHeight(): number {
    return 20;
  }
  getOrientation(): Orientation {
    return this.orientation;
  }
  getLayers(): TileLayer[] {
    return this.layers;
  }
  hasTileAt(x: number, y: number, layer?: string): boolean {
    return true;
  }
  getTileAt(x: number, y: number, layer?: string): Tile | undefined {
    return {
      getProperties: () => ({}),
    };
  }
  copyLayer(layer: TileLayer, newName: string, row: number): TileLayer {
    return new MockTileLayer();
  }
}

class MockTileLayer implements TileLayer {
  private depth = 0;
  constructor(
    private name: string = "tileLayerName",
    private properties: Record<string, string> = {},
    private height: number = 5,
    private width: number = 5,
    private scale: number = 1,
    private tilesets: string[] = [],
    private data: Tile[][] = []
  ) {}
  getProperties(): Record<string, string> {
    return this.properties;
  }
  getName(): string {
    return this.name;
  }
  getHeight(): number {
    return this.height;
  }
  getWidth(): number {
    return this.width;
  }
  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }
  setDepth(depth: number): void {
    this.depth = depth;
  }
  destroy(): void {}
  getTilesets(): string[] {
    return this.tilesets;
  }
  putTileAt(tile: number, x: number, y: number): void {}
  getData(): Tile[][] {
    return this.data;
  }
}

export function createSpriteMock() {
  return {
    x: 10,
    y: 12,
    displayWidth: 20,
    displayHeight: 40,
    width: 20,
    height: 20,
    setOrigin: jest.fn(),
    texture: {
      source: [{ width: 240 }],
    },
    setFrame: jest.fn(function (name) {
      this.frame.name = name;
    }),
    setDepth: jest.fn(),
    scale: 2,
    frame: {
      name: "1",
    },
  } as any;
}

export function createBlankLayerMock() {
  return {
    scale: 0,
    putTileAt: jest.fn(),
    setDepth: jest.fn(),
  };
}

export function createTilemapMock(blankLayerMock?) {
  if (!blankLayerMock) {
    blankLayerMock = createBlankLayerMock();
  }
  const layerData1 = createMockLayerData({
    name: "Layer 1",
    tilemapLayer: {
      setDepth: jest.fn(),
      scale: 3,
      tileset: "Cloud City",
    },
    properties: [
      {
        name: "ge_charLayer",
        value: LOWER_CHAR_LAYER,
      },
    ],
  });
  const layerData2 = createMockLayerData({
    name: "Layer 2",
    tilemapLayer: {
      setDepth: jest.fn(),
      scale: 3,
      tileset: "Cloud City",
    },
    properties: [
      {
        name: "ge_charLayer",
        value: HIGHER_CHAR_LAYER,
      },
    ],
  });
  return {
    layers: [layerData1, layerData2],
    tileWidth: 16,
    tileHeight: 16,
    width: 20,
    height: 30,
    getTileAt: jest.fn().mockReturnValue({}),
    hasTileAt: jest.fn().mockReturnValue(true),
    createBlankLayer: jest
      .fn()
      .mockReturnValue(createMockLayerData(blankLayerMock)),
  };
}

export function createMockLayerData(layerData: any): any {
  const tilemapLayer = {
    ...layerData.tilemapLayer,
    layer: {},
  };
  const newLayerData = {
    ...layerData,
    tilemapLayer,
  };
  tilemapLayer.layer = newLayerData;
  return newLayerData;
}

export function createMockLayer(layerData: any): TileLayer {
  return new MockTileLayer(
    layerData.name,
    layerData.properties,
    layerData.height,
    layerData.width,
    layerData.scale,
    layerData.tilesets,
    layerData.data
  );
}

export function layerPos(vec: Vector2, layer?: string): LayerVecPos {
  return {
    position: vec,
    layer: layer ?? LOWER_CHAR_LAYER,
  };
}

export function mockCharMap(
  tilemapMock: any, // TODO: replace when we have a Tilemap interface
  gridTilemap: GridTilemap,
  blockMap: string[]
) {
  tilemapMock.height = blockMap.length;
  tilemapMock.width = blockMap[0].length;
  let charCounter = 0;
  for (let row = 0; row < blockMap.length; row++) {
    for (let col = 0; col < blockMap[row].length; col++) {
      if (blockMap[row][col] === "c") {
        const gridCharacter = new GridCharacter(`mock_char_${charCounter}`, {
          tilemap: gridTilemap,
          speed: 3,
          collidesWithTiles: true,
          numberOfDirections: NumberOfDirections.FOUR,
          collisionGroups: [COLLISION_GROUP],
        });
        gridCharacter.setTilePosition({
          position: new Vector2(col, row),
          layer: LOWER_CHAR_LAYER,
        });
        gridTilemap.addCharacter(gridCharacter);
        charCounter++;
      }
    }
  }

  mockBlockMap(tilemapMock, blockMap);
}

export function mockRandomMap(
  tilemapMock: any,
  width: number,
  height: number,
  density = 0.1,
  seed = 12345
) {
  tilemapMock.width = width;
  tilemapMock.height = height;
  const random = new Random(MersenneTwister19937.seedWithArray([seed]));

  const map: string[] = [];
  for (let row = 0; row < height; row++) {
    const rowStr: string[] = [];
    for (let col = 0; col < height; col++) {
      const c = random.integer(0, 100) / 100 <= density ? "#" : ".";
      rowStr.push(c);
    }
    map[row] = rowStr.join("");
  }
  mockBlockMap(tilemapMock, map);
}

export function mockBlockMap(
  tilemapMock: any, // TODO: replace when we have a Tilemap interface
  blockMap: string[]
) {
  tilemapMock.hasTileAt.mockImplementation((x, y, _layerName) => {
    if (x < 0 || x >= blockMap[0].length) return false;
    if (y < 0 || y >= blockMap.length) return false;
    return true;
  });

  tilemapMock.getTileAt.mockImplementation((x, y, _layerName) => {
    if (x < 0 || x >= blockMap[0].length) return undefined;
    if (y < 0 || y >= blockMap.length) return undefined;
    switch (blockMap[y][x]) {
      case "#":
        return {
          properties: {
            ge_collides: true,
          },
        };
      case "→":
        return {
          properties: {
            ge_collide_up: true,
            ge_collide_right: true,
            ge_collide_down: true,
          },
        };
      case "←":
        return {
          properties: {
            ge_collide_up: true,
            ge_collide_down: true,
            ge_collide_left: true,
          },
        };
      case "↑":
        return {
          properties: {
            ge_collide_up: true,
            ge_collide_right: true,
            ge_collide_left: true,
          },
        };
      case "↓":
        return {
          properties: {
            ge_collide_right: true,
            ge_collide_down: true,
            ge_collide_left: true,
          },
        };
    }
    return {};
  });
}
export function mockLayeredMap(
  tilemapMock: any, // TODO: replace when we have a Tilemap interface
  blockMap: Map<string, string[]>
) {
  tilemapMock.hasTileAt.mockImplementation((x, y, layerName) => {
    const layer = blockMap.get(layerName);
    if (!layer) return false;
    if (x < 0 || x >= layer[0].length) return false;
    if (y < 0 || y >= layer.length) return false;
    return layer[y][x] != "#";
  });
}

export function createAllowedFn(map: string[]) {
  return ({ x, y }, _charLayer) => {
    if (x < 0 || x >= map[0].length) return false;
    if (y < 0 || y >= map.length) return false;
    return map[y][x] != "#";
  };
}
