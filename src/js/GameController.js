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

    // Типы персонажей для игрока и противника
    this.playerTypes = [
      Bowman, Swordsman, Magician
    ];
    this.opponentTypes = [
      Daemon, Undead, Vampire
    ];

    // Инициализация менеджера персонажей, калькулятора позиций и ИИ
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

    // Переменные для состояния выбранных персонажей и текущего хода
    this.selectedCharacterIndex = null;
    this.activeSelectCell = -1;
    this.currentTurn = TEAM_PLAYER;
    this.currentTheme = themes.prairie;
    this.gameOver = false;
    this.maxScore = 0;
  }

  // Инициализация: установка слушателей и старт новой игры
  init() {
    this.setupEventListeners();
    this.startNewGame();
  }

  // Сброс состояния к начальной
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

  // Установка слушателей событий UI
  setupEventListeners() {
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
    this.gamePlay.addNewGameListener(this.startNewGame.bind(this));
    this.gamePlay.addSaveGameListener(this.saveGameState.bind(this));
    this.gamePlay.addLoadGameListener(this.loadGameState.bind(this));
  }

  // Обработка клика по ячейке
  async onCellClick(index) {
    if (this.gameOver || this.currentTurn !== TEAM_PLAYER) return;

    const character = this.characterManager.getCharacterAt(index);

    if (this.selectedCharacterIndex !== null) {
      // Есть выбранный персонаж, обрабатываем действие
      await this.handleActionWithSelectedCharacter(index);
    } else {
      // Нет выбранного персонажа, выбираем персонажа
      this.handleCharacterSelection(index, character);
      const distance = this.getMoveRange(character);
      this.gamePlay.highlightRange(index, distance);
    }
  }

  // Обработка действия с выбранным персонажем
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

    // Если клик по своему персонажу - меняем выделение
    if (character && this.isPlayerCharacter(character)) {
      this.selectCharacter(index);
      const distance = this.getMoveRange(character);
      this.gamePlay.highlightRange(index, distance);
      return;
    }

    // Если клик по пустой ячейке и можно переместиться
    if (
      !character &&
      this.canMoveTo(selectedChar, this.selectedCharacterIndex, index)
    ) {
      await this.moveCharacter(this.selectedCharacterIndex, index);
      const character = this.characterManager.getCharacterAt(index);
      const distance = this.getMoveRange(character);
      this.gamePlay.highlightRange(index, distance);
      await this.endPlayerTurn();
      return;
    }

    // Если клик по врагу и можно атаковать
    if (
      character &&
      !this.isPlayerCharacter(character) &&
      this.canAttack(selectedChar, this.selectedCharacterIndex, index)
    ) {
      await this.attackCharacter(this.selectedCharacterIndex, index);
      await this.endPlayerTurn();
      return;
    }

    // Недопустимое действие
    GamePlay.showError('Недопустимое действие');
    this.gamePlay.setCursor(cursors.notallowed);
  }

  // Обработка выбора персонажа
  handleCharacterSelection(index, character) {
    if (character && this.isPlayerCharacter(character)) {
      this.selectCharacter(index);
    }
  }

  // Выделение выбранного персонажа
  selectCharacter(index) {
    // Снимаем выделение предыдущего
    if (
      this.selectedCharacterIndex !== null &&
      this.selectedCharacterIndex !== -1
    ) {
      this.gamePlay.deselectCell(this.selectedCharacterIndex);
    }

    this.selectedCharacterIndex = index;

    // Выделяем новую ячейку
    if (index !== null && index !== -1) {
      this.gamePlay.selectCell(index);
    }
  }

  // Обработка наведения курсора на ячейку
  onCellEnter(index) {
    if (this.gameOver || this.currentTurn !== TEAM_PLAYER) return;

    const character = this.characterManager.getCharacterAt(index);

    // Показываем подсказку с информацией о персонаже
    if (character) {
      this.gamePlay.showCellTooltip(this.formatCharacterInfo(character), index);
    }

    // Обработка наведения в зависимости от выбора
    if (this.selectedCharacterIndex === null) {
      this.handleHoverWithoutSelection(character);
    } else {
      this.handleHoverWithSelection(index, character);
    }
  }

  // Наведение без выбранного персонажа
  handleHoverWithoutSelection(character) {
    this.gamePlay.setCursor(
      character && this.isPlayerCharacter(character)
        ? cursors.pointer
        : cursors.notallowed
    );
  }

  // Наведение при выбранном персонаже
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

  // Обработка наведения на врага
  handleEnemyHover(index, selectedChar, distance) {
    if (distance <= this.getAttackRange(selectedChar)) {
      this.gamePlay.setCursor(cursors.crosshair);
      this.gamePlay.selectCell(index, 'red');
    } else {
      this.gamePlay.setCursor(cursors.notallowed);
    }
  }

  // Обработка наведения на пустую ячейку
  handleEmptyCellHover(index, selectedChar, distance) {
    if (distance <= this.getMoveRange(selectedChar)) {
      this.gamePlay.setCursor(cursors.pointer);
      this.gamePlay.selectCell(index, 'green');
    } else {
      this.gamePlay.setCursor(cursors.notallowed);
    }
  }

  // Обновление активной выбранной ячейки
  updateActiveSelection(index) {
    // Снимаем выделение с предыдущей активной ячейки
    if (this.activeSelectCell !== -1 && this.activeSelectCell !== null) {
      this.gamePlay.deselectCell(this.activeSelectCell);
    }

    this.activeSelectCell = index;
  }

  // Обработка ухода курсора с ячейки
  onCellLeave(index) {
    this.gamePlay.hideCellTooltip(index);
  }

  // Проверка, можно ли переместить персонажа
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

  // Проверка, можно ли атаковать
  canAttack(character, fromIndex, toIndex) {
    const distance = this.positionCalculator.calculateDistance(
      fromIndex,
      toIndex
    );
    return distance <= this.getAttackRange(character);
  }

  // Получение диапазона перемещения
  getMoveRange(character) {
    return RANGE_MAP[character.constructor.name]?.move ?? 1;
  }

  // Получение диапазона атаки
  getAttackRange(character) {
    return RANGE_MAP[character.constructor.name]?.attack ?? 1;
  }

  // Проверка, является ли персонаж игроком
  isPlayerCharacter(character) {
    return this.playerTypes.some((type) => character instanceof type);
  }

  // Логика хода компьютера
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

    // ИИ ищет лучший ход
    const bestAction = this.aiController.findBestAction(computerCharacters);

    if (bestAction) {
      await this.executeAction(bestAction);
    }

    // Проверка остались ли живые игроки
    const playerCharactersAlive =
      this.characterManager.positionedCharacters.some((posChar) =>
        this.isPlayerCharacter(posChar.character)
      );

    if (!playerCharactersAlive) {
      // Игра окончена, проигрыш игрока
      this.endGame(false);
      return;
    }

    this.switchTurn(); // Передача хода
  }

  // Выполнение выбранного действия (атаки или перемещения)
  async executeAction(action) {
    if (action.type === ACTION_ATTACK) {
      await this.attackCharacter(action.fromIndex, action.toIndex);
    } else if (action.type === ACTION_MOVE) {
      await this.moveCharacter(action.fromIndex, action.toIndex);
    }
  }

  // Атака персонажа
  async attackCharacter(attackerIndex, targetIndex) {
    const attacker = this.characterManager.getCharacterAt(attackerIndex);
    const target = this.characterManager.getCharacterAt(targetIndex);

    if (!attacker || !target) {
      GamePlay.showError('Атакующий или цель не найдены');
      this.deselectAllCells();
      return;
    }

    // Расчет урона с учетом защиты
    const damage = Math.max(
      attacker.attack - target.defence,
      attacker.attack * 0.1
    );
    target.health = Math.max(target.health - damage, 0);

    // Визуализируем урон
    await this.gamePlay.showDamage(targetIndex, Math.round(damage));

    // Если персонаж умер
    if (target.health === 0) {
      this.characterManager.removeCharacter(targetIndex);
      // Проверка, если противников больше нет
      this.checkForLevelUpOrNextLevel();
      // Если убитый был выбран, снимаем выделение
      if (this.selectedCharacterIndex === targetIndex) {
        this.selectedCharacterIndex = null;
      }
    }

    // Перерисовка позиций
    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }

  // Перемещение персонажа
  async moveCharacter(fromIndex, toIndex) {
    const success = this.characterManager.moveCharacter(fromIndex, toIndex);

    if (!success) {
      GamePlay.showError('Персонаж не найден для перемещения');
      this.deselectAllCells();
      return;
    }

    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);
  }

  // Завершение хода игрока
  async endPlayerTurn() {
    this.deselectAllCells();
    this.switchTurn();
    this.gamePlay.clearHighlights();

    await this.delay(200); // небольшая задержка

    if (this.currentTurn === TEAM_COMPUTER) {
      await this.performComputerTurn();
    }
  }

  // Снятие выделения со всех ячеек
  deselectAllCells() {
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

  // Переключение хода
  switchTurn() {
    this.currentTurn =
      this.currentTurn === TEAM_PLAYER ? TEAM_COMPUTER : TEAM_PLAYER;
  }

  // Обертка для задержки
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Сохранение текущего состояния игры
  saveGameState() {
    const characterPositions = this.characterManager.positionedCharacters.map(
      ({ character, position }) => ({
        position,
        character: {
          type: character.constructor.name,
          level: character.level,
          attack: character.attack,
          defence: character.defence,
          health: character.health,
        },
      })
    );

    const state = new GameState({
      currentTheme: this.currentTheme,
      currentTurn: this.currentTurn,
      characterPositions: characterPositions,
      selectedCharacterIndex: this.selectedCharacterIndex,
      activeSelectCell: this.activeSelectCell,
      gameOver: this.gameOver,
      maxScore: this.maxScore,
    });

    this.stateService.save(state);
  }

  // Загрузка сохраненного состояния
  loadGameState() {
    const savedState = this.stateService.load();

    if (!savedState) {
      GamePlay.showError('Нет сохраненного состояния');
      return;
    }
    this.reset();

    // Восстановление темы, хода, статуса игры и очков
    this.currentTheme = savedState.currentTheme;
    this.currentTurn = savedState.currentTurn;
    this.gameOver = savedState.gameOver;
    this.maxScore = savedState.maxScore;

    // Восстановление персонажей
    savedState.characterPositions.forEach(({ character, position }) => {
      let characterInstance;
      switch (character.type) {
      case 'Bowman':
        characterInstance = new Bowman(character.level);
        break;
      case 'Vampire':
        characterInstance = new Vampire(character.level);
        break;
      case 'Undead':
        characterInstance = new Undead(character.level);
        break;
      case 'Magician':
        characterInstance = new Magician(character.level);
        break;
      case 'Daemon':
        characterInstance = new Daemon(character.level);
        break;
      case 'Swordsman':
        characterInstance = new Swordsman(character.level);
        break;
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

    // Восстановление выбранных персонажей и активных ячеек
    this.selectedCharacterIndex = savedState.selectedCharacterIndex;
    this.activeSelectCell = savedState.activeSelectCell;

    // Перерисовка UI
    this.gamePlay.drawUi(this.currentTheme);
    this.gamePlay.redrawPositions(this.characterManager.positionedCharacters);

    // Если ход компьютера, запускаем его
    if (this.currentTurn === TEAM_COMPUTER && !this.gameOver) {
      this.performComputerTurn();
    }
  }

  // Форматирование информации о персонаже для подсказки
  formatCharacterInfo(character) {
    return `🎖${character.level} ⚔${character.attack} 🛡${character.defence} ❤${character.health}`.trim();
  }

  // Создание команд для игрока и компьютера
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

  // Проверка, все ли враги уничтожены и переход на следующий уровень
  checkForLevelUpOrNextLevel() {
    const { computer: enemies } = this.characterManager.getCharactersByTeam(
      this.playerTypes,
      this.opponentTypes
    );

    if (enemies.length === 0) {
      if (this.currentTheme !== themes.mountain) {
        // Повышение уровней всех персонажей игрока
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

  // Повышение уровня персонажа
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

  // Переход к следующему уровню
  nextLevel() {
    const keys = Object.keys(themes); // ['prairie', 'desert', 'arctic', 'mountain']
    const currentIndex = keys.indexOf(this.currentTheme);

    if (currentIndex === -1 || currentIndex >= keys.length - 1) {
      // Если достигли последней темы, заканчиваем игру победой
      this.endGame(true);
      return;
    }

    const nextIndex = currentIndex + 1;

    // Сохраняем текущих персонажей игрока
    const currentPlayerCharacters = this.characterManager.positionedCharacters
      .filter((posChar) => this.isPlayerCharacter(posChar.character))
      .map((posChar) => posChar.character);

    // Сброс состояния игры перед сменой темы
    this.reset();

    // Обновляем тему оформления
    this.currentTheme = keys[nextIndex];
    this.gamePlay.drawUi(themes[this.currentTheme]);

    // Восстанавливаем команду игрока с сохраненными персонажами на новых позициях
    const playerPositions =
      this.positionCalculator.getBorderColumnsIndices('first');
    this.characterManager.assignTeamToPositions(
      currentPlayerCharacters,
      playerPositions
    );

    // Создаем команду противника заново
    this.createTeams(false, true);

    // Компьютер делает первый ход на новом уровне
    this.performComputerTurn();
  }

  // Окончание игры
  endGame(winner) {
    this.gameOver = true;

    // Подсчет очков (например, сумму уровней)
    const playerCharacters = this.characterManager.positionedCharacters
      .filter((posChar) => this.isPlayerCharacter(posChar.character))
      .map((posChar) => posChar.character);

    const totalScore = playerCharacters.reduce((sum, ch) => sum + ch.level, 0);
    this.maxScore = totalScore;

    if (winner) {
      GamePlay.showMessage('Вы победили!');
    } else {
      GamePlay.showMessage('Вы проиграли.');
    }
  }

  // Старт новой игры
  startNewGame() {
    this.reset();
    this.gamePlay.drawUi(this.currentTheme);
    this.createTeams(true, true);

    // Если ход компьютера, запускаем его
    if (this.currentTurn === TEAM_COMPUTER && !this.gameOver) {
      this.performComputerTurn();
    }
  }
}
