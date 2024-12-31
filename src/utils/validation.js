const gameConfig = require('../config/gameConfig');

const validation = {
    isValidGameId: (gameId) => {
        return typeof gameId === 'string' && 
               gameId.length === 6 && 
               /^[A-Z0-9]+$/.test(gameId);
    },

    isValidPlayerName: (name) => {
        return typeof name === 'string' && 
               name.length <= gameConfig.NAME_MAX_LENGTH && 
               /^[a-zA-Z]+$/.test(name);
    },

    isValidCardId: (cardId) => {
        return typeof cardId === 'string' && 
               /^(question|answer)_\d+$/.test(cardId);
    },

    validateCardData: (cards) => {
        if (!Array.isArray(cards)) {
            throw new Error('Cards must be an array');
        }

        cards.forEach((card, index) => {
            if (!card.text || typeof card.text !== 'string') {
                throw new Error(`Invalid card text at index ${index}`);
            }
        });

        return true;
    }
};

module.exports = validation;