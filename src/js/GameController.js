import themes from "./themes";
import cursors from "./cursors";
import Bowman from "./characters/Bowman";
import Vampire from "./characters/Vampire";
import Undead from "./characters/Undead";
import Magician from "./characters/Magician";
import Daemon from "./characters/Daemon";
import Swordsman from "./characters/Swordsman";
import { generateTeam } from "./generators";
import PositionedCharacter from "./PositionedCharacter";
import GamePlay from "./GamePlay";
import GameState from "./GameState";

// Команда игрока
const playersTypes = [Bowman, Swordsman, Magician];
// Команда противника
const opponentTypes = [Daemon, Undead, Vampire];

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    this.charactersMap = new Map();
    this.positionedCharacters = [];
    this.activeCharacter = -1;
    this.activeSelectCell = -1;
    this.currentTurn = "player"; // или 'computer'
    this.selectedCharacterIndex = null;
    // this.selectedCharacter = null;
  }

  init() {
    // TODO: add event listeners to gamePlay events
    this.gamePlay.drawUi(themes.prairie);
    this.createTeamPositions();
    this.setupEventListeners();
    // TODO: load saved stated from stateService
    // Восстановление из сохраненного состояния
    const savedState = this.stateService.load();
    if (savedState && savedState.nextTurn) {
      this.currentTurn = savedState.nextTurn;
    }

    this.saveGameState(); // сохраняем начальное состояние
  }

  setupEventListeners() {
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
  }

  onCellClick(index) {
    // TODO: react to click
    const character = this.charactersMap.get(index);

    if (this.selectedCharacterIndex !== null) {
      const selectedChar = this.charactersMap.get(this.selectedCharacterIndex);
      const distance = this.calculateDistance(
        this.selectedCharacterIndex,
        index
      );

      // 1. Выбор другого своего персонажа
      if (character && playersTypes.some((t) => character instanceof t)) {
        // Меняем выбранного персонажа
        this.gamePlay.deselectCell(this.selectedCharacterIndex);
        this.selectedCharacterIndex = index;
        this.gamePlay.selectCell(index);
        return;
      }

      // 2. Перемещение
      if (
        !character &&
        distance <= this.getMoveRange(selectedChar) &&
        !this.charactersMap.has(index)
      ) {
        // Перемещение
        this.moveCharacter(this.selectedCharacterIndex, index);
        this.gamePlay.deselectCell(this.selectedCharacterIndex);
        this.gamePlay.deselectCell(this.activeSelectCell);
        this.selectedCharacterIndex = null;
        this.switchTurn();
        return;
      }

      // 3. Атака
      if (character && !playersTypes.some((t) => character instanceof t)) {
        if (distance <= this.getAttackRange(selectedChar)) {
          this.attackCharacter(this.selectedCharacterIndex, index);
          this.gamePlay.deselectCell(this.selectedCharacterIndex);
          this.gamePlay.deselectCell(this.activeSelectCell);
          this.selectedCharacterIndex = null;
          this.switchTurn();
          return;
        }
      }

      // 4. Недопустимое действие
      GamePlay.showError("Недопустимое действие");
      this.gamePlay.setCursor(cursors.notallowed);
    } else {
      // Нет выбранного персонажа
      if (character && playersTypes.some((t) => character instanceof t)) {
        this.gamePlay.selectCell(index);
        this.selectedCharacterIndex = index;
      }
    }
  }

  onCellEnter(index) {
    // TODO: react to mouse enter
    const character = this.charactersMap.get(index);
    if (this.selectedCharacterIndex !== null) {
      const selectedChar = this.charactersMap.get(this.selectedCharacterIndex);
      // Есть выбранный персонаж
      const distance = this.calculateDistance(
        this.selectedCharacterIndex,
        index
      );

      if (character) {
        this.gamePlay.showCellTooltip(
          this.formatCharacterInfo(character),
          index
        );
      }

      if (character && playersTypes.some((type) => character instanceof type)) {
        // Наведение на своего персонажа
        // выбор другого персонажа
        this.gamePlay.setCursor(cursors.pointer);
      } else if (
        character && !playersTypes.some((t) => character instanceof t)
      ) {
        // Наведение на противника
        if (distance <= this.getAttackRange(selectedChar)) {
          this.gamePlay.setCursor(cursors.crosshair);
          this.gamePlay.selectCell(index, "red");
        } else {
          this.gamePlay.setCursor(cursors.notallowed);
        }
      } else {
        // Пустая ячейка — возможен ход
        if (distance <= this.getMoveRange(selectedChar)) {
          this.gamePlay.setCursor(cursors.pointer); // допустимый ход
          this.gamePlay.selectCell(index, "green");
        } else {
          this.gamePlay.setCursor(cursors.notallowed); // недопустимый ход
        }
      }
      if (this.activeSelectCell !== -1) {
        this.gamePlay.deselectCell(this.activeSelectCell);
      }
      this.activeSelectCell = index;
    } else {
      // нет выбранного персонажа
      if (character && playersTypes.some((type) => character instanceof type)) {
        this.gamePlay.showCellTooltip(
          this.formatCharacterInfo(character),
          index
        );
        this.gamePlay.setCursor(cursors.pointer);
      } else {
        this.gamePlay.setCursor(cursors.notallowed);
      }
    }

    // const character = this.charactersMap.get(index);
    // if (character) {
    //   const info = this.formatCharacterInfo(character);
    //   this.gamePlay.showCellTooltip(info, index);
    // } else {
    //   this.gamePlay.hideCellTooltip(index);
    // }
  }

  onCellLeave(index) {
    // TODO: react to mouse leave
    this.gamePlay.hideCellTooltip(index);
  }

  calculateDistance(fromIndex, toIndex) {
    const size = this.gamePlay.boardSize;
    const fromRow = Math.floor(fromIndex / size);
    const fromCol = fromIndex % size;
    const toRow = Math.floor(toIndex / size);
    const toCol = toIndex % size;
    return Math.max(Math.abs(fromRow - toRow), Math.abs(fromCol - toCol));
  }

  getMoveRange(character) {
    // Возвращает радиус перемещения в клетках для данного персонажа
    if (character instanceof Swordsman || character instanceof Undead) {
      return 4;
    } else if (character instanceof Bowman || character instanceof Vampire) {
      return 2;
    } else if (character instanceof Magician || character instanceof Daemon) {
      return 1;
    }
  }

  getAttackRange(character) {
    if (character instanceof Swordsman || character instanceof Undead) {
      return 1;
    } else if (character instanceof Bowman || character instanceof Vampire) {
      return 2;
    } else if (character instanceof Magician || character instanceof Daemon) {
      return 4;
    }
  }

  attackCharacter = (attackerIndex, targetIndex) => {
    const attackerPosition = this.positionedCharacters.find((obj) => {
      return obj.position === attackerIndex;
    });
    const targetPosition = this.positionedCharacters.find((obj) => {
      return obj.position === targetIndex;
    });

    if (!attackerPosition || !targetPosition) {
      GamePlay.showError("Атакующий или цель не найдены");
      return;
    }

    const attacker = attackerPosition.character;
    const target = targetPosition.character;

    // Расчет урона
    const damage = Math.max(
      attacker.attack - target.defence,
      attacker.attack * 0.1
    );

    // Обновляем здоровье атакуемого
    target.health = Math.max(target.health - damage, 0);

    // Визуализация урона
    return this.gamePlay
      .showDamage(targetIndex, Math.round(damage))
      .then(() => {
        // После анимации урона — перерисовываем позиции
        this.gamePlay.redrawPositions(this.positionedCharacters);
      });
  };

  moveCharacter = (fromIndex, toIndex) => {
    // Находим персонажа по fromIndex
    const characterPosition = this.positionedCharacters.find((obj) => {
      return obj.position === fromIndex;
    });

    if (!characterPosition) {
      GamePlay.showError("Персонаж не найден для перемещения");
      return;
    }

    // Обновляем позицию персонажа
    characterPosition.position = toIndex;
    this.charactersMap.delete(fromIndex);
    this.charactersMap.set(toIndex, characterPosition.character);

    // Перерисовываем
    this.gamePlay.redrawPositions(this.positionedCharacters);
  };

  // Метод для переключения хода
  switchTurn() {
    this.currentTurn = this.currentTurn === "player" ? "computer" : "player";
    this.saveGameState();
  }

  // Сохраняем состояние
  saveGameState() {
    const state = new GameState(this.currentTurn);
    this.stateService.save(state);
  }

  // Метод для завершения хода игрока
  endPlayerTurn() {
    this.switchTurn();
    // Тут можно реализовать автоматический ход компьютера
    if (this.currentTurn === "computer") {
      this.performComputerMove();
    }
  }

  performComputerMove() {
    // Логика хода компьютера
    // Например, выбрать случайного персонажа и сделать ход
    // После завершения - переключить ход обратно
    setTimeout(() => {
      // например, компьютер делает свой ход
      this.switchTurn(); // возвращаем ход игроку
    }, 1000);
  }

  formatCharacterInfo(character) {
    if (!character) return "";
    return `🎖${character.level} ⚔${character.attack} 🛡${character.defence} ❤${character.health}`.trim();
  }

  // Основная функция для создания позиций команд
  createTeamPositions() {
    // Создаем команды с использованием новых названий переменных
    const playersTeam = generateTeam(playersTypes, 1, 4).characters;
    const opponentTeam = generateTeam(opponentTypes, 1, 4).characters;

    const playersTeamPositions = this.getBorderColumnsIndices("first"); // Левая сторона
    const opponentTeamPositions = this.getBorderColumnsIndices("last"); // Правая сторона

    this.assignTeamCharacters(playersTeam, playersTeamPositions);
    this.assignTeamCharacters(opponentTeam, opponentTeamPositions);

    this.gamePlay.redrawPositions(this.positionedCharacters);
  }

  // Объединённый метод для получения индексов первых или последних двух колонок
  getBorderColumnsIndices(side = "first") {
    const size = this.gamePlay.boardSize;
    const indices = [];

    for (let row = 0; row < size; row++) {
      const baseIndex = row * size;
      if (side === "first") {
        // Первые два столбца (левая сторона)
        indices.push(baseIndex); // первый столбец
        indices.push(baseIndex + 1); // второй столбец
      } else if (side === "last") {
        // Последние два столбца (правая сторона)
        indices.push(baseIndex + size - 2); // предпоследний
        indices.push(baseIndex + size - 1); // последний
      }
    }
    return indices;
  }

  // Вспомогательная функция для назначения позиций для одной команды
  assignTeamCharacters(team, positionIndices) {
    const availablePositions = [...positionIndices];
    for (const character of team) {
      if (availablePositions.length === 0) break;
      const randIdx = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions.splice(randIdx, 1)[0];
      this.charactersMap.set(position, character);
      this.positionedCharacters.push(
        new PositionedCharacter(character, position)
      );
    }
  }
}
