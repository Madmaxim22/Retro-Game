export default class GameState {
  constructor(
    { currentTheme, currentTurn, characterPositions, selectedCharacterIndex, activeSelectCell, gameOver, maxScore }
  ) {
    this.currentTheme = currentTheme;
    this.currentTurn = currentTurn;
    this.characterPositions = characterPositions; // массив объектов { index, characterData }
    this.selectedCharacterIndex = selectedCharacterIndex;
    this.activeSelectCell = activeSelectCell;
    this.gameOver = gameOver;
    this.maxScore = maxScore || 0; // добавляем максимум очков
  }

  static from(object) {
    if (object) {
      return new GameState(object);
    }
    return null;
  }
}
