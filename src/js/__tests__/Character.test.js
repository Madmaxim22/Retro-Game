import Character from '../Character';

describe('Класс Character', () => {
  test('Попытка создать экземпляр базового класса вызывает ошибку', () => {
    expect(() => new Character(1)).toThrow('The creation of the Character class is prohibited');
  });

  test('Создание наследника класса Character не вызывает ошибок', () => {
    class TestCharacter extends Character {}
    expect(() => new TestCharacter(1, 'bowman')).not.toThrow();
  });

  test('Установка и получение свойства type', () => {
    class TestCharacter extends Character {}
    const char = new TestCharacter(1, 'bowman');
    expect(char.type).toBe('bowman');

    // Попытка установить недопустимый тип вызывает ошибку
    expect(() => { char.type = 'invalidType'; }).toThrow(/Invalid type/);

    // Установка допустимого типа
    expect(() => { char.type = 'vampire'; }).not.toThrow();
    expect(char.type).toBe('vampire');
  });

  test('Установка и получение свойства health', () => {
    class TestCharacter extends Character {}
    const char = new TestCharacter(1, 'bowman');

    // Установка корректного значения
    expect(() => { char.health = 100; }).not.toThrow();
    expect(char.health).toBe(100);

    // Установка некорректного значения (не число)
    expect(() => { char.health = 'bad'; }).toThrow(/Invalid type/);
  });

  test('Установка и получение свойства level', () => {
    class TestCharacter extends Character {}
    const char = new TestCharacter(1, 'bowman');

    // корректные значения
    expect(() => { char.level = 2; }).not.toThrow();
    expect(char.level).toBe(2);

    // некорректные значения
    expect(() => { char.level = 0; }).toThrow(/Invalid type/);
    expect(() => { char.level = 5; }).toThrow(/Invalid type/);
    expect(() => { char.level = 'bad'; }).toThrow(/Invalid type/);
  });

  test('Установка и получение свойства attack', () => {
    class TestCharacter extends Character {}
    const char = new TestCharacter(1, 'bowman');

    // корректное значение
    expect(() => { char.attack = 30; }).not.toThrow();
    expect(char.attack).toBe(30);

    // некорректное значение
    expect(() => { char.attack = 'bad'; }).toThrow(/Invalid type/);
  });

  test('Установка и получение свойства defence', () => {
    class TestCharacter extends Character {}
    const char = new TestCharacter(1, 'bowman');

    // корректное значение
    expect(() => { char.defence = 15; }).not.toThrow();
    expect(char.defence).toBe(15);

    // некорректное значение
    expect(() => { char.defence = 'bad'; }).toThrow(/Invalid type/);
  });
});