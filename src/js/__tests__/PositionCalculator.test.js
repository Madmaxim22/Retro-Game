import PositionCalculator from '../PositionCalculator';

describe('PositionCalculator', () => {
  const boardSize = 4;
  let characterManager;

  beforeEach(() => {
    characterManager = { isPositionOccupied: jest.fn() };
  });

  test('calculateDistance считает правильно', () => {
    const calc = new PositionCalculator(boardSize, characterManager);
    expect(calc.calculateDistance(0, 5)).toBe(1);
    expect(calc.calculateDistance(0, 0)).toBe(0);
  });

  describe('getBorderColumnsIndices', () => {
    const calc = new PositionCalculator(4, {});
    const cases = [
      [
        'first', [
          0, 1, 4, 5, 8, 9, 12, 13
        ]
      ],
      [
        'second', [
          2, 3, 6, 7, 10, 11, 14, 15
        ]
      ],
    ];

    test.each(cases)('для side=%s возвращает правильные индексы', (side, expected) => {
      expect(calc.getBorderColumnsIndices(side)).toEqual(expected);
    });

    test('по умолчанию возвращает индексы первой колонки', () => {
      expect(calc.getBorderColumnsIndices()).toEqual([
        0, 1, 4, 5, 8, 9, 12, 13
      ]);
    });
  });

  describe('calculateNextPosition', () => {
    let calc;

    beforeEach(() => {
      characterManager.isPositionOccupied.mockReturnValue(false);
      calc = new PositionCalculator(boardSize, characterManager);
    });

    test('возвращает target, если он в пределах moveRange', () => {
      const fromIndex = 0;
      const toIndex = 5; // (1,1)
      const moveRange = 2;
      const next = calc.calculateNextPosition(fromIndex, toIndex, moveRange);
      expect(next).toBe(5);
    });

    test('возвращает fromIndex, если дистанция равна 0', () => {
      const fromIndex = 12; // (3,0)
      const toIndex = 12;
      const moveRange = 3;
      const resultIndex = calc.calculateNextPosition(fromIndex, toIndex, moveRange);
      expect(resultIndex).toBe(fromIndex);
    });

    test('возвращает fromIndex, если все позиции заняты', () => {
      characterManager.isPositionOccupied.mockReturnValue(true);
      const fromIndex = 0;
      const toIndex = 5;
      const moveRange = 3;
      const resultIndex = calc.calculateNextPosition(fromIndex, toIndex, moveRange);
      expect(resultIndex).toBe(fromIndex);
    });
  });

  describe('другие проверки', () => {
    test.each([
      [
        0, 0
      ],
      [
        5, 1
      ],
      [
        10, 2
      ],
      [
        15, 3
      ]
    ])('calculateDistance(%i, %i) возвращает правильное значение', (a, b) => {
      const calc = new PositionCalculator(boardSize, characterManager);
      expect(calc.calculateDistance(a, b))
        .toBe(
          Math.max(Math.abs(Math.floor(a / boardSize) - Math.floor(b / boardSize)),
            Math.abs((a % boardSize) - (b % boardSize)))
        );
    });

    test('getBorderColumnsIndices возвращает правильные границы для других размеров', () => {
      const calc = new PositionCalculator(3, {});
      expect(calc.getBorderColumnsIndices('first')).toContain(0);
      expect(calc.getBorderColumnsIndices('last')).toContain(2);
    });
  });
});