import themes from './themes';
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

// Команда игрока
const playersTypes = [
  Bowman, Swordsman, Magician
];
// Команда противника
const opponentTypes = [
  Daemon, Undead, Vampire
];

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    this.charactersMap = new Map();
    this.positionedCharacters = [];
    this.activeCharacter = -1;
    this.currentTurn = 'player'; // или 'computer'
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
    this.gamePlay.addCellEnterListener(this.onCellEnter);
    this.gamePlay.addCellLeaveListener(this.onCellLeave);
    this.gamePlay.addCellClickListener(this.onCellClick);
  }

  onCellClick = (index) => {
    // TODO: react to click
    const character = this.charactersMap.get(index);
    if (character && playersTypes.some((type) => character instanceof type)) {
      if (this.currentTurn !== 'player') {
        GamePlay.showError('Сейчас ход компьютера');
        return;
      }
      this.gamePlay.selectCell(index);
      if (this.activeCharacter !== -1) {
        this.gamePlay.deselectCell(this.activeCharacter);
      }
      this.activeCharacter = index;
    } else {
      GamePlay.showError('Выберете персонажа игрока!');
    }
  };

  onCellEnter = (index) => {
    // TODO: react to mouse enter
    const character = this.charactersMap.get(index);
    if (character) {
      const info = this.formatCharacterInfo(character);
      this.gamePlay.showCellTooltip(info, index);
    } else {
      this.gamePlay.hideCellTooltip(index);
    }
  };

  onCellLeave = (index) => {
    // TODO: react to mouse leave
    this.gamePlay.hideCellTooltip(index);
  };

  // Метод для переключения хода
  switchTurn() {
    this.currentTurn = this.currentTurn === 'player' ? 'computer' : 'player';
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
    if (this.currentTurn === 'computer') {
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
    if (!character) return '';
    return `🎖${character.level} ⚔${character.attack} 🛡${character.defence} ❤${character.health}`.trim();
  }

  // Основная функция для создания позиций команд
  createTeamPositions() {
    // Создаем команды с использованием новых названий переменных
    const playersTeam = generateTeam(playersTypes, 1, 4).characters;
    const opponentTeam = generateTeam(opponentTypes, 1, 4).characters;

    const playersTeamPositions = this.getBorderColumnsIndices('first'); // Левая сторона
    const opponentTeamPositions = this.getBorderColumnsIndices('last'); // Правая сторона

    this.assignTeamCharacters(playersTeam, playersTeamPositions);
    this.assignTeamCharacters(opponentTeam, opponentTeamPositions);

    this.gamePlay.redrawPositions(this.positionedCharacters);
  }

  // Объединённый метод для получения индексов первых или последних двух колонок
  getBorderColumnsIndices(side = 'first') {
    const size = this.gamePlay.boardSize;
    const indices = [];

    for (let row = 0; row < size; row++) {
      const baseIndex = row * size;
      if (side === 'first') {
        // Первые два столбца (левая сторона)
        indices.push(baseIndex); // первый столбец
        indices.push(baseIndex + 1); // второй столбец
      } else if (side === 'last') {
        // Последние два столбца (правая сторона)
        indices.push(baseIndex + size - 2); // предпоследний
        indices.push(baseIndex + size - 1); // последний
      }
    }
    return indices;
  }

  // Вспомогательная функция для назначения позиций для одной команды
  assignTeamCharacters(team, positionIndices) {
    const availablePositions = [ ...positionIndices ];
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
