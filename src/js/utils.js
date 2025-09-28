/**
 * @todo
 * @param index - индекс поля
 * @param boardSize - размер квадратного поля (в длину или ширину)
 * @returns строка - тип ячейки на поле:
 *
 * top-left
 * top-right
 * top
 * bottom-left
 * bottom-right
 * bottom
 * right
 * left
 * center
 *
 * @example
 * ```js
 * calcTileType(0, 8); // 'top-left'
 * calcTileType(1, 8); // 'top'
 * calcTileType(63, 8); // 'bottom-right'
 * calcTileType(7, 7); // 'left'
 * ```
 * */
export function calcTileType(index, boardSize) {
  // TODO: ваш код будет тут
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;

  const isTop = row === 0;
  const isBottom = row === boardSize - 1;
  const isLeft = col === 0;
  const isRight = col === boardSize - 1;

  if (isTop && isLeft) return 'top-left';
  if (isTop && isRight) return 'top-right';
  if (isBottom && isLeft) return 'bottom-left';
  if (isBottom && isRight) return 'bottom-right';

  if (isTop) return 'top';
  if (isBottom) return 'bottom';
  if (isLeft) return 'left';
  if (isRight) return 'right';

  return 'center';
}

export function calcHealthLevel(health) {
  if (health < 15) {
    return 'critical';
  }

  if (health < 50) {
    return 'normal';
  }

  return 'high';
}
