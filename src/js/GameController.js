import themes from './themes';
import cursors from './cursors';
import Bowman from './characters/Bowman';
import Vampire from './characters/Vampire';
import Undead from './characters/Undead';
import Magician from './characters/Magician';
import Daemon from './characters/Daemon';
import Swordsman from './characters/Swordsman';
import { generateTeam } from './generators';
import PositionedCharacter from './PositionedCharacter';
import GamePlay from './GamePlay';
import GameState from './GameState';

// Константы для команд
const TEAM_PLAYER = 'player';
const TEAM_COMPUTER = 'computer';

// Константы для типов действий
const ACTION_ATTACK = 'attack';
const ACTION_MOVE = 'move';

const RANGE_MAP = {
  Swordsman: {
    move: 4, attack: 1
  },
  Undead: {
    move: 4, attack: 1
  },
  Bowman: {
    move: 2, attack: 2
  },
  Vampire: {
    move: 2, attack: 2
  },
  Magician: {
    move: 1, attack: 4
  },
  Daemon: {
    move: 1, attack: 4
  }
};

class PositionCalculator {
  constructor(boardSize, characterManager) {
    this.boardSize = boardSize;
    this.characterManager = characterManager;
  }

  calculateDistance(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / this.boardSize);
    const fromCol = fromIndex % this.boardSize;
    const toRow = Math.floor(toIndex / this.boardSize);
    const toCol = toIndex % this.boardSize;
    return Math.max(Math.abs(fromRow - toRow), Math.abs(fromCol - toCol));
  }

  getBorderColumnsIndices(side = 'first') {
    const indices = [];
    const isFirstColumn = side === 'first';

    for (let row = 0; row < this.boardSize; row++) {
      const baseIndex = row * this.boardSize;
      indices.push(
        baseIndex + (isFirstColumn ? 0 : this.boardSize - 2),
        baseIndex + (isFirstColumn ? 1 : this.boardSize - 1)
      );
    }
    return indices;
  }

  calculateNextPosition(fromIndex, toIndex, moveRange) {
    const fromRow = Math.floor(fromIndex / this.boardSize);
    const fromCol = fromIndex % this.boardSize;
    const toRow = Math.floor(toIndex / this.boardSize);
    const toCol = toIndex % this.boardSize;

    const deltaRow = toRow - fromRow;
    const deltaCol = toCol - fromCol;

    const distance = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));
    if (distance === 0) return fromIndex;

    // Пробуем разные варианты шагов, начиная с максимально возможного
    for (let step = Math.min(moveRange, distance); step > 0; step--) {
      const stepRow = Math.round((deltaRow / distance) * step);
      const stepCol = Math.round((deltaCol / distance) * step);

      const newRow = Math.max(0, Math.min(this.boardSize - 1, fromRow + stepRow));
      const newCol = Math.max(0, Math.min(this.boardSize - 1, fromCol + stepCol));

      const newIndex = newRow * this.boardSize + newCol;

      // Проверяем, что позиция свободна и не является исходной
      if (newIndex !== fromIndex && !this.characterManager.isPositionOccupied(newIndex)) {
        return newIndex;
      }
    }

    // Если не нашли подходящую позицию, остаемся на месте
    return fromIndex;
  }
}

class CharacterManager {
  constructor() {
    this.charactersMap = new Map();
    this.positionedCharacters = [];
  }

  addCharacter(character, position) {
    this.charactersMap.set(position, character);
    this.positionedCharacters.push(new PositionedCharacter(character, position));
  }

  removeCharacter(position) {
    this.charactersMap.delete(position);
    this.positionedCharacters = this.positionedCharacters.filter(
      posChar => posChar.position !== position
    );
  }

  moveCharacter(fromIndex, toIndex) {
    const characterPos = this.positionedCharacters.find(
      posChar => posChar.position === fromIndex
    );

    if (!characterPos) return false;

    this.charactersMap.delete(fromIndex);
    this.charactersMap.set(toIndex, characterPos.character);
    characterPos.position = toIndex;
    return true;
  }

  getCharacterAt(position) {
    return this.charactersMap.get(position);
  }

  isPositionOccupied(position) {
    return this.charactersMap.has(position);
  }

  getCharactersByTeam(playerTypes, opponentTypes) {
    return {
      player: this.positionedCharacters.filter(pc =>
        playerTypes.some(type => pc.character instanceof type)
      ),
      computer: this.positionedCharacters.filter(pc =>
        opponentTypes.some(type => pc.character instanceof type)
      )
    };
  }
}

class AIController {
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

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    
    this.playerTypes = [Bowman, Swordsman, Magician];
    this.opponentTypes = [Daemon, Undead, Vampire];
    
    this.characterManager = new CharacterManager();
    this.positionCalculator = new PositionCalculator(gamePlay.boardSize, this.characterManager);
    this.aiController = new AIController(
      this.characterManager, 
      this.positionCalculator,
      this.playerTypes,
      this.opponentTypes
    );
    
