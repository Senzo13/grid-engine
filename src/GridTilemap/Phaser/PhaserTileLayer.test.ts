import { createPhaserTilemapStub } from "../../Utils/MockFactory/MockPhaserTilemap";
import { PhaserTileLayer } from "./PhaserTileLayer";
import * as Phaser from "phaser";
import { PhaserTile } from "./PhaserTile";

// Hack to get Phaser included at runtime
((_a) => {
  // do nothing
})(Phaser);

describe("PhaserTileLayer", () => {
  it("should get name", () => {
    const tilemap = createPhaserTilemapStub(new Map([["layer_name", [""]]]));
    const phaserTileLayer = new PhaserTileLayer(
      tilemap.getLayer("layer_name").tilemapLayer
    );
    expect(phaserTileLayer.getName()).toEqual("layer_name");
  });

  it("should get property", () => {
    const tilemap = createPhaserTilemapStub(new Map([["layer_name", [""]]]));
    const layerData = tilemap.getLayer("layer_name");
    layerData.properties.push({
      name: "some_prop",
      value: "some_val",
    });
    const phaserTileLayer = new PhaserTileLayer(layerData.tilemapLayer);
    expect(phaserTileLayer.getProperty("some_prop")).toEqual("some_val");
    expect(phaserTileLayer.getProperty("unknown")).toBe(undefined);
  });

  it("should detect property", () => {
    const tilemap = createPhaserTilemapStub(new Map([["layer_name", [""]]]));
    const layerData = tilemap.getLayer("layer_name");
    layerData.properties.push({
      name: "some_prop",
      value: "some_val",
    });
    const phaserTileLayer = new PhaserTileLayer(layerData.tilemapLayer);
    expect(phaserTileLayer.hasProperty("some_prop")).toBe(true);
    expect(phaserTileLayer.hasProperty("unknown")).toBe(false);
  });

  it("should detect char layer", () => {
    const tilemap = createPhaserTilemapStub(
      new Map([
        ["char_layer", [""]],
        ["no_char_layer", [""]],
      ])
    );
    const noCharLayerData = tilemap.getLayer("no_char_layer");
    const charLayerData = tilemap.getLayer("char_layer");
    noCharLayerData.properties = [];
    const noCharLayerPhaserTileLayer = new PhaserTileLayer(
      noCharLayerData.tilemapLayer
    );
    const charLayerPhaserTileLayer = new PhaserTileLayer(
      charLayerData.tilemapLayer
    );
    expect(noCharLayerPhaserTileLayer.isCharLayer()).toBe(false);
    expect(charLayerPhaserTileLayer.isCharLayer()).toBe(true);
  });

  it("should get data", () => {
    const tilemap = createPhaserTilemapStub(new Map([["char_layer", [".."]]]));
    const layerData = tilemap.getLayer("char_layer");
    const phaserTileLayer = new PhaserTileLayer(layerData.tilemapLayer);
    expect(phaserTileLayer.getData()).toEqual([
      [
        new PhaserTile(layerData.data[0][0]),
        new PhaserTile(layerData.data[0][1]),
      ],
    ]);
  });
});
