class Deck {
    constructor(cards) {
        this.cards = cards.map((card, index) => ({
            ...card,
            id: `${card.type}_${index}` // Unique ID for each card
        }));
        this.discardPile = [];
        this.shuffle();
    }

    shuffle() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.reshuffleDiscards();
        }
        return this.cards.pop();
    }

    drawMultiple(count) {
        const cards = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) {
                cards.push(card);
            }
        }
        return cards;
    }

    discard(card) {
        this.discardPile.push(card);
    }

    discardMultiple(cards) {
        this.discardPile.push(...cards);
    }

    reshuffleDiscards() {
        if (this.discardPile.length === 0) {
            return;
        }
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
    }

    getRemainingCount() {
        return this.cards.length;
    }

    getDiscardCount() {
        return this.discardPile.length;
    }
}

class QuestionDeck extends Deck {
    constructor(cards) {
        super(cards.map(card => ({
            ...card,
            type: 'question'
        })));
    }
}

class AnswerDeck extends Deck {
    constructor(cards) {
        super(cards.map(card => ({
            ...card,
            type: 'answer'
        })));
    }
}

module.exports = {
    QuestionDeck,
    AnswerDeck
};