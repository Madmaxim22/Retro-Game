import GameState from '../GameState';

describe('GameState', () => {
  const data = {
    currentTheme: 'prairie',
    currentTurn: 'player',
    characterPositions: [
      {
        index: 1, characterData: { level: 1 }
      }
    ],
    selectedCharacterIndex: 0,
    activeSelectCell: 1,
    gameOver: false,
    maxScore: 100,
  };

  test('Создает экземпляр из объекта', () => {
    const state = new GameState(data);
    expect(state.currentTheme).toBe('prairie');
    expect(state.characterPositions.length).toBe(1);
  });

  test('from возвращает экземпляр или null', () => {
    expect(GameState.from(data)).toBeInstanceOf(GameState);
    expect(GameState.from(null)).toBeNull();
  });
});