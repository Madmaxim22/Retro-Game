export default class PositionCalculator {
  constructor(boardSize, characterManager) {
      this.boardSize = boardSize;
      this.characterManager = characterManager;
    }
  
    calculateDistance(fromIndex, toIndex) {
      const fromRow = Math.floor(fromIndex / this.boardSize);
      const fromCol = fromIndex % this.boardSize;
      const toRow = Math.floor(toIndex / this.boardSize);
      const toCol = toIndex % this.boardSize;
      return Math.max(Math.abs(fromRow - toRow), Math.abs(fromCol - toCol));
    }
  
    getBorderColumnsIndices(side = 'first') {
      const indices = [];
      const isFirstColumn = side === 'first';
  
      for (let row = 0; row < this.boardSize; row++) {
        const baseIndex = row * this.boardSize;
        indices.push(
          baseIndex + (isFirstColumn ? 0 : this.boardSize - 2),
          baseIndex + (isFirstColumn ? 1 : this.boardSize - 1)
        );
      }
      return indices;
    }
  
    calculateNextPosition(fromIndex, toIndex, moveRange) {
      const fromRow = Math.floor(fromIndex / this.boardSize);
      const fromCol = fromIndex % this.boardSize;
      const toRow = Math.floor(toIndex / this.boardSize);
      const toCol = toIndex % this.boardSize;
  
      const deltaRow = toRow - fromRow;
      const deltaCol = toCol - fromCol;
  
      const distance = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));
      if (distance === 0) return fromIndex;
  
      // Пробуем разные варианты шагов, начиная с максимально возможного
      for (let step = Math.min(moveRange, distance); step > 0; step--) {
        const stepRow = Math.round((deltaRow / distance) * step);
        const stepCol = Math.round((deltaCol / distance) * step);
  
        const newRow = Math.max(0, Math.min(this.boardSize - 1, fromRow + stepRow));
        const newCol = Math.max(0, Math.min(this.boardSize - 1, fromCol + stepCol));
  
        const newIndex = newRow * this.boardSize + newCol;
  
        // Проверяем, что позиция свободна и не является исходной
        if (newIndex !== fromIndex && !this.characterManager.isPositionOccupied(newIndex)) {
          return newIndex;
        }
      }
  
      // Если не нашли подходящую позицию, остаемся на месте
      return fromIndex;
    }
}