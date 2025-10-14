import GameStateService from '../GameStateService';
import GameState from '../GameState';

// Mock для GameState
jest.mock('../GameState', () => ({ from: jest.fn(), }));

describe('GameStateService', () => {
  let storage;
  let gameStateService;

  beforeEach(() => {
    storage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
    gameStateService = new GameStateService(storage);
    jest.clearAllMocks();
  });

  describe('конструктор', () => {
    test('должен создавать экземпляр с переданным storage', () => {
      expect(gameStateService.storage).toBe(storage);
    });

    test.each([
      [
        'объект localStorage', {
          setItem: jest.fn(), getItem: jest.fn()
        }
      ],
      [
        'объект sessionStorage', {
          setItem: jest.fn(), getItem: jest.fn()
        }
      ],
      [
        'кастомный storage объект', {
          setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn()
        }
      ],
    ])('должен работать с %s', (_, customStorage) => {
      const service = new GameStateService(customStorage);
      expect(service.storage).toBe(customStorage);
    });
  });

  describe('save', () => {
    test.each([
      [
        'простой объект состояния', {
          level: 1, score: 100
        }
      ],
      [
        'сложный объект с вложенными данными', {
          level: 2,
          characters: [
            {
              type: 'bowman', health: 50
            }
          ],
          currentPlayer: 'user'
        }
      ],
      [
        'пустой объект', {}
      ],
      [
        'объект с null значениями', {
          level: null, score: null
        }
      ],
      [
        'объект с undefined значениями', {
          level: undefined, data: undefined
        }
      ],
    ])('должен сохранять состояние: %s', (_, state) => {
      gameStateService.save(state);

      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith('state', JSON.stringify(state));
    });

    test('должен корректно сериализовать состояние в JSON', () => {
      const state = {
        level: 3, score: 500
      };

      gameStateService.save(state);

      const expectedJson = JSON.stringify(state);
      expect(storage.setItem).toHaveBeenCalledWith('state', expectedJson);
    });

    test('должен перезаписывать предыдущее состояние', () => {
      const firstState = { level: 1 };
      const secondState = { level: 2 };

      gameStateService.save(firstState);
      gameStateService.save(secondState);

      expect(storage.setItem).toHaveBeenCalledTimes(2);
      expect(storage.setItem).toHaveBeenLastCalledWith('state', JSON.stringify(secondState));
    });
  });

  describe('load', () => {
    describe('успешная загрузка', () => {
      test.each([
        [
          'валидный JSON в storage', '{"level":1,"score":100}'
        ],
        [
          'JSON с null значениями', '{"level":null,"score":null}'
        ],
        [
          'JSON с пустым объектом', '{}'
        ],
        [
          'JSON с массивом', '[1,2,3]'
        ],
        [
          'JSON с вложенными объектами', '{"game":{"level":2},"players":["user"]}'
        ],
      ])('должен загружать состояние для случая: %s', (_, jsonData) => {
        storage.getItem.mockReturnValue(jsonData);
        const mockGameState = { level: 1 };
        GameState.from.mockReturnValue(mockGameState);

        const result = gameStateService.load();

        expect(storage.getItem).toHaveBeenCalledWith('state');
        expect(GameState.from).toHaveBeenCalledWith(JSON.parse(jsonData));
        expect(result).toBe(mockGameState);
      });

      test('должен вызывать GameState.from с распарсенными данными', () => {
        const stateData = {
          level: 2, score: 300
        };
        storage.getItem.mockReturnValue(JSON.stringify(stateData));

        gameStateService.load();

        expect(GameState.from).toHaveBeenCalledWith(stateData);
      });
    });

    describe('пустое хранилище', () => {
      test.each([
        [
          'null', null
        ],
        [
          'undefined', undefined
        ],
        [
          'пустая строка', ''
        ],
        [
          'только пробелы', '   '
        ],
      ])('должен возвращать null если в storage: %s', (_, storageValue) => {
        storage.getItem.mockReturnValue(storageValue);

        const result = gameStateService.load();

        expect(result).toBeNull();
        expect(GameState.from).not.toHaveBeenCalled();
      });
    });

    describe('ошибки парсинга', () => {
      describe('невалидный JSON', () => {
        test.each([
          [
            'невалидный JSON', '{invalid json}'
          ],
          [
            'частичный JSON', '{"level":1'
          ],
          [
            'только открывающая скобка', '{'
          ],
          [
            'незакрытая кавычка', '{"level":1"'
          ],
          [
            'неправильный синтаксис', 'level:1}'
          ],
          [
            'HTML вместо JSON', '<html><body></body></html>'
          ],
        ])('должен возвращать null при ошибке парсинга: %s', (_, invalidJson) => {
          storage.getItem.mockReturnValue(invalidJson);

          const result = gameStateService.load();

          expect(result).toBeNull();
          expect(GameState.from).not.toHaveBeenCalled();
        });
      });

      describe('валидный JSON но неподходящий тип', () => {
        test.each([
          [
            'число вместо объекта', '123'
          ],
          [
            'булево значение', 'true'
          ],
          [
            'строка', '"hello"'
          ],
          [
            'массив', '[1,2,3]'
          ],
        ])('должен возвращать null для неподходящего типа: %s', (_, validJson) => {
          storage.getItem.mockReturnValue(validJson);
          // Эмулируем что GameState.from выбрасывает ошибку для неподходящих типов
          GameState.from.mockImplementation(() => {
            throw new Error('Invalid state data');
          });

          const result = gameStateService.load();

          expect(result).toBeNull();
          expect(GameState.from).toHaveBeenCalled();
        });

        // Отдельный тест для null, так как он обрабатывается особо
        test('должен возвращать null для null значения', () => {
          storage.getItem.mockReturnValue('null');

          const result = gameStateService.load();

          expect(result).toBeNull();
          expect(GameState.from).not.toHaveBeenCalled();
        });
      });

      test('должен возвращать null при любом исключении', () => {
        storage.getItem.mockImplementation(() => {
          throw new Error('Storage error');
        });

        const result = gameStateService.load();

        expect(result).toBeNull();
      });
    });

    describe('цепочка вызовов', () => {
      test('должен вызывать методы в правильном порядке', () => {
        const jsonData = '{"level":1}';
        storage.getItem.mockReturnValue(jsonData);
        GameState.from.mockReturnValue({ level: 1 });

        const result = gameStateService.load();

        // Проверяем что storage.getItem был вызван
        expect(storage.getItem).toHaveBeenCalled();
        // Проверяем что GameState.from был вызван с правильными данными
        expect(GameState.from).toHaveBeenCalledWith(JSON.parse(jsonData));
        expect(result).toEqual({ level: 1 });
      });
    });
  });

  describe('интеграционные сценарии', () => {
    test('должен корректно сохранять и загружать состояние', () => {
      const stateToSave = {
        level: 5, characters: [ { type: 'magician' } ]
      };
      const savedJson = JSON.stringify(stateToSave);

      // Сохраняем состояние
      gameStateService.save(stateToSave);

      // Эмулируем что storage вернет сохраненные данные
      storage.getItem.mockReturnValue(savedJson);
      GameState.from.mockReturnValue(stateToSave);

      // Загружаем состояние
      const loadedState = gameStateService.load();

      expect(storage.setItem).toHaveBeenCalledWith('state', savedJson);
      expect(GameState.from).toHaveBeenCalledWith(stateToSave);
      expect(loadedState).toBe(stateToSave);
    });

    test('должен возвращать null при поврежденных данных после сохранения', () => {
      const validState = { level: 1 };

      // Сохраняем валидное состояние
      gameStateService.save(validState);

      // Эмулируем что storage вернет поврежденные данные
      storage.getItem.mockReturnValue('corrupted{data');

      const result = gameStateService.load();

      expect(result).toBeNull();
    });
  });
});