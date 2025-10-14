import Team from '../Team';
import Bowman from '../characters/Bowman';
import Swordsman from '../characters/Swordsman';
import Magician from '../characters/Magician';

describe('Класс Team', () => {
  test('Создается команда с массивом персонажей', () => {
    const character1 = new Bowman(1);
    const character2 = new Swordsman(2);
    const team = new Team([
      character1, character2
    ]);

    expect(team.characters).toEqual([
      character1, character2
    ]);
  });

  test('По умолчанию команда создается с пустым массивом', () => {
    const team = new Team();
    expect(team.characters).toEqual([]);
  });

  test('Можно добавлять новых персонажей в команду', () => {
    const team = new Team();
    const character = new Magician(1);
    team.characters.push(character);
    expect(team.characters).toContain(character);
  });

  test('Массив characters содержит экземпляры персонажей', () => {
    const characters = [
      new Bowman(1),
      new Swordsman(2),
      new Magician(3),
    ];
    const team = new Team(characters);

    team.characters.forEach((char, index) => {
      expect(char).toBeInstanceOf(Object);
      expect(char).toHaveProperty('level');
      expect(char).toHaveProperty('type');
    });
  });
});