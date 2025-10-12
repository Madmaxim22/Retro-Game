import PositionedCharacter from './PositionedCharacter';

export default class CharacterManager {
  constructor() {
    this.charactersMap = new Map();
    this.positionedCharacters = [];
  }

  addCharacter(character, position) {
    this.charactersMap.set(position, character);
    this.positionedCharacters.push(new PositionedCharacter(character, position));
  }

  removeCharacter(position) {
    this.charactersMap.delete(position);
    this.positionedCharacters = this.positionedCharacters.filter(
      posChar => posChar.position !== position
    );
  }

  moveCharacter(fromIndex, toIndex) {
    const characterPos = this.positionedCharacters.find(
      posChar => posChar.position === fromIndex
    );

    if (!characterPos) return false;

    this.charactersMap.delete(fromIndex);
    this.charactersMap.set(toIndex, characterPos.character);
    characterPos.position = toIndex;
    return true;
  }

  getCharacterAt(position) {
    return this.charactersMap.get(position);
  }

  isPositionOccupied(position) {
    return this.charactersMap.has(position);
  }

  getCharactersByTeam(playerTypes, opponentTypes) {
    return {
      player: this.positionedCharacters.filter(pc =>
        playerTypes.some(type => pc.character instanceof type)
      ),
      computer: this.positionedCharacters.filter(pc =>
        opponentTypes.some(type => pc.character instanceof type)
      )
    };
  }

  assignTeamToPositions(teamCharacters, positionIndices) {
    const availablePositions = [ ...positionIndices ];

    for (const character of teamCharacters) {
      if (availablePositions.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions.splice(randomIndex, 1)[0];
      this.addCharacter(character, position);
    }
  }
}