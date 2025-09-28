const validTypes = [
  'bowman',
  'swordsman',
  'magician',
  'daemon',
  'undead',
  'vampire',
];
/**
 * Базовый класс, от которого наследуются классы персонажей
 * @property level - уровень персонажа, от 1 до 4
 * @property attack - показатель атаки
 * @property defence - показатель защиты
 * @property health - здоровье персонажа
 * @property type - строка с одним из допустимых значений:
 * swordsman
 * bowman
 * magician
 * daemon
 * undead
 * vampire
 */
export default class Character {
  #type;
  #health;
  #level;
  #attack;
  #defence;

  constructor(level, type = 'generic') {
    if (new.target.name != 'Character') {
      this.level = level;
      this.attack = 0;
      this.defence = 0;
      this.health = 50;
      this.type = type;
    } else {
      // TODO: выбросите исключение, если кто-то использует "new Character()"
      throw new Error('The creation of the Character class is prohibited');
    }
  }

  set type(value) {
    if (validTypes.includes(value)) {
      this.#type = value;
    } else {
      throw new Error(
        `Invalid type: ${value}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  get type() {
    return this.#type;
  }

  set health(value) {
    if (typeof value === 'number') {
      this.#health = value;
    } else {
      throw new Error(`Invalid type: ${value}, must be number`);
    }
  }
  get health() {
    return this.#health;
  }

  set level(value) {
    if (typeof value === 'number' && value > 0 && value <= 4) {
      this.#level = value;
    } else {
      throw new Error(`Invalid type: ${value}, must be number`);
    }
  }

  get level() {
    return this.#level;
  }

  set attack(value) {
    if (typeof value === 'number') {
      this.#attack = value;
    } else {
      throw new Error(`Invalid type: ${value}, must be number`);
    }
  }

  get attack() {
    return this.#attack;
  }

  set defence(value) {
    if (typeof value === 'number') {
      this.#defence = value;
    } else {
      throw new Error(`Invalid type: ${value}, must be number`);
    }
  }

  get defence() {
    return this.#defence;
  }
}
