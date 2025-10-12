import GameState from './GameState';

export default class GameStateService {
  constructor(storage) {
    this.storage = storage;
  }

  save(state) {
    this.storage.setItem('state', JSON.stringify(state));
  }

  load() {
    try {
      const stateData = JSON.parse(this.storage.getItem('state'));
      return stateData ? GameState.from(stateData) : null;
    } catch (e) {
      return null; // при ошибке возвращайте null
    }
  }
}
