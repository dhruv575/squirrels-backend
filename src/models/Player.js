const gameConfig = require('../config/gameConfig');

class Player {
    constructor(id, name, role = gameConfig.ROLES.PLAYER) {
        this.id = id;          // Socket ID
        this.name = name;      // Display name
        this.role = role;      // JUDGE or PLAYER
        this.points = 0;       // Score
        this.hand = [];        // Current cards in hand
        this.currentSubmission = null;  // Current round submission
        this.isConnected = true;
    }

    addToHand(card) {
        if (this.hand.length < gameConfig.HAND_SIZE) {
            this.hand.push(card);
        }
    }

    removeFromHand(cardId) {
        this.hand = this.hand.filter(card => card.id !== cardId);
    }

    submitCard(cardId) {
        const card = this.hand.find(c => c.id === cardId);
        if (card) {
            this.currentSubmission = card;
            this.removeFromHand(cardId);
            return true;
        }
        return false;
    }

    resetSubmission() {
        this.currentSubmission = null;
    }

    addPoint() {
        this.points += 1;
        return this.points;
    }

    // Validate player name according to game rules
    static validateName(name) {
        return (
            typeof name === 'string' &&
            name.length <= gameConfig.NAME_MAX_LENGTH &&
            /^[a-zA-Z]+$/.test(name)
        );
    }
}

module.exports = Player;