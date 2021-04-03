import { VectorUtils } from "./../Utils/VectorUtils";
import {
  DirectionVectors,
  DirectionVectorsIsometric,
  oppositeDirection,
} from "./../Direction/Direction";
import { Direction } from "../Direction/Direction";
import * as Phaser from "phaser";
import { GridTilemap } from "../GridTilemap/GridTilemap";
import { Subject } from "rxjs";
import { WalkingAnimationMapping } from "../GridEngine";

const Vector2 = Phaser.Math.Vector2;
type Vector2 = Phaser.Math.Vector2;

export interface FrameRow {
  leftFoot: number;
  standing: number;
  rightFoot: number;
}

export type CharacterIndex = number;

export interface PositionChange {
  exitTile: Vector2;
  enterTile: Vector2;
}

export interface CharConfig {
  sprite: Phaser.GameObjects.Sprite;
  tilemap: GridTilemap;
  tileSize: Vector2;
  speed: number;
  walkingAnimationEnabled: boolean;
  isometric: boolean;
  walkingAnimationMapping?: CharacterIndex | WalkingAnimationMapping;
  container?: Phaser.GameObjects.Container;
  offsetX?: number;
  offsetY?: number;
}

export class GridCharacter {
  private static readonly FRAMES_CHAR_ROW = 3;
  private static readonly FRAMES_CHAR_COL = 4;
  private directionToFrameRow: { [key in Direction]?: number } = {
    [Direction.DOWN]: 0,
    [Direction.LEFT]: 1,
    [Direction.RIGHT]: 2,
    [Direction.UP]: 3,
  };
  private movementDirection = Direction.NONE;
  private speedPixelsPerSecond: Vector2;
  private tileSizePixelsWalked: Vector2 = Vector2.ZERO.clone();
  private lastFootLeft = false;
  private _tilePos = new Vector2(0, 0);
  private prevTilePos = new Vector2(0, 0);
  private sprite: Phaser.GameObjects.Sprite;
  private container?: Phaser.GameObjects.Container;
  private tilemap: GridTilemap;
  private tileDistance: Vector2;
  private tileSize: Vector2;
  private speed: number;
  private characterIndex = 0;
  private walkingAnimationMapping: WalkingAnimationMapping;
  private walkingAnimation: boolean;
  private customOffset: Vector2;
  private movementStarted$ = new Subject<Direction>();
  private movementStopped$ = new Subject<Direction>();
  private directionChanged$ = new Subject<Direction>();
  private positionChanged$ = new Subject<PositionChange>();
  private lastMovementImpulse = Direction.NONE;
  private facingDirection: Direction = Direction.DOWN;
  private isIsometric: boolean;

  constructor(private id: string, config: CharConfig) {
    if (typeof config.walkingAnimationMapping == "number") {
      this.characterIndex = config.walkingAnimationMapping;
    } else {
      this.walkingAnimationMapping = config.walkingAnimationMapping;
    }

    this.sprite = config.sprite;
    this.sprite.setOrigin(0, 0);
    this.container = config.container;
    this.tilemap = config.tilemap;
    this.speed = config.speed;
    this.walkingAnimation = config.walkingAnimationEnabled;
    this.customOffset = new Vector2(config.offsetX || 0, config.offsetY || 0);
    this.isIsometric = config.isometric;
    this.tileSize = config.tileSize.clone();
    this.tileDistance = config.tileSize.clone();
    if (this.isIsometric) {
      this.tileDistance = VectorUtils.scalarMult(this.tileDistance, 0.5);
    }

    if (this.walkingAnimation) {
      this.sprite.setFrame(this.framesOfDirection(Direction.DOWN).standing);
    }

    this.speedPixelsPerSecond = VectorUtils.scalarMult(
      this.tileDistance,
      this.speed
    );
    this.updateZindex();
  }

