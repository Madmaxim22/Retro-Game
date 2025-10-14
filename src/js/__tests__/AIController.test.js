import AIController from '../AIController';
import Bowman from '../characters/Bowman';
import Swordsman from '../characters/Swordsman';

describe('AIController', () => {
  let characterManager;
  let positionCalculator;
  const playerTypes = [];
  const opponentTypes = [];

  beforeEach(() => {
    characterManager = {
      getCharactersByTeam: jest.fn(),
      isPositionOccupied: jest.fn(),
    };
    positionCalculator = {
      calculateDistance: jest.fn(),
      calculateNextPosition: jest.fn(),
    };
  });

  test('выбирает атаку при наличии цели', () => {
    const compChar = {
      position: 2, character: {
        health: 50, constructor: { name: 'Bowman' }
      }
    } ;
    const enemies = [
      {
        position: 1, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      },
      {
        position: 3, character: {
          health: 30, constructor: { name: 'Undead' }
        }
      },
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance.mockImplementation((from, to) => Math.abs(from - to));

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    const action = ai.findBestAction([ compChar ]);

    expect(action.type).toBe('attack');
    expect(action.toIndex).toBe(3);
  });

  test('выбирает перемещение, если атака невозможна', () => {
    const compChar = {
      position: 0, character: {
        health: 50, constructor: { name: 'Bowman' }
      }
    };
    const enemies = [
      {
        position: 10, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      }
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: [ compChar ]
    });
    positionCalculator.calculateDistance.mockImplementation((from, to) => Math.abs(from - to));
    positionCalculator.calculateNextPosition = jest.fn().mockReturnValue(2);
    characterManager.isPositionOccupied.mockReturnValue(false);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    const action = ai.findBestAction([ compChar ]);

    expect(action.type).toBe('move');
    expect(action.toIndex).toBe(2);
  });

  test('возвращает null, если целей и ходов нет', () => {
    const compChar = {
      position: 0, character: {
        health: 50, constructor: { name: 'Bowman' }
      }
    };
    characterManager.getCharactersByTeam.mockReturnValue({
      player: [], computer: [ compChar ]
    });
    positionCalculator.calculateDistance.mockReturnValue(5);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    expect(ai.findBestAction([ compChar ])).toBeNull();
  });

  test('выбирает врага с минимальным расстоянием для хода', () => {
    const fromIndex = 5;
    const character = { constructor: { name: 'Bowman' } };
    const enemies = [
      {
        position: 3, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      },
      {
        position: 8, character: {
          health: 30, constructor: { name: 'Undead' }
        }
      },
      {
        position: 1, character: {
          health: 70, constructor: { name: 'Magician' }
        }
      },
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4);
    positionCalculator.calculateNextPosition.mockReturnValue(6);
    characterManager.isPositionOccupied.mockReturnValue(false);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    ai.findMoveAction(fromIndex, character);

    expect(positionCalculator.calculateDistance).toHaveBeenCalledWith(fromIndex, 3);
    expect(positionCalculator.calculateNextPosition).toHaveBeenCalledWith(fromIndex, 3, expect.any(Number));
  });

  test('выбирает первого врага при равных расстояниях', () => {
    const fromIndex = 5;
    const character = { constructor: { name: 'Swordsman' } };
    const enemies = [
      {
        position: 4, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      },
      {
        position: 6, character: {
          health: 30, constructor: { name: 'Undead' }
        }
      },
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance.mockReturnValue(1);
    positionCalculator.calculateNextPosition.mockReturnValue(4);
    characterManager.isPositionOccupied.mockReturnValue(false);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    ai.findMoveAction(fromIndex, character);

    expect(positionCalculator.calculateNextPosition).toHaveBeenCalledWith(fromIndex, 4, expect.any(Number));
  });

  test('обработка reduce с начальным значением при выборе врага', () => {
    const fromIndex = 10;
    const character = { constructor: { name: 'Daemon' } };
    const enemies = [
      {
        position: 15, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      },
      {
        position: 12, character: {
          health: 30, constructor: { name: 'Undead' }
        }
      },
      {
        position: 8, character: {
          health: 70, constructor: { name: 'Magician' }
        }
      },
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance
      .mockImplementation((from, to) => Math.abs(from - to));
    positionCalculator.calculateNextPosition.mockReturnValue(9);
    characterManager.isPositionOccupied.mockReturnValue(false);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    ai.findMoveAction(fromIndex, character);

    expect(positionCalculator.calculateNextPosition).toHaveBeenCalledWith(fromIndex, 12, expect.any(Number));
  });

  test('не перемещается, если следующая позиция занята', () => {
    const fromIndex = 5;
    const character = { constructor: { name: 'Bowman' } };
    const enemies = [
      {
        position: 3, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      }
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance.mockReturnValue(2);
    positionCalculator.calculateNextPosition.mockReturnValue(4);
    characterManager.isPositionOccupied.mockReturnValue(true);

    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    const result = ai.findMoveAction(fromIndex, character);

    expect(result).toBeNull();
    expect(characterManager.isPositionOccupied).toHaveBeenCalledWith(4);
  });

  test('не перемещается, если дистанция превышает диапазон', () => {
    const fromIndex = 0;
    const character = { constructor: { name: 'Bowman' } };
    const enemies = [
      {
        position: 10, character: {
          health: 50, constructor: { name: 'Vampire' }
        }
      }
    ];

    characterManager.getCharactersByTeam.mockReturnValue({
      player: enemies, computer: []
    });
    positionCalculator.calculateDistance
      .mockImplementation((from, to) => Math.abs(from - to))
      .mockReturnValueOnce(3);

    positionCalculator.calculateNextPosition.mockReturnValue(3);
    const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
    const result = ai.findMoveAction(fromIndex, character);

    expect(result).toBeNull();
  });

  describe('findAttackTarget', () => {
    const fromIndex = 5;
    const character = { constructor: { name: 'Archer' } };

    test('возвращает врага с наименьшим здоровьем среди доступных целей', () => {
      const enemies = [
        {
          position: 4, character: { health: 50 }
        },
        {
          position: 6, character: { health: 20 }
        },
        {
          position: 7, character: { health: 30 }
        },
      ];

      // Мокаем получение врагов и расчет расстояний
      characterManager.getCharactersByTeam.mockReturnValue({ player: enemies });
      positionCalculator.calculateDistance.mockImplementation((from, to) => Math.abs(from - to));

      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
      const target = ai.findAttackTarget(fromIndex, character);

      // Ожидаем, что выбран враг с health 20 (минимальный)
      expect(target).toEqual(enemies[1]);
    });

    test('возвращает null, если целей нет в диапазоне', () => {
      const enemies = [
        {
          position: 10, character: { health: 50 }
        },
      ];

      characterManager.getCharactersByTeam.mockReturnValue({ player: enemies });
      positionCalculator.calculateDistance.mockReturnValue(5);

      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
      expect(ai.findAttackTarget(fromIndex, character)).toBeNull();
    });

    test('выбирает врага с минимальным здоровьем при нескольких кандидатах', () => {
      const enemies = [
        {
          position: 4, character: { health: 40 }
        },
        {
          position: 6, character: { health: 10 }
        },
        {
          position: 7, character: { health: 20 }
        },
      ];

      characterManager.getCharactersByTeam.mockReturnValue({ player: enemies });
      positionCalculator.calculateDistance.mockImplementation((from, to) => Math.abs(from - to));

      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
      const target = ai.findAttackTarget(fromIndex, character);

      expect(target).toEqual(enemies[1]); // враг с health 10
    });
  });
  describe('getAttackRange', () => {
    test('возвращает правильное значение для известных персонажей', () => {
      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);

      expect(ai.getAttackRange(new Bowman(1))).toBe(2);
      expect(ai.getAttackRange(new Swordsman(1))).toBe(1);
    });

    test('возвращает 1 для неизвестных персонажей', () => {
      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
      expect(ai.getAttackRange({ constructor: { name: 'Unknown' } })).toBe(1);
      expect(ai.getAttackRange({ constructor: { name: 'NonExistent' } })).toBe(1);
    });
  });

  describe('getMoveRange', () => {
    test('возвращает правильное значение для известных персонажей', () => {
      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);

      expect(ai.getMoveRange(new Bowman(1))).toBe(2);
      expect(ai.getMoveRange(new Swordsman(1))).toBe(4);
    });

    test('возвращает 1 для неизвестных персонажей', () => {
      const ai = new AIController(characterManager, positionCalculator, playerTypes, opponentTypes);
      expect(ai.getMoveRange({ constructor: { name: 'Unknown' } })).toBe(1);
      expect(ai.getMoveRange({ constructor: { name: 'NonExistent' } })).toBe(1);
    });
  });
});