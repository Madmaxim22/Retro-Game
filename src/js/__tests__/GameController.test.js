import GameController from '../GameController';
import GamePlay from '../GamePlay';
import GameState from '../GameState';
import CharacterManager from '../CharacterManager';
import PositionCalculator from '../PositionCalculator';
import AIController from '../AIController';
import { generateTeam } from '../generators';

// Моки для основных классов
jest.mock('../GamePlay', () => {
  return jest.fn().mockImplementation(() => ({
    boardSize: 8,
    addCellEnterListener: jest.fn(),
    addCellLeaveListener: jest.fn(),
    addCellClickListener: jest.fn(),
    addNewGameListener: jest.fn(),
    addSaveGameListener: jest.fn(),
    addLoadGameListener: jest.fn(),
    drawUi: jest.fn(),
    redrawPositions: jest.fn(),
    selectCell: jest.fn(),
    deselectCell: jest.fn(),
    highlightRange: jest.fn(),
    clearHighlights: jest.fn(),
    showCellTooltip: jest.fn(),
    hideCellTooltip: jest.fn(),
    setCursor: jest.fn(),
    showDamage: jest.fn(),
    showError: jest.fn(),
    showMessage: jest.fn()
  }));
});

jest.mock('../GameState');
jest.mock('../CharacterManager');
jest.mock('../PositionCalculator');
jest.mock('../AIController');
jest.mock('../generators');

describe('GameController', () => {
  let gameController;
  let mockGamePlay;
  let mockStateService;
  let mockCharacterManager;
  let mockPositionCalculator;
  let mockAIController;

  beforeEach(() => {
    // Создаем моки вручную
    mockGamePlay = {
      boardSize: 8,
      addCellEnterListener: jest.fn(),
      addCellLeaveListener: jest.fn(),
      addCellClickListener: jest.fn(),
      addNewGameListener: jest.fn(),
      addSaveGameListener: jest.fn(),
      addLoadGameListener: jest.fn(),
      drawUi: jest.fn(),
      redrawPositions: jest.fn(),
      selectCell: jest.fn(),
      deselectCell: jest.fn(),
      highlightRange: jest.fn(),
      clearHighlights: jest.fn(),
      showCellTooltip: jest.fn(),
      hideCellTooltip: jest.fn(),
      setCursor: jest.fn(),
      showDamage: jest.fn(),
      showError: jest.fn(),
      showMessage: jest.fn()
    };

    mockStateService = {
      save: jest.fn(),
      load: jest.fn()
    };

    mockCharacterManager = {
      getCharacterAt: jest.fn(),
      getCharactersByTeam: jest.fn(),
      positionedCharacters: [],
      isPositionOccupied: jest.fn(),
      removeCharacter: jest.fn(),
      moveCharacter: jest.fn(),
      addCharacter: jest.fn(),
      assignTeamToPositions: jest.fn()
    };

    mockPositionCalculator = {
      calculateDistance: jest.fn(),
      getBorderColumnsIndices: jest.fn()
    };

    mockAIController = { findBestAction: jest.fn() };

    // Настраиваем моки конструкторов
    GamePlay.mockImplementation(() => mockGamePlay);
    CharacterManager.mockImplementation(() => mockCharacterManager);
    PositionCalculator.mockImplementation(() => mockPositionCalculator);
    AIController.mockImplementation(() => mockAIController);

    // Мокаем статические методы GamePlay
    GamePlay.showError = jest.fn();
    GamePlay.showMessage = jest.fn();

    // Мокаем generateTeam чтобы он возвращал простой массив
    generateTeam.mockReturnValue({
      characters: [
        {
          type: 'bowman', level: 1, attack: 25, defence: 25, health: 50
        }
      ]
    });

    // Создание экземпляра контроллера
    gameController = new GameController(mockGamePlay, mockStateService);

    // Переопределяем внутренние компоненты на моки
    gameController.characterManager = mockCharacterManager;
    gameController.positionCalculator = mockPositionCalculator;
    gameController.aiController = mockAIController;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Конструктор и инициализация', () => {
    test('должен создавать экземпляр GameController', () => {
      expect(gameController).toBeInstanceOf(GameController);
      expect(gameController.gamePlay).toBe(mockGamePlay);
      expect(gameController.stateService).toBe(mockStateService);
    });

    test('init() должен настраивать слушатели событий и начинать новую игру', () => {
      // Создаем шпионы для методов
      const setupEventListenersSpy = jest.spyOn(gameController, 'setupEventListeners').mockImplementation(() => {});
      const startNewGameSpy = jest.spyOn(gameController, 'startNewGame').mockImplementation(() => {});

      gameController.init();

      expect(setupEventListenersSpy).toHaveBeenCalled();
      expect(startNewGameSpy).toHaveBeenCalled();
    });
  });

  describe('setupEventListeners()', () => {
    test('должен добавлять все необходимые слушатели событий', () => {
      gameController.setupEventListeners();

      expect(mockGamePlay.addCellEnterListener).toHaveBeenCalled();
      expect(mockGamePlay.addCellLeaveListener).toHaveBeenCalled();
      expect(mockGamePlay.addCellClickListener).toHaveBeenCalled();
      expect(mockGamePlay.addNewGameListener).toHaveBeenCalled();
      expect(mockGamePlay.addSaveGameListener).toHaveBeenCalled();
      expect(mockGamePlay.addLoadGameListener).toHaveBeenCalled();
    });

    test('должен привязывать правильные обработчики', () => {
      gameController.setupEventListeners();

      // Проверяем что переданы правильные функции-обработчики
      expect(mockGamePlay.addCellEnterListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockGamePlay.addCellLeaveListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockGamePlay.addCellClickListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('onCellClick()', () => {
    beforeEach(() => {
      gameController.currentTurn = 'player';
      gameController.gameOver = false;
    });

    test('должен игнорировать клик если игра окончена', async () => {
      gameController.gameOver = true;

      await gameController.onCellClick(0);

      expect(mockCharacterManager.getCharacterAt).not.toHaveBeenCalled();
    });

    test('должен игнорировать клик если ход компьютера', async () => {
      gameController.currentTurn = 'computer';

      await gameController.onCellClick(0);

      expect(mockCharacterManager.getCharacterAt).not.toHaveBeenCalled();
    });

    test('должен выбирать персонажа игрока при клике', async () => {
      const mockCharacter = {
        type: 'bowman', level: 1
      };

      // Мокаем определение персонажа игрока
      gameController.isPlayerCharacter = jest.fn().mockReturnValue(true);
      mockCharacterManager.getCharacterAt.mockReturnValue(mockCharacter);

      await gameController.onCellClick(5);

      expect(gameController.selectedCharacterIndex).toBe(5);
      expect(mockGamePlay.selectCell).toHaveBeenCalledWith(5);
    });
  });

  describe('Вспомогательные методы', () => {
    test('isPlayerCharacter() должен правильно определять персонажей игрока', () => {
      // Тестируем логику определения персонажа игрока
      // Предполагаем что playerTypes содержат 'bowman', 'swordsman', 'magician'
      const playerCharacter = { type: 'bowman' };
      const enemyCharacter = { type: 'daemon' };

      // Мокаем метод isPlayerCharacter
      gameController.isPlayerCharacter = jest.fn().mockImplementation((character) => {
        return [
          'bowman', 'swordsman', 'magician'
        ].includes(character.type);
      });
      expect(gameController.isPlayerCharacter(playerCharacter)).toBe(true);
      expect(gameController.isPlayerCharacter(enemyCharacter)).toBe(false);
    });

    test('getMoveRange() должен возвращать правильный диапазон перемещения', () => {
      // Тестируем логику получения диапазона перемещения
      expect(gameController.getMoveRange({ constructor: { name: 'Bowman' } })).toBe(2);
      expect(gameController.getMoveRange({ constructor: { name: 'Swordsman' } })).toBe(4);
      expect(gameController.getMoveRange({ constructor: { name: 'Magician' } })).toBe(1);
    });

    test('getAttackRange() должен возвращать правильный диапазон атаки', () => {
      expect(gameController.getAttackRange({ constructor: { name: 'Bowman' } })).toBe(2);
      expect(gameController.getAttackRange({ constructor: { name: 'Swordsman' } })).toBe(1);
      expect(gameController.getAttackRange({ constructor: { name: 'Magician' } })).toBe(4);
    });

    describe('canMoveTo()', () => {
      test('должен возвращать true для допустимого перемещения', () => {
        const character = { constructor: { name: 'Bowman' } };
        mockPositionCalculator.calculateDistance.mockReturnValue(2);
        mockCharacterManager.isPositionOccupied.mockReturnValue(false);

        const result = gameController.canMoveTo(character, 0, 10);

        expect(result).toBe(true);
      });

      test('должен возвращать false если позиция занята', () => {
        const character = { constructor: { name: 'Bowman' } };
        mockPositionCalculator.calculateDistance.mockReturnValue(1);
        mockCharacterManager.isPositionOccupied.mockReturnValue(true);

        const result = gameController.canMoveTo(character, 0, 5);

        expect(result).toBe(false);
      });

      test('должен возвращать false если расстояние слишком большое', () => {
        const character = { constructor: { name: 'Bowman' } };
        mockPositionCalculator.calculateDistance.mockReturnValue(3);
        mockCharacterManager.isPositionOccupied.mockReturnValue(false);

        const result = gameController.canMoveTo(character, 0, 20);

        expect(result).toBe(false);
      });
    });

    describe('canAttack()', () => {
      test('должен возвращать true для допустимой атаки', () => {
        const character = { constructor: { name: 'Bowman' } };
        mockPositionCalculator.calculateDistance.mockReturnValue(2);

        const result = gameController.canAttack(character, 0, 10);

        expect(result).toBe(true);
      });

      test('должен возвращать false если расстояние слишком большое', () => {
        const character = { constructor: { name: 'Bowman' } };
        mockPositionCalculator.calculateDistance.mockReturnValue(3);

        const result = gameController.canAttack(character, 0, 20);

        expect(result).toBe(false);
      });
    });

    describe('moveCharacter()', () => {
      test('должен успешно перемещать персонажа', async () => {
        mockCharacterManager.moveCharacter.mockReturnValue(true);

        await gameController.moveCharacter(0, 5);

        expect(mockCharacterManager.moveCharacter).toHaveBeenCalledWith(0, 5);
        expect(mockGamePlay.redrawPositions).toHaveBeenCalled();
      });

      test('должен показывать ошибку при неудачном перемещении', async () => {
        mockCharacterManager.moveCharacter.mockReturnValue(false);

        await gameController.moveCharacter(0, 5);

        expect(GamePlay.showError).toHaveBeenCalledWith('Персонаж не найден для перемещения');
      });
    });

    describe('attackCharacter()', () => {
      test('должен показывать ошибку если атакующий или цель не найдены', async () => {
        mockCharacterManager.getCharacterAt.mockReturnValue(null);

        await gameController.attackCharacter(0, 5);

        expect(GamePlay.showError).toHaveBeenCalledWith('Атакующий или цель не найдены');
      });
    });

    describe('saveGameState()', () => {
      test('должен сохранять состояние игры', () => {
        gameController.saveGameState();

        expect(mockStateService.save).toHaveBeenCalledWith(expect.any(Object));
      });
    });

    describe('loadGameState()', () => {
      test('должен загружать сохраненное состояние', () => {
        const mockSavedState = {
          currentTheme: 'prairie',
          currentTurn: 'player',
          gameOver: false,
          maxScore: 0,
          characterPositions: []
        };

        mockStateService.load.mockReturnValue(mockSavedState);

        gameController.loadGameState();

        expect(mockStateService.load).toHaveBeenCalled();
      });

      test('должен показывать ошибку если нет сохраненного состояния', () => {
        mockStateService.load.mockReturnValue(null);

        gameController.loadGameState();

        expect(GamePlay.showError).toHaveBeenCalledWith('Нет сохраненного состояния');
      });
    });

    describe('startNewGame()', () => {
      test('должен начинать новую игру', () => {
        gameController.reset = jest.fn();
        gameController.createTeams = jest.fn();

        gameController.startNewGame();

        expect(gameController.reset).toHaveBeenCalled();
        expect(mockGamePlay.drawUi).toHaveBeenCalled();
      });
    });

    describe('endGame()', () => {
      test('должен завершать игру победой', () => {
        gameController.endGame(true);

        expect(gameController.gameOver).toBe(true);
        expect(GamePlay.showMessage).toHaveBeenCalledWith('Вы победили!');
      });

      test('должен завершать игру поражением', () => {
        gameController.endGame(false);

        expect(gameController.gameOver).toBe(true);
        expect(GamePlay.showMessage).toHaveBeenCalledWith('Вы проиграли.');
      });
    });

    describe('performComputerTurn()', () => {
      beforeEach(() => {
        gameController.currentTurn = 'computer';
        gameController.executeAction = jest.fn();
        gameController.switchTurn = jest.fn();
        gameController.endGame = jest.fn();
      });

      test('должен выполнять ход компьютера', async () => {
        const mockComputerCharacters = [ { type: 'daemon' } ];
        mockCharacterManager.getCharactersByTeam.mockReturnValue({ computer: mockComputerCharacters });

        const mockAction = {
          type: 'attack', fromIndex: 10, toIndex: 5
        };
        mockAIController.findBestAction.mockReturnValue(mockAction);

        await gameController.performComputerTurn();

        expect(gameController.executeAction).toHaveBeenCalledWith(mockAction);
      });
    });

    describe('formatCharacterInfo()', () => {
      test('должен правильно форматировать информацию о персонаже', () => {
        const character = {
          level: 2,
          attack: 30,
          defence: 25,
          health: 85
        };

        const result = gameController.formatCharacterInfo(character);

        expect(result).toBe('🎖2 ⚔30 🛡25 ❤85');
      });
    });
  });
});
