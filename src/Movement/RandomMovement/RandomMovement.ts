import { VectorUtils } from "../../Utils/VectorUtils";
import { GridCharacter } from "../../GridCharacter/GridCharacter";
import { Direction, DirectionVectors } from "../../Direction/Direction";
import { Movement } from "../Movement";

const Vector2 = Phaser.Math.Vector2;
type Vector2 = Phaser.Math.Vector2;

export class RandomMovement implements Movement {
  private character: GridCharacter;
  private delayLeft: number;
  private initialRow: number;
  private initialCol: number;
  private stepSize: number;
  private stepsWalked: number;
  private currentMovementDirection: Direction;
  constructor(private delay = 0, private radius = -1) {}

  setCharacter(character: GridCharacter): void {
    this.character = character;
    this.delayLeft = this.delay;
    this.initialRow = character.getTilePos().y;
    this.initialCol = character.getTilePos().x;
    this.stepSize = this.getRandomInt(this.radius) + 1;
    this.stepsWalked = 0;
    this.currentMovementDirection = Direction.NONE;
  }

  update(delta: number): void {
    if (this.shouldContinueWalkingCurrentDirection()) {
      this.stepsWalked++;
      this.character.move(this.currentMovementDirection);
    } else {
      this.delayLeft -= delta;
      if (this.delayLeft <= 0) {
        this.delayLeft = this.delay;
        const dir = this.getFreeRandomDirection();
        this.character.move(dir);
        this.currentMovementDirection = dir;
        this.stepsWalked = 1;
        this.stepSize = this.getRandomInt(this.radius) + 1;
      }
    }
  }

  private shouldContinueWalkingCurrentDirection(): boolean {
    return (
      this.stepsWalked < this.stepSize &&
      this.currentMovementDirection !== Direction.NONE &&
      !this.character.isBlockingDirection(this.currentMovementDirection) &&
      this.isWithinRadius(this.currentMovementDirection)
    );
  }

  private getFreeDirections(): Direction[] {
    const directions = [
      Direction.UP,
      Direction.RIGHT,
      Direction.DOWN,
      Direction.LEFT,
    ];

    const unblocked = directions.filter(
      (dir) => !this.character.isBlockingDirection(dir)
    );

    return unblocked.filter((dir) => this.isWithinRadius(dir));
  }

  private isWithinRadius(dir: Direction) {
    if (this.radius == -1) return true;
    const dist = VectorUtils.manhattanDistance(
      this.character.getTilePos().add(DirectionVectors[dir]),
      new Vector2(this.initialCol, this.initialRow)
    );

    return dist <= this.radius;
  }

  private getFreeRandomDirection(): Direction {
    const freeDirections = this.getFreeDirections();
    if (freeDirections.length == 0) return Direction.NONE;
    return freeDirections[this.getRandomInt(freeDirections.length)];
  }

  private getRandomInt(max: number): number {
    return Math.floor(Math.random() * Math.floor(max));
  }
}
