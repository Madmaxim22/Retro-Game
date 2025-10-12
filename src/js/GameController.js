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
import PositionCalculator from './PositionCalculator';
import CharacterManager from './CharacterManager';
import AIController from './AIController';

// Константы для команд
const TEAM_PLAYER = 'player';
const TEAM_COMPUTER = 'computer';

// Константы для типов действий
export const ACTION_ATTACK = 'attack';
export const ACTION_MOVE = 'move';

export const RANGE_MAP = {
  Swordsman: {
    move: 4,
    attack: 1,
  },
  Undead: {
    move: 4,
    attack: 1,
  },
  Bowman: {
    move: 2,
    attack: 2,
  },
  Vampire: {
    move: 2,
    attack: 2,
  },
  Magician: {
    move: 1,
    attack: 4,
  },
  Daemon: {
    move: 1,
    attack: 4,
  },
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
    this.positionCalculator = new PositionCalculator(
      gamePlay.boardSize,
      this.characterManager
    );
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
    this.gameOver = false;
    this.maxScore = 0;
  }

  init() {
    this.setupEventListeners();
    this.startNewGame();
  }

  reset() {
    this.characterManager = new CharacterManager();
    this.positionCalculator = new PositionCalculator(
      this.gamePlay.boardSize,
      this.characterManager
    );
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
    this.gameOver = false;
    this.maxScore = 0;
  }

  setupEventListeners() {
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
    this.gamePlay.addNewGameListener(this.startNewGame.bind(this));
    this.gamePlay.addSaveGameListener(this.saveGameState.bind(this));
    this.gamePlay.addLoadGameListener(this.loadGameState.bind(this));
  }

  async onCellClick(index) {
    if (this.gameOver || this.currentTurn !== TEAM_PLAYER) return;

    const character = this.characterManager.getCharacterAt(index);

    if (this.selectedCharacterIndex !== null) {
      await this.handleActionWithSelectedCharacter(index);
    } else {
      this.handleCharacterSelection(index, character);
    }
  }

  async handleActionWithSelectedCharacter(index) {
    const selectedChar = this.characterManager.getCharacterAt(
      this.selectedCharacterIndex
    );

    // Проверяем, что выбранный персонаж все еще существует
    if (!selectedChar) {
      this.deselectAllCells();
      return;
    }

    const character = this.characterManager.getCharacterAt(index);
    const distance = this.positionCalculator.calculateDistance(
      this.selectedCharacterIndex,
      index
    );

    if (character && this.isPlayerCharacter(character)) {
      this.selectCharacter(index);
      return;
    }

    if (
      !character &&
      this.canMoveTo(selectedChar, this.selectedCharacterIndex, index)
    ) {
      await this.moveCharacter(this.selectedCharacterIndex, index);
      await this.endPlayerTurn();
      return;
    }

    if (
      character &&
      !this.isPlayerCharacter(character) &&
      this.canAttack(selectedChar, this.selectedCharacterIndex, index)
    ) {
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
    if (
      this.selectedCharacterIndex !== null &&
      this.selectedCharacterIndex !== -1
    ) {
      this.gamePlay.deselectCell(this.selectedCharacterIndex);
    }

    this.selectedCharacterIndex = index;

    // Выделяем новую ячейку только если индекс валидный
    if (index !== null && index !== -1) {
      this.gamePlay.selectCell(index);
    }
  }

  onCellEnter(index) {
    if (this.gameOver || this.currentTurn !== TEAM_PLAYER) return;

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
      character && this.isPlayerCharacter(character)
        ? cursors.pointer
        : cursors.notallowed
    );
  }

  handleHoverWithSelection(index, targetCharacter) {
    const selectedChar = this.characterManager.getCharacterAt(
      this.selectedCharacterIndex
    );
    const distance = this.positionCalculator.calculateDistance(
      this.selectedCharacterIndex,
      index
    );

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
    const distance = this.positionCalculator.calculateDistance(
      fromIndex,
      toIndex
    );
    return (
      distance <= this.getMoveRange(character) &&
      !this.characterManager.isPositionOccupied(toIndex)
    );
  }

  canAttack(character, fromIndex, toIndex) {
    const distance = this.positionCalculator.calculateDistance(
      fromIndex,
      toIndex
    );
    return distance <= this.getAttackRange(character);
  }

  getMoveRange(character) {
    return RANGE_MAP[character.constructor.name]?.move ?? 1;
  }

  getAttackRange(character) {
    return RANGE_MAP[character.constructor.name]?.attack ?? 1;
  }

  isPlayerCharacter(character) {
    return this.playerTypes.some((type) => character instanceof type);
  }

  async performComputerTurn() {
    const { computer: computerCharacters } =
      this.characterManager.getCharactersByTeam(
        this.playerTypes,
        this.opponentTypes
      );

    if (computerCharacters.length === 0) {
      this.switchTurn();
      return;
    }

    const bestAction = this.aiController.findBestAction(computerCharacters);

    if (bestAction) {
      await this.executeAction(bestAction);
    }

    // Проверяем, остались ли еще живые игроки
    const playerCharactersAlive =
      this.characterManager.positionedCharacters.some((posChar) =>
        this.isPlayerCharacter(posChar.character)
      );

    if (!playerCharactersAlive) {
      // Игра окончена, проигрыш игрока
      this.endGame(false); // или вызывайте свой метод завершения
      return;
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

    const damage = Math.max(
      attacker.attack - target.defence,
      attacker.attack * 0.1
    );
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

    await this.delay(200);

    if (this.currentTurn === TEAM_COMPUTER) {
      await this.performComputerTurn();
    }
  }

  deselectAllCells() {
    // Снимаем выделение только с валидных индексов
    if (
      this.selectedCharacterIndex !== null &&
      this.selectedCharacterIndex !== -1
    ) {
      this.gamePlay.deselectCell(this.selectedCharacterIndex);
    }

    if (this.activeSelectCell !== null && this.activeSelectCell !== -1) {
      this.gamePlay.deselectCell(this.activeSelectCell);
    }

    this.selectedCharacterIndex = null;
    this.activeSelectCell = -1;
  }

  switchTurn() {
    this.currentTurn =
      this.currentTurn === TEAM_PLAYER ? TEAM_COMPUTER : TEAM_PLAYER;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  saveGameState() {
  // Собираем текущие данные для сохранения
    const characterPositions = this.characterManager.positionedCharacters.map(({ character, position }) => ({
      position,
      character: {
        type: character.constructor.name,
        level: character.level,
        attack: character.attack,
        defence: character.defence,
        health: character.health,
      }
    }));

    const state = new GameState({
      currentTheme: this.currentTheme,
      currentTurn: this.currentTurn,
      characterPositions: characterPositions,
      selectedCharacterIndex: this.selectedCharacterIndex,
      activeSelectCell: this.activeSelectCell,
      gameOver: this.gameOver,
      maxScore: this.maxScore
    });

    this.stateService.save(state);
  }

  loadGameState() {
    const savedState = this.stateService.load();

    if (!savedState) {
      GamePlay.showError('Нет сохраненного состояния');
      return;
    }
    this.reset();

    // Восстановление
    this.currentTheme = savedState.currentTheme;
    this.currentTurn = savedState.currentTurn;
    this.gameOver = savedState.gameOver;
    this.maxScore = savedState.maxScore;

    // Восстановление персонажей
    savedState.characterPositions.forEach(({ character, position }) => {
      let characterInstance;
      switch (character.type) {
      case 'Bowman':
        characterInstance = new Bowman(character.level); break;
      case 'Vampire':
        characterInstance = new Vampire(character.level); break;
      case 'Undead':
        characterInstance = new Undead(character.level); break;
      case 'Magician':
        characterInstance = new Magician(character.level); break;
      case 'Daemon':
        characterInstance = new Daemon(character.level); break;
      case 'Swordsman':
        characterInstance = new Swordsman(character.level); break;
      default:
        console.warn(`Неизвестный тип персонажа: ${character.type}`);
        return;
      }
      // Восстановление свойств
      Object.assign(characterInstance, {
        attack: character.attack,
        defence: character.defence,
        health: character.health,
      });
      this.characterManager.addCharacter(characterInstance, position);
    });

    // Восстановите выбранных персонажей и активные ячейки
    this.selectedCharacterIndex = savedState.selectedCharacterIndex;
    this.activeSelectCell = savedState.activeSelectCell;

    // Перерисуйте позиции
    this.gamePlay.drawUi(this.currentTheme);
    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);

    if (this.currentTurn === TEAM_COMPUTER && !this.gameOver) {
      this.performComputerTurn();
    }
  }

  formatCharacterInfo(character) {
    return `🎖${character.level} ⚔${character.attack} 🛡${character.defence} ❤${character.health}`.trim();
  }

  createTeams(player, opponent) {
    if (player) {
      const playerPositions =
        this.positionCalculator.getBorderColumnsIndices('first');
      const teamCharacters = generateTeam(this.playerTypes, 1, 4).characters;
      this.characterManager.assignTeamToPositions(
        teamCharacters,
        playerPositions
      );
    }
    if (opponent) {
      const opponentPositions =
        this.positionCalculator.getBorderColumnsIndices('last');
      const teamCharacters = generateTeam(this.opponentTypes, 1, 4).characters;
      this.characterManager.assignTeamToPositions(
        teamCharacters,
        opponentPositions
      );
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }

  checkForLevelUpOrNextLevel() {
    const { computer: enemies } = this.characterManager.getCharactersByTeam(
      this.playerTypes,
      this.opponentTypes
    );

    if (enemies.length === 0) {
      if(this.currentTheme !== themes.mountain) {
        // Повысить уровни всех персонажей игрока
        this.characterManager.positionedCharacters.forEach((posChar) => {
          if (this.isPlayerCharacter(posChar.character)) {
            this.levelUpCharacter(posChar.character);
          }
        });
      }
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
      (attackBefore * (80 + character.health)) / 100
    );
    character.defence = Math.max(
      defenceBefore,
      (defenceBefore * (80 + character.health)) / 100
    );

    // Обновляем здоровье согласно уровню
    character.health = Math.min(character.health + 80, 100);
  }

  nextLevel() {
    const keys = Object.keys(themes); // ['prairie', 'desert', 'arctic', 'mountain']
    const currentIndex = keys.indexOf(this.currentTheme);

    if (currentIndex === -1 || currentIndex >= keys.length - 1) {
      // Последняя тема или текущая тема не найдена
      this.endGame(true);
      return;
    }

    const nextIndex = currentIndex + 1;

    // Сохраняем текущих персонажей игрок
    const currentPlayerCharacters = this.characterManager.positionedCharacters
      .filter((posChar) => this.isPlayerCharacter(posChar.character))
      .map((posChar) => posChar.character);

    // сбрасывам состояние игры
    this.reset();

    // Меняем тему в UI
    this.currentTheme = keys[nextIndex];
    this.gamePlay.drawUi(themes[this.currentTheme]);

    // Создаем команду игрока, используя сохраненных персонажей сохраняем персонажей на новом поле с новыми позициями
    const playerPositions =
      this.positionCalculator.getBorderColumnsIndices('first');
    this.characterManager.assignTeamToPositions(
      currentPlayerCharacters,
      playerPositions
    );

    // Создаем команду компьютера заново
    this.createTeams(false, true);

    this.performComputerTurn();
  }

  endGame(winner) {
    this.gameOver = true;

    // Подсчет очков за игру (например, сумма уровней всех персонажей игрока)
    const playerCharacters = this.characterManager.positionedCharacters
      .filter(posChar => this.isPlayerCharacter(posChar.character))
      .map(posChar => posChar.character);

    const totalScore = playerCharacters.reduce((sum, ch) => sum + ch.level, 0);
    this.maxScore = totalScore;

    if (winner) {
      GamePlay.showMessage('Вы победили!');
    } else {
      GamePlay.showMessage('Вы проиграли.');
    }
  }

  startNewGame() {
    this.reset();
    this.gamePlay.drawUi(this.currentTheme);
    this.createTeams(true, true);

    if (this.currentTurn === TEAM_COMPUTER && !this.gameOver) {
      this.performComputerTurn();
    }
  }
}
