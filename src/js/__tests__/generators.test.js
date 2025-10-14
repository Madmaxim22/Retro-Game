import { generateTeam, characterGenerator } from '../generators';
import Team from '../Team';
import Character from '../Character';

import Bowman from '../characters/Bowman';
import Daemon from '../characters/Daemon';
import Magician from '../characters/Magician';
import Swordsman from '../characters/Swordsman';
import Vampire from '../characters/Vampire';
import Undead from '../characters/Undead';

const allowedTypes = [
  Bowman,
  Swordsman,
  Magician,
  Daemon,
  Undead,
  Vampire,
];

const validTypes = [
  'bowman',
  'swordsman',
  'magician',
  'daemon',
  'undead',
  'vampire',
];

describe('Character creation tests', () => {
  test('Создание объекта Character выбрасывает исключение', () => {
    expect(() => new Character(1)).toThrow('The creation of the Character class is prohibited');
  });

  test('Создание наследников не выбрасывает исключений', () => {
    expect(() => new Bowman(1)).not.toThrow();
    expect(() => new Daemon(2)).not.toThrow();
    expect(() => new Magician(3)).not.toThrow();
    expect(() => new Swordsman(1)).not.toThrow();
    expect(() => new Vampire(2)).not.toThrow();
    expect(() => new Undead(3)).not.toThrow();
  });
});

describe('Initial character characteristics', () => {
  test('Создаваемые персонажи 1-го уровня содержат правильные характеристики', () => {
    const bowman = new Bowman(1);
    const daemon = new Daemon(1);
    const magician = new Magician(1);
    const swordsman = new Swordsman(1);
    const vampire = new Vampire(1);
    const undead = new Undead(1);

    expect(bowman.level).toBe(1);
    expect(daemon.level).toBe(1);
    expect(magician.level).toBe(1);
    expect(swordsman.level).toBe(1);
    expect(vampire.level).toBe(1);
    expect(undead.level).toBe(1);

    expect(bowman.health).toBe(50);
    expect(daemon.health).toBe(50);
    expect(magician.health).toBe(50);
    expect(swordsman.health).toBe(50);
    expect(vampire.health).toBe(50);
    expect(undead.health).toBe(50);
  });
});

describe('characterGenerator', () => {
  test('Генератор выдаёт бесконечно новые персонажи из списка allowedTypes', () => {
    const gen = characterGenerator(allowedTypes, 4);
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const character = gen.next().value;
      expect(allowedTypes).toContain(character.constructor);
      expect(character.level).toBeGreaterThanOrEqual(1);
      expect(character.level).toBeLessThanOrEqual(4);
      expect(validTypes).toContain(character.type);
    }
  });
});

describe('generateTeam', () => {
  test('Создаёт правильное количество персонажей в нужном диапазоне уровней', () => {
    const characterCount = 5;
    const maxLevel = 4;
    const team = generateTeam(allowedTypes, maxLevel, characterCount);
    expect(team).toBeInstanceOf(Team);
    expect(team.characters.length).toBe(characterCount);
    team.characters.forEach(character => {
      expect(allowedTypes).toContain(character.constructor);
      expect(character.level).toBeGreaterThanOrEqual(1);
      expect(character.level).toBeLessThanOrEqual(maxLevel);
      expect(validTypes).toContain(character.type);
    });
  });
});