import { ACTION_ATTACK, ACTION_MOVE, RANGE_MAP } from "./GameController";

export default class AIController {
  constructor(characterManager, positionCalculator, playerTypes, opponentTypes) {
    this.characterManager = characterManager;
    this.positionCalculator = positionCalculator;
    this.playerTypes = playerTypes;
    this.opponentTypes = opponentTypes;
  }

  findBestAction(computerCharacters) {
    for (const comp of computerCharacters) {
      const attackTarget = this.findAttackTarget(comp.position, comp.character);
      if (attackTarget) {
        return {
          fromIndex: comp.position,
          toIndex: attackTarget.position,
          type: ACTION_ATTACK
        };
      }
    }

    for (const comp of computerCharacters) {
      const moveAction = this.findMoveAction(comp.position, comp.character);
      if (moveAction) {
        return moveAction;
      }
    }

    return null;
  }

  findAttackTarget(fromIndex, character) {
    const attackRange = this.getAttackRange(character);
    const { player: enemies } = this.characterManager.getCharactersByTeam(
      this.playerTypes, this.opponentTypes
    );

    const targets = enemies.filter(enemy =>
      this.positionCalculator.calculateDistance(fromIndex, enemy.position) <= attackRange
    );

    if (targets.length === 0) return null;

    return targets.reduce((prev, curr) =>
      prev.character.health < curr.character.health ? prev : curr
    );
  }

  findMoveAction(fromIndex, character) {
    const { player: enemies } = this.characterManager.getCharactersByTeam(
      this.playerTypes, this.opponentTypes
    );

    if (enemies.length === 0) return null;

    const closestEnemy = enemies.reduce((prev, curr) => {
      const prevDist = this.positionCalculator.calculateDistance(fromIndex, prev.position);
      const currDist = this.positionCalculator.calculateDistance(fromIndex, curr.position);
      return currDist < prevDist ? curr : prev;
    });

    const nextPosition = this.positionCalculator.calculateNextPosition(
      fromIndex,
      closestEnemy.position,
      this.getMoveRange(character)
    );

    // Добавляем проверку, что мы действительно можем переместиться
    if (nextPosition !== fromIndex &&
        !this.characterManager.isPositionOccupied(nextPosition) &&
        this.positionCalculator.calculateDistance(fromIndex, nextPosition) <= this.getMoveRange(character)) {
      return {
        fromIndex,
        toIndex: nextPosition,
        type: ACTION_MOVE
      };
    }

    return null;
  }

  getMoveRange(character) {
    return RANGE_MAP[character.constructor.name]?.move ?? 1;
  }

  getAttackRange(character) {
    return RANGE_MAP[character.constructor.name]?.attack ?? 1;
  }
}