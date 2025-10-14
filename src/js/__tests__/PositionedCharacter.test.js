import PositionedCharacter from '../PositionedCharacter';
import Bowman from '../characters/Bowman';
import Swordsman from '../characters/Swordsman';
import Character from '../Character';

describe('PositionedCharacter', () => {
  const validCharacter = new Bowman(1);
  const validPosition = 5;

  describe('конструктор - позитивные случаи', () => {
    test.each([
      [
        'обычный character и position', validCharacter, validPosition
      ],
      [
        'position = 0', validCharacter, 0
      ],
      [
        'отрицательный position', validCharacter, -5
      ],
      [
        'дробный position', validCharacter, 5.5
      ],
      [
        'минимальное безопасное целое', validCharacter, Number.MIN_SAFE_INTEGER
      ],
      [
        'максимальное безопасное целое', validCharacter, Number.MAX_SAFE_INTEGER
      ],
      [
        'Bowman (наследник Character)', new Bowman(2), 1
      ],
      [
        'Swordsman (наследник Character)', new Swordsman(3), 2
      ],
    ])('должен создавать экземпляр для случая: %s', (_, character, position) => {
      const positionedCharacter = new PositionedCharacter(character, position);

      expect(positionedCharacter.character).toBe(character);
      expect(positionedCharacter.position).toBe(position);
    });
  });

  describe('конструктор - некорректный character', () => {
    test.each([
      [
        'обычный объект', { name: 'Invalid' }
      ],
      [
        'null', null
      ],
      [
        'undefined', undefined
      ],
      [
        'строка', 'character'
      ],
      [
        'число', 123
      ],
      [
        'массив', []
      ],
      [
        'булево значение', true
      ],
    ])('должен выбрасывать ошибку если character: %s', (_, invalidCharacter) => {
      expect(() => {
        new PositionedCharacter(invalidCharacter, validPosition);
      }).toThrow('character must be instance of Character or its children');
    });
  });

  describe('конструктор - некорректный position', () => {
    test.each([
      [
        'строка', '5'
      ],
      [
        'null', null
      ],
      [
        'undefined', undefined
      ],
      [
        'объект', {}
      ],
      [
        'массив', []
      ],
      [
        'булево значение', true
      ],
      [
        'функция', () => {}
      ],
      [
        'Symbol', Symbol('test')
      ],
    ])('должен выбрасывать ошибку если position: %s', (_, invalidPosition) => {
      expect(() => {
        new PositionedCharacter(validCharacter, invalidPosition);
      }).toThrow('position must be a number');
    });
  });

  describe('доступ к свойствам character', () => {
    test.each([
      [
        'level', 1
      ],
      [
        'attack', 25
      ],
      [
        'defence', 25
      ],
      [
        'health', 50
      ],
    ])('должен позволять доступ к свойству %s', (property, expectedValue) => {
      const positionedCharacter = new PositionedCharacter(validCharacter, validPosition);

      expect(positionedCharacter.character[property]).toBe(expectedValue);
    });

    test('должен сохранять ссылку на character при изменении свойств', () => {
      const character = new Bowman(1);
      const positionedCharacter = new PositionedCharacter(character, validPosition);

      // Изменяем свойства оригинального character
      character.health = 30;
      character.attack = 20;

      expect(positionedCharacter.character.health).toBe(30);
      expect(positionedCharacter.character.attack).toBe(20);
    });
  });

  describe('валидация наследования Character', () => {
    test.each([
      [
        'Bowman', new Bowman(2)
      ],
      [
        'Swordsman', new Swordsman(3)
      ],
    ])('должен принимать %s как экземпляр Character', (_, character) => {
      expect(() => {
        new PositionedCharacter(character, validPosition);
      }).not.toThrow();

      const positionedCharacter = new PositionedCharacter(character, validPosition);
      expect(positionedCharacter.character).toBeInstanceOf(Character);
    });
  });

  describe('комбинированные негативные случаи', () => {
    test.each([
      [
        'некорректный character и некорректный position', { invalid: 'object' }, 'invalid'
      ],
      [
        'null character и null position', null, null
      ],
      [
        'undefined character и undefined position', undefined, undefined
      ],
    ])('должен выбрасывать ошибку для случая: %s', (_, invalidCharacter, invalidPosition) => {
      expect(() => {
        new PositionedCharacter(invalidCharacter, invalidPosition);
      }).toThrow();
    });
  });

  describe('специфические числовые случаи', () => {
    test.each([
      [
        'NaN', NaN
      ],
      [
        'Infinity', Infinity
      ],
      [
        '-Infinity', -Infinity
      ],
      [
        'очень маленькое число', -1e20
      ],
      [
        'очень большое число', 1e20
      ],
    ])('должен принимать position как %s', (_, position) => {
      // NaN, Infinity и т.д. все равно являются числами по типу
      const positionedCharacter = new PositionedCharacter(validCharacter, position);

      expect(typeof positionedCharacter.position).toBe('number');
      expect(positionedCharacter.position).toBe(position);
    });
  });
});