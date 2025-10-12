import themes from './themes';
import cursors from './cursors';
import Bowman from './characters/Bowman';
import Vampire from './characters/Vampire';
import Undead from './characters/Undead';
import Magician from './characters/Magician';
import Daemon from './characters/Daemon';
import Swordsman from './characters/Swordsman';
import { generateTeam } from './generators';
import GamePlay from './GamePlay';
import GameState from './GameState';
import PositionCalculator from "./PositionCalculator";
import CharacterManager from "./CharacterManager";
import AIController from "./AIController";

// Константы для команд
const TEAM_PLAYER = 'player';
const TEAM_COMPUTER = 'computer';

// Константы для типов действий
export const ACTION_ATTACK = 'attack';
export const ACTION_MOVE = 'move';

export const RANGE_MAP = {
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

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;

    this.playerTypes = [
      Bowman, Swordsman, Magician
    ];
    this.opponentTypes = [
      Daemon, Undead, Vampire
    ];

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
    this.currentTheme = themes.prairie;
  }

  init() {
    this.gamePlay.drawUi(this.currentTheme);
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
      // Проверка, если противников больше нет
      this.checkForLevelUpOrNextLevel();
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

  checkForLevelUpOrNextLevel() {
    const { computer: enemies } = this.characterManager.getCharactersByTeam(
      this.playerTypes, this.opponentTypes
    );

    if (enemies.length === 0) {
    // Повысить уровни всех персонажей игрока
      this.characterManager.positionedCharacters.forEach(posChar => {
        if (this.isPlayerCharacter(posChar.character)) {
          this.levelUpCharacter(posChar.character);
        }
      });

      // Переход на следующий уровень
      this.nextLevel();
    }
  }

  levelUpCharacter(character) {
    character.level += 1;

    // Увеличение attack и defence по формуле
    const attackBefore = character.attack;
    const defenceBefore = character.defence;

    // Обновляем attack и defence
    character.attack = Math.max(
      attackBefore,
      attackBefore * (80 + character.health) / 100
    );
    character.defence = Math.max(
      defenceBefore,
      defenceBefore * (80 + character.health) / 100
    );

    // Обновляем здоровье согласно уровню
    character.health = Math.min(character.health + 80, 100);
  }

  nextLevel() {
    const keys = Object.keys(themes); // ['prairie', 'desert', 'arctic', 'mountain']
    const currentIndex = keys.indexOf(this.currentTheme);

    if (currentIndex === -1 || currentIndex >= keys.length - 1) {
    // Последняя тема или текущая тема не найдена — ничего не делаем
      console.log('Достигнута последняя тема. Новое изменение невозможно.');
      return;
    }

    const nextIndex = currentIndex + 1;
    this.currentTheme = keys[nextIndex];

    // Меняем тему в UI
    this.gamePlay.drawUi(themes[this.currentTheme]);

    // Сохраняем текущих персонажей игрока
    const currentPlayerCharacters = this.characterManager.positionedCharacters
      .filter(posChar => this.isPlayerCharacter(posChar.character))
      .map(posChar => ({
        character: posChar.character, position: posChar.position
      }));

    // Создаем новые менеджеры
    this.characterManager = new CharacterManager();
    this.positionCalculator = new PositionCalculator(this.gamePlay.boardSize, this.characterManager);
    this.aiController = new AIController(
      this.characterManager,
      this.positionCalculator,
      this.playerTypes,
      this.opponentTypes
    );

    // Создаем команду игрока, используя сохраненных персонажей
    for (const { character, position } of currentPlayerCharacters) {
      this.characterManager.addCharacter(character, position);
    }

    // Создаем команду компьютера заново
    const opponentPositions = this.positionCalculator.getBorderColumnsIndices('last');
    const opponentCharacters = generateTeam(this.opponentTypes, 1, 4).characters;

    for (const character of opponentCharacters) {
      const availablePositions = [ ...opponentPositions ];
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions.splice(randomIndex, 1)[0];
      this.characterManager.addCharacter(character, position);
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);

    this.currentTurn = TEAM_PLAYER;
    this.saveGameState();

    this.performComputerTurn();
  }

}