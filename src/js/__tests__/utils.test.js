import { calcTileType, calcHealthLevel } from '../utils.js';

describe('calcTileType', () => {
  const size = 8;

  test.each([
    [
      0, 'top-left'
    ],
    [
      1, 'top'
    ],
    [
      7, 'top-right'
    ],
    [
      8, 'left'
    ],
    [
      15, 'right'
    ],
    [
      18, 'center'
    ],
    [
      56, 'bottom-left'
    ],
    [
      62, 'bottom'
    ], // исправленный индекс
    [
      63, 'bottom-right'
    ],
  ])('index %i should be %s', (index, expected) => {
    expect(calcTileType(index, size)).toBe(expected);
  });
});

describe('calcHealthLevel', () => {
  test.each([
    [
      10, 'critical'
    ],
    [
      20, 'normal'
    ],
    [
      49, 'normal'
    ],
    [
      50, 'high'
    ],
    [
      100, 'high'
    ],
  ])('health %i should be %s', (health, expected) => {
    expect(calcHealthLevel(health)).toBe(expected);
  });
});