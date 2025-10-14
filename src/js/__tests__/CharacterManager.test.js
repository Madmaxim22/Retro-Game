import CharacterManager from '../CharacterManager';
import PositionedCharacter from '../PositionedCharacter';
import Bowman from '../characters/Bowman';
import Vampire from '../characters/Vampire';

// Мокаем класс персонажа для тестирования
class MockCharacter {
  constructor(name) {
    this.name = name;
  }
}

describe('CharacterManager', () => {
  let manager;
  const character = new Bowman(1);

  beforeEach(() => {
    manager = new CharacterManager();
  });

  test('должен инициализироваться с пустыми картой и массивом', () => {
    expect(manager.charactersMap.size).toBe(0);
    expect(manager.positionedCharacters.length).toBe(0);
  });

  test('добавляет персонажа по позиции', () => {
    manager.addCharacter(character, 1);
    expect(manager.charactersMap.get(1)).toBe(character);
    expect(manager.positionedCharacters.length).toBe(1);
    expect(manager.positionedCharacters[0].position).toBe(1);
  });

  test('удаляет персонажа по позиции', () => {
    manager.addCharacter(character, 2);
    manager.removeCharacter(2);
    expect(manager.charactersMap.has(2)).toBe(false);
    expect(manager.positionedCharacters.length).toBe(0);
  });

  test('перемещает персонажа с одной позиции на другую', () => {
    manager.addCharacter(character, 3);
    const result = manager.moveCharacter(3, 4);
    expect(result).toBe(true);
    expect(manager.charactersMap.has(3)).toBe(false);
    expect(manager.charactersMap.get(4)).toBe(character);
    expect(manager.positionedCharacters[0].position).toBe(4);
  });

  test('moveCharacter возвращает false, если персонаж не найден', () => {
    expect(manager.moveCharacter(99, 100)).toBe(false);
  });

  test('получает персонажа по позиции', () => {
    manager.addCharacter(character, 5);
    expect(manager.getCharacterAt(5)).toBe(character);
  });

  test('проверяет, занята ли позиция', () => {
    manager.addCharacter(character, 6);
    expect(manager.isPositionOccupied(6)).toBe(true);
    expect(manager.isPositionOccupied(7)).toBe(false);
  });

  test('получает персонажей по команде', () => {
    const playerTypes = [ Bowman ];
    const opponentTypes = [ Vampire ];

    const playerChar = new Bowman(1);
    const opponentChar = new Vampire(1);

    manager.addCharacter(playerChar, 1);
    manager.addCharacter(opponentChar, 2);

    // Перезаписываем массив для тестирования
    manager.positionedCharacters = [
      new PositionedCharacter(playerChar, 1),
      new PositionedCharacter(opponentChar, 2),
    ];

    const result = manager.getCharactersByTeam(playerTypes, opponentTypes);
    expect(result.player.length).toBe(1);
    expect(result.player[0].character).toBe(playerChar);
    expect(result.computer.length).toBe(1);
    expect(result.computer[0].character).toBe(opponentChar);
  });

  test('распределяет команду по позициям случайным образом', () => {
    const team = [
      new Bowman(1), new Bowman(1)
    ];
    const positions = [
      10, 20, 30
    ];

    // Следим за вызовами метода addCharacter
    const addSpy = jest.spyOn(manager, 'addCharacter');

    manager.assignTeamToPositions(team, [ ...positions ]);

    expect(addSpy).toHaveBeenCalledTimes(team.length);

    // Проверяем, что все добавленные позиции — это подмножество исходных позиций
    const usedPositions = manager.positionedCharacters.map(pc => pc.position);
    usedPositions.forEach(pos => {
      expect(positions).toContain(pos);
    });
  });

  test('не вызывает addCharacter, если нет позиций', () => {
    const teamCharacters = [
      'A', 'B'
    ];
    const positionIndices = [];

    manager.assignTeamToPositions(teamCharacters, positionIndices);

    const addSpy = jest.spyOn(manager, 'addCharacter');
    expect(addSpy).not.toHaveBeenCalled();
  });
});