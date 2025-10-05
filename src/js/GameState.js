export default class GameState {
  constructor(nextTurn) {
    this.nextTurn = nextTurn; // 'player' или 'computer'
  }

  static from(object) {
    if (object && typeof object.nextTurn === 'string') {
      return new GameState(object.nextTurn);
    }
    return null;
  }
}