  getId(): string {
    return this.id;
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  setWalkingAnimationMapping(
    walkingAnimationMapping: WalkingAnimationMapping
  ): void {
    this.walkingAnimationMapping = walkingAnimationMapping;
  }

  setTilePosition(tilePosition: Phaser.Math.Vector2): void {
    if (this.isMoving()) return;
    this.tilePos = tilePosition;
    this.updateZindex();
    this.setPosition(
      tilePosition
        .clone()
        .multiply(this.tileDistance)
        .add(this.getOffset())
        .add(this.customOffset)
    );
  }

  getTilePos(): Vector2 {
    return this.tilePos;
  }

  move(direction: Direction): void {
    this.lastMovementImpulse = direction;
    if (direction == Direction.NONE) return;
    if (this.isMoving()) return;
    if (this.isBlockingDirection(direction)) {
      this.facingDirection = direction;
      if (this.walkingAnimation) {
        this.setStandingFrame(direction);
      }
      this.directionChanged$.next(direction);
    } else {
      this.startMoving(direction);
    }
  }

  update(delta: number): void {
    if (this.isMoving()) {
      this.updateCharacterPosition(delta);
    }
    this.lastMovementImpulse = Direction.NONE;
  }

  getMovementDirection(): Direction {
    return this.movementDirection;
  }

  isBlockingTile(tilePos: Vector2): boolean {
    return this._tilePos.equals(tilePos) || this.prevTilePos.equals(tilePos);
  }

  isBlockingDirection(direction: Direction): boolean {
    if (direction == Direction.NONE) return false;
    return (
      this.tilemap.hasBlockingTile(
        this.tilePosInDirection(direction),
        oppositeDirection(direction)
      ) || this.tilemap.hasBlockingChar(this.tilePosInDirection(direction))
    );
  }

  isMoving(): boolean {
    return this.movementDirection != Direction.NONE;
  }

  turnTowards(direction: Direction): void {
    if (this.isMoving()) return;
    if (direction == Direction.NONE) return;
    this.facingDirection = direction;
    if (this.walkingAnimation) {
      this.sprite.setFrame(this.framesOfDirection(direction).standing);
    }
  }

  getFacingDirection(): Direction {
    return this.facingDirection;
  }

  movementStarted(): Subject<Direction> {
    return this.movementStarted$;
  }

  movementStopped(): Subject<Direction> {
    return this.movementStopped$;
  }

  directionChanged(): Subject<Direction> {
    return this.directionChanged$;
  }

  positionChanged(): Subject<PositionChange> {
    return this.positionChanged$;
  }

  private getOffset(): Vector2 {
    const offsetX =
      this.tileSize.x / 2 -
      Math.floor((this.sprite.width * this.sprite.scale) / 2);
    const offsetY = -(this.sprite.height * this.sprite.scale) + this.tileSize.y;
    return new Vector2(offsetX, offsetY);
  }

  private get tilePos() {
    return this._tilePos.clone();
  }

  private set tilePos(newTilePos: Phaser.Math.Vector2) {
    this._tilePos.x = newTilePos.x;
    this._tilePos.y = newTilePos.y;
  }

  private updateZindex() {
    const gameObject = this.container || this.sprite;
    gameObject.setDepth(GridTilemap.FIRST_PLAYER_LAYER + this.tilePos.y);
  }

  private setStandingFrame(direction: Direction): void {
    if (!this.isCurrentFrameStanding(direction)) {
      this.lastFootLeft = !this.lastFootLeft;
    }
    this.sprite.setFrame(this.framesOfDirection(direction).standing);
  }

  private setWalkingFrame(direction: Direction): void {
    const frameRow = this.framesOfDirection(direction);
    this.sprite.setFrame(
      this.lastFootLeft ? frameRow.rightFoot : frameRow.leftFoot
    );
  }

  private setPosition(position: Phaser.Math.Vector2): void {
    const gameObject = this.container || this.sprite;
    gameObject.x = position.x;
    gameObject.y = position.y;
  }

  private getPosition(): Phaser.Math.Vector2 {
    const gameObject = this.container || this.sprite;
    return new Phaser.Math.Vector2(gameObject.x, gameObject.y);
  }

  private isCurrentFrameStanding(direction: Direction): boolean {
    return (
      Number(this.sprite.frame.name) ==
      this.framesOfDirection(direction).standing
    );
  }

  private framesOfDirection(direction: Direction): FrameRow {
    if (this.walkingAnimationMapping) {
      return this.getFramesForAnimationMapping(direction);
    }
    return this.getFramesForCharIndex(direction);
  }

  private getFramesForAnimationMapping(direction: Direction): FrameRow {
    return this.walkingAnimationMapping[direction];
  }

  private getFramesForCharIndex(direction: Direction): FrameRow {
    const charsInRow =
      this.sprite.texture.source[0].width /
      this.sprite.width /
      GridCharacter.FRAMES_CHAR_ROW;
    const playerCharRow = Math.floor(this.characterIndex / charsInRow);
    const playerCharCol = this.characterIndex % charsInRow;
    const framesInRow = charsInRow * GridCharacter.FRAMES_CHAR_ROW;
    const framesInSameRowBefore = GridCharacter.FRAMES_CHAR_ROW * playerCharCol;
    const rows =
      this.directionToFrameRow[direction] +
      playerCharRow * GridCharacter.FRAMES_CHAR_COL;
    const startFrame = framesInSameRowBefore + rows * framesInRow;
    return {
      rightFoot: startFrame,
      standing: startFrame + 1,
      leftFoot: startFrame + 2,
    };
  }

  private startMoving(direction: Direction): void {
    this.movementStarted$.next(direction);
    this.movementDirection = direction;
    this.facingDirection = direction;
    this.updateTilePos();
  }

  private updateTilePos() {
    this.prevTilePos = this.tilePos.clone();
    const newTilePos = this.tilePos.add(
      DirectionVectors[this.movementDirection]
    );
    this.positionChanged$.next({
      exitTile: this.tilePos,
      enterTile: newTilePos,
    });
    this.tilePos = newTilePos;
  }

  private tilePosInDirection(direction: Direction): Vector2 {
    return this.getTilePos().add(DirectionVectors[direction]);
  }

  private updateCharacterPosition(delta: number): void {
    const pixelsToWalkThisUpdate = this.getSpeedPerDelta(delta);

    if (!this.willCrossTileBorderThisUpdate(pixelsToWalkThisUpdate)) {
      this.moveCharacterSprite(pixelsToWalkThisUpdate);
    } else if (this.shouldContinueMoving()) {
      this.moveCharacterSprite(pixelsToWalkThisUpdate);
      this.updateTilePos();
    } else {
      this.moveCharacterSpriteRestOfTile();
      this.stopMoving();
    }
  }

  private shouldContinueMoving(): boolean {
    return (
      this.movementDirection == this.lastMovementImpulse &&
      !this.isBlockingDirection(this.lastMovementImpulse)
    );
  }

  private getSpeedPerDelta(delta: number): Vector2 {
    const deltaInSeconds = delta / 1000;
    return this.speedPixelsPerSecond
      .clone()
      .multiply(new Vector2(deltaInSeconds, deltaInSeconds))
      .multiply(this.getDirectionVecs()[this.movementDirection]);
  }

  private willCrossTileBorderThisUpdate(
    pixelsToWalkThisUpdate: Vector2
  ): boolean {
    return (
      this.tileSizePixelsWalked.x + Math.abs(pixelsToWalkThisUpdate.x) >=
        this.tileDistance.x ||
      this.tileSizePixelsWalked.y + Math.abs(pixelsToWalkThisUpdate.y) >=
        this.tileDistance.y
    );
  }

  private moveCharacterSpriteRestOfTile(): void {
    this.moveCharacterSprite(
      this.tileDistance
        .clone()
        .subtract(this.tileSizePixelsWalked)
        .multiply(this.getDirectionVecs()[this.movementDirection])
    );
  }

  private getDirectionVecs(): { [key in Direction]?: Vector2 } {
    if (this.isIsometric) {
      return DirectionVectorsIsometric;
    }
    return DirectionVectors;
  }

  private moveCharacterSprite(speed: Vector2): void {
    const newPlayerPos = this.getPosition().add(speed);
    this.setPosition(newPlayerPos);
    this.tileSizePixelsWalked.x += Math.abs(speed.x);
    this.tileSizePixelsWalked.y += Math.abs(speed.y);
    if (this.walkingAnimation) {
      this.updateCharacterFrame();
    }
    this.tileSizePixelsWalked.x %= this.tileDistance.x;
    this.tileSizePixelsWalked.y %= this.tileDistance.y;
    if (this.hasWalkedHalfATile()) {
      this.updateZindex();
    }
  }

  private stopMoving(): void {
    this.movementStopped$.next(this.movementDirection);
    this.movementDirection = Direction.NONE;
    this.prevTilePos = this.tilePos.clone();
  }

  private updateCharacterFrame(): void {
    if (this.hasWalkedHalfATile()) {
      this.setStandingFrame(this.movementDirection);
    } else {
      this.setWalkingFrame(this.movementDirection);
    }
  }

  private hasWalkedHalfATile(): boolean {
    return (
      this.tileSizePixelsWalked.x > this.tileDistance.x / 2 ||
      this.tileSizePixelsWalked.y > this.tileDistance.y / 2
    );
  }
}
