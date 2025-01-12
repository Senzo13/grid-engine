import { filter, takeUntil, take } from "rxjs/operators";
import { GridTilemap } from "../../GridTilemap/GridTilemap";
import { GridCharacter } from "../../GridCharacter/GridCharacter";
import { TargetMovement } from "../TargetMovement/TargetMovement";
import { Movement, MovementInfo } from "../Movement";
import { Vector2 } from "../../Utils/Vector2/Vector2";
import { CharLayer, Position } from "../../GridEngine";
import { NoPathFoundStrategy } from "../../Pathfinding/NoPathFoundStrategy";

export class FollowMovement implements Movement {
  private targetMovement?: TargetMovement;

  constructor(
    private character: GridCharacter,
    private gridTilemap: GridTilemap,
    private charToFollow: GridCharacter,
    private distance = 0,
    private noPathFoundStrategy: NoPathFoundStrategy = NoPathFoundStrategy.STOP,
    private maxPathLength = Infinity
  ) {
    this.character = character;
    this.updateTarget(
      this.charToFollow.getTilePos().position,
      this.charToFollow.getTilePos().layer
    );
    this.charToFollow
      .positionChangeStarted()
      .pipe(
        takeUntil(
          this.character.autoMovementSet().pipe(
            filter((movement) => movement !== this),
            take(1)
          )
        )
      )
      .subscribe(({ enterTile, enterLayer }) => {
        this.updateTarget(enterTile, enterLayer);
      });
  }

  update(delta: number): void {
    this.targetMovement?.update(delta);
  }

  getInfo(): MovementInfo {
    return {
      type: "Follow",
      config: {
        charToFollow: this.charToFollow.getId(),
        distance: this.distance,
        noPathFoundStrategy: this.noPathFoundStrategy,
        maxPathLength: this.maxPathLength,
      },
    };
  }

  private updateTarget(targetPos: Position, targetLayer: CharLayer): void {
    this.targetMovement = new TargetMovement(
      this.character,
      this.gridTilemap,
      {
        position: new Vector2(targetPos),
        layer: targetLayer,
      },
      {
        distance: this.distance + 1,
        config: {
          noPathFoundStrategy: this.noPathFoundStrategy,
          maxPathLength: this.maxPathLength,
        },
        ignoreBlockedTarget: true,
      }
    );
  }
}