    this.selectedCharacterIndex = null;
    this.activeSelectCell = -1;
    this.currentTurn = TEAM_PLAYER;
  }

  init() {
    this.gamePlay.drawUi(themes.prairie);
    this.createTeams();
    this.setupEventListeners();

    // Инициализируем значения по умолчанию
    this.selectedCharacterIndex = null;
    this.activeSelectCell = -1;

    const savedState = this.stateService.load();
    if (savedState?.nextTurn) {
      this.currentTurn = savedState.nextTurn;
    }

    this.saveGameState();

    if (this.currentTurn === TEAM_COMPUTER) {
      this.performComputerTurn();
    }
  }

  setupEventListeners() {
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
  }

  async onCellClick(index) {
    if (this.currentTurn !== TEAM_PLAYER) return;

    const character = this.characterManager.getCharacterAt(index);

    if (this.selectedCharacterIndex !== null) {
      await this.handleActionWithSelectedCharacter(index);
    } else {
      this.handleCharacterSelection(index, character);
    }
  }

  async handleActionWithSelectedCharacter(index) {
    const selectedChar = this.characterManager.getCharacterAt(this.selectedCharacterIndex);

    // Проверяем, что выбранный персонаж все еще существует
    if (!selectedChar) {
      this.deselectAllCells();
      return;
    }

    const character = this.characterManager.getCharacterAt(index);
    const distance = this.positionCalculator.calculateDistance(this.selectedCharacterIndex, index);

    if (character && this.isPlayerCharacter(character)) {
      this.selectCharacter(index);
      return;
    }

    if (!character && this.canMoveTo(selectedChar, this.selectedCharacterIndex, index)) {
      await this.moveCharacter(this.selectedCharacterIndex, index);
      await this.endPlayerTurn();
      return;
    }

    if (character && !this.isPlayerCharacter(character) &&
      this.canAttack(selectedChar, this.selectedCharacterIndex, index)) {
      await this.attackCharacter(this.selectedCharacterIndex, index);
      await this.endPlayerTurn();
      return;
    }

    GamePlay.showError('Недопустимое действие');
    this.gamePlay.setCursor(cursors.notallowed);
  }

  handleCharacterSelection(index, character) {
    if (character && this.isPlayerCharacter(character)) {
      this.selectCharacter(index);
    }
  }

  selectCharacter(index) {
  // Снимаем выделение только если есть предыдущая выделенная ячейка
    if (this.selectedCharacterIndex !== null && this.selectedCharacterIndex !== -1) {
      this.gamePlay.deselectCell(this.selectedCharacterIndex);
    }

    this.selectedCharacterIndex = index;

    // Выделяем новую ячейку только если индекс валидный
    if (index !== null && index !== -1) {
      this.gamePlay.selectCell(index);
    }
  }

  onCellEnter(index) {
    const character = this.characterManager.getCharacterAt(index);

    if (character) {
      this.gamePlay.showCellTooltip(this.formatCharacterInfo(character), index);
    }

    if (this.selectedCharacterIndex === null) {
      this.handleHoverWithoutSelection(character);
    } else {
      this.handleHoverWithSelection(index, character);
    }
  }

  handleHoverWithoutSelection(character) {
    this.gamePlay.setCursor(
      character && this.isPlayerCharacter(character) ? cursors.pointer : cursors.notallowed
    );
  }

  handleHoverWithSelection(index, targetCharacter) {
    const selectedChar = this.characterManager.getCharacterAt(this.selectedCharacterIndex);
    const distance = this.positionCalculator.calculateDistance(this.selectedCharacterIndex, index);

    if (targetCharacter && this.isPlayerCharacter(targetCharacter)) {
      this.gamePlay.setCursor(cursors.pointer);
    } else if (targetCharacter && !this.isPlayerCharacter(targetCharacter)) {
      this.handleEnemyHover(index, selectedChar, distance);
    } else {
      this.handleEmptyCellHover(index, selectedChar, distance);
    }

    this.updateActiveSelection(index);
  }

  handleEnemyHover(index, selectedChar, distance) {
    if (distance <= this.getAttackRange(selectedChar)) {
      this.gamePlay.setCursor(cursors.crosshair);
      this.gamePlay.selectCell(index, 'red');
    } else {
      this.gamePlay.setCursor(cursors.notallowed);
    }
  }

  handleEmptyCellHover(index, selectedChar, distance) {
    if (distance <= this.getMoveRange(selectedChar)) {
      this.gamePlay.setCursor(cursors.pointer);
      this.gamePlay.selectCell(index, 'green');
    } else {
      this.gamePlay.setCursor(cursors.notallowed);
    }
  }

  updateActiveSelection(index) {
  // Снимаем выделение только если есть активная ячейка и она валидная
    if (this.activeSelectCell !== -1 && this.activeSelectCell !== null) {
      this.gamePlay.deselectCell(this.activeSelectCell);
    }

    this.activeSelectCell = index;

    // Выделяем новую ячейку только если индекс валидный
    if (index !== -1 && index !== null) {
    // Цвет выделения будет установлен в методах handleEnemyHover/handleEmptyCellHover
    }
  }

  onCellLeave(index) {
    this.gamePlay.hideCellTooltip(index);
  }

  canMoveTo(character, fromIndex, toIndex) {
    const distance = this.positionCalculator.calculateDistance(fromIndex, toIndex);
    return distance <= this.getMoveRange(character) &&
           !this.characterManager.isPositionOccupied(toIndex);
  }

  canAttack(character, fromIndex, toIndex) {
    const distance = this.positionCalculator.calculateDistance(fromIndex, toIndex);
    return distance <= this.getAttackRange(character);
  }

  getMoveRange(character) {
    return RANGE_MAP[character.constructor.name]?.move ?? 1;
  }

  getAttackRange(character) {
    return RANGE_MAP[character.constructor.name]?.attack ?? 1;
  }

  isPlayerCharacter(character) {
    return this.playerTypes.some(type => character instanceof type);
  }

  async performComputerTurn() {
    const { computer: computerCharacters } = this.characterManager.getCharactersByTeam(
      this.playerTypes, this.opponentTypes
    );

    if (computerCharacters.length === 0) {
      this.switchTurn();
      return;
    }

    const bestAction = this.aiController.findBestAction(computerCharacters);

    if (bestAction) {
      await this.executeAction(bestAction);
    }

    this.switchTurn();
  }

  async executeAction(action) {
    if (action.type === ACTION_ATTACK) {
      await this.attackCharacter(action.fromIndex, action.toIndex);
    } else if (action.type === ACTION_MOVE) {
      await this.moveCharacter(action.fromIndex, action.toIndex);
    }
  }

  async attackCharacter(attackerIndex, targetIndex) {
    const attacker = this.characterManager.getCharacterAt(attackerIndex);
    const target = this.characterManager.getCharacterAt(targetIndex);

    if (!attacker || !target) {
      GamePlay.showError('Атакующий или цель не найдены');
      this.deselectAllCells();
      return;
    }

    const damage = Math.max(attacker.attack - target.defence, attacker.attack * 0.1);
    target.health = Math.max(target.health - damage, 0);

    await this.gamePlay.showDamage(targetIndex, Math.round(damage));

    if (target.health === 0) {
      this.characterManager.removeCharacter(targetIndex);
      // Если целевой персонаж умер, снимаем выделение если он был выбран
      if (this.selectedCharacterIndex === targetIndex) {
        this.selectedCharacterIndex = null;
      }
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }

  async moveCharacter(fromIndex, toIndex) {
    const success = this.characterManager.moveCharacter(fromIndex, toIndex);

    if (!success) {
      GamePlay.showError('Персонаж не найден для перемещения');
      this.deselectAllCells();
      return;
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }

  async endPlayerTurn() {
    this.deselectAllCells();
    this.switchTurn();

    await this.delay(500);

    if (this.currentTurn === TEAM_COMPUTER) {
      await this.performComputerTurn();
    }
  }

  deselectAllCells() {
  // Снимаем выделение только с валидных индексов
    if (this.selectedCharacterIndex !== null && this.selectedCharacterIndex !== -1) {
      this.gamePlay.deselectCell(this.selectedCharacterIndex);
    }

    if (this.activeSelectCell !== null && this.activeSelectCell !== -1) {
      this.gamePlay.deselectCell(this.activeSelectCell);
    }

    this.selectedCharacterIndex = null;
    this.activeSelectCell = -1;
  }

  switchTurn() {
    this.currentTurn = this.currentTurn === TEAM_PLAYER ? TEAM_COMPUTER : TEAM_PLAYER;
    this.saveGameState();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  saveGameState() {
    const state = new GameState(this.currentTurn);
    this.stateService.save(state);
  }

  formatCharacterInfo(character) {
    return `🎖${character.level} ⚔${character.attack} 🛡${character.defence} ❤${character.health}`.trim();
  }

  createTeams() {
    const playerPositions = this.positionCalculator.getBorderColumnsIndices('first');
    const opponentPositions = this.positionCalculator.getBorderColumnsIndices('last');

    this.assignTeamToPositions(this.playerTypes, playerPositions);
    this.assignTeamToPositions(this.opponentTypes, opponentPositions);
  }

  assignTeamToPositions(teamTypeArray, positionIndices) {
    const teamCharacters = generateTeam(teamTypeArray, 1, 4).characters;
    const availablePositions = [ ...positionIndices ];

    for (const character of teamCharacters) {
      if (availablePositions.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions.splice(randomIndex, 1)[0];
      this.characterManager.addCharacter(character, position);
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }
}