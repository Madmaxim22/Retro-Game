import themes from './themes';
import Bowman from './characters/Bowman';
import Vampire from './characters/Vampire';
import Undead from './characters/Undead';
import Magician from './characters/Magician';
import Daemon from './characters/Daemon';
import Swordsman from './characters/Swordsman';
import { generateTeam } from './generators';
import PositionedCharacter from './PositionedCharacter';

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
  }

  init() {
    // TODO: add event listeners to gamePlay events
    this.gamePlay.drawUi(themes.prairie);
    this.createTeamPositions();
    // TODO: load saved stated from stateService
  }

  onCellClick(index) {
    // TODO: react to click
  }

  onCellEnter(index) {
    // TODO: react to mouse enter
  }

  onCellLeave(index) {
    // TODO: react to mouse leave
  }

  // Основная функция для создания позиций команд
  createTeamPositions() {
    // Команда магов и духов
    const magicAndSpiritTypes = [
      Magician, Undead, Vampire
    ];
    // Команда воинов и демонов
    const warriorAndDemonTypes = [
      Bowman, Swordsman, Daemon
    ];

    // Создаем команды с использованием новых названий переменных
    const magicAndSpiritTeam = generateTeam(
      magicAndSpiritTypes, 1, 4
    ).characters;
    const warriorAndDemonTeam = generateTeam(
      warriorAndDemonTypes, 1, 4
    ).characters;

    const magicAndSpiritTeamPositions = this.getBorderColumnsIndices('first'); // Левая сторона
    const warriorAndDemonTeamPositions = this.getBorderColumnsIndices('last'); // Правая сторона

    this.positionedCharacters = [];

    this.assignTeamCharacters(magicAndSpiritTeam, magicAndSpiritTeamPositions);
    this.assignTeamCharacters(warriorAndDemonTeam, warriorAndDemonTeamPositions);

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
      this.positionedCharacters.push(
        new PositionedCharacter(character, position)
      );
    }
  }
}
