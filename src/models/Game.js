const gameConfig = require('../config/gameConfig');
const { QuestionDeck, AnswerDeck } = require('./Deck');
const Player = require('./Player');
const Round = require('./Round');

class Game {
    constructor(gameId, questionCards, answerCards) {
        this.gameId = gameId;
        this.phase = gameConfig.PHASES.LOBBY;
        this.players = new Map();
        this.questionDeck = new QuestionDeck(questionCards);
        this.answerDeck = new AnswerDeck(answerCards);
        this.currentRound = null;
        this.roundNumber = 0;
        this.judgeIndex = -1;
        this.timeoutHandle = null;
    }

    emitGameStateUpdate() {
        for (const playerId of this.players.keys()) {
            const playerGameState = this.getGameState(playerId);
            io.to(playerId).emit('gameUpdated', { gameState: playerGameState });
        }
    }    

    addPlayer(playerId, playerName) {
        if (!Player.validateName(playerName)) {
            throw new Error('Invalid player name');
        }

        if (this.players.size >= gameConfig.MAX_PLAYERS) {
            throw new Error('Game is full');
        }

        if (this.phase !== gameConfig.PHASES.LOBBY) {
            throw new Error('Game already in progress');
        }

        const role = this.players.size === 0 ? gameConfig.ROLES.JUDGE : gameConfig.ROLES.PLAYER;
        console.log(`Adding player ${playerName} with role ${role}`); // Debug log
        
        const player = new Player(playerId, playerName, role);
        this.players.set(playerId, player);

        return player;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            // Return cards to appropriate decks
            if (player.role === gameConfig.ROLES.JUDGE) {
                player.hand.forEach(card => this.questionDeck.discard(card));
            } else {
                player.hand.forEach(card => this.answerDeck.discard(card));
            }
            this.players.delete(playerId);

            // End game if not enough players
            if (this.players.size < gameConfig.MIN_PLAYERS) {
                this.endGame('Not enough players');
                return true;
            }

            // If judge left during game, end the game
            if (player.role === gameConfig.ROLES.JUDGE && this.phase !== gameConfig.PHASES.LOBBY) {
                this.endGame('Judge disconnected');
                return true;
            }
        }
        return false;
    }

    startGame() {
        if (this.players.size < gameConfig.MIN_PLAYERS) {
            throw new Error('Not enough players');
        }
    
        if (this.phase !== gameConfig.PHASES.LOBBY) {
            throw new Error('Game already in progress');
        }
    
        // Deal initial hands to players
        for (const player of this.players.values()) {
            if (player.role === gameConfig.ROLES.JUDGE) {
                player.hand = this.questionDeck.drawMultiple(gameConfig.HAND_SIZE);
            } else {
                player.hand = this.answerDeck.drawMultiple(gameConfig.HAND_SIZE);
            }
        }
    
        console.log(
            "Dealt hands:",
            Array.from(this.players.values()).map((player) => ({
                name: player.name,
                role: player.role,
                hand: player.hand,
            }))
        );
    
        // Transition to the first round
        return this.startNewRound();
    }    

    startNewRound() {
        // Check for a winner
        const winner = Array.from(this.players.values()).find(
            (player) => player.points >= gameConfig.WIN_POINTS
        );
    
        if (winner) {
            this.phase = gameConfig.PHASES.GAME_END;
            console.log(`Game ended. Winner: ${winner.name}`);
    
            return {
                phase: this.phase,
                winner: {
                    id: winner.id,
                    name: winner.name,
                    points: winner.points,
                },
                players: Array.from(this.players.values()).map((player) => ({
                    id: player.id,
                    name: player.name,
                    points: player.points,
                })),
            };
        }
    
        // Proceed with starting a new round
        this.roundNumber++;
        this.rotateJudge();
    
        const judge = this.getCurrentJudge();
        if (!judge) {
            throw new Error("No judge found for the new round");
        }
    
        this.currentRound = new Round(this.roundNumber, judge.id);
        this.phase = gameConfig.PHASES.JUDGE_PICK;
    
        // Reset player submissions and refill hands
        for (const player of this.players.values()) {
            player.currentSubmission = null;
    
            if (player.role !== gameConfig.ROLES.JUDGE) {
                const cardsNeeded = 5 - player.hand.length;
                if (cardsNeeded > 0) {
                    const newCards = this.answerDeck.drawMultiple(cardsNeeded);
                    if (newCards.length > 0) {
                        player.hand.push(...newCards);
                    } else {
                        console.error("Not enough cards in the answer deck to refill hands.");
                    }
                }
            }
        }
    
        console.log(
            `Starting new round ${this.roundNumber}. Judge: ${judge.name}, Phase: ${this.phase}`
        );
    
        return this.getAllGameStates();
    }    
    
    getAllGameStates() {
        const gameStates = {};
        for (const playerId of this.players.keys()) {
            gameStates[playerId] = this.getGameState(playerId);
        }
        return gameStates;
    }    

    rotateJudge() {
        const playerIds = Array.from(this.players.keys());
        this.judgeIndex = (this.judgeIndex + 1) % playerIds.length;
        
        // Update player roles
        for (const [index, playerId] of playerIds.entries()) {
            const player = this.players.get(playerId);
            const newRole = index === this.judgeIndex ? gameConfig.ROLES.JUDGE : gameConfig.ROLES.PLAYER;
            
            if (player.role !== newRole) {
                // Return old cards to appropriate deck
                if (player.role === gameConfig.ROLES.JUDGE) {
                    player.hand.forEach(card => this.questionDeck.discard(card));
                } else {
                    player.hand.forEach(card => this.answerDeck.discard(card));
                }
                
                // Update role and draw new hand
                player.role = newRole;
                player.hand = newRole === gameConfig.ROLES.JUDGE 
                    ? this.questionDeck.drawMultiple(gameConfig.HAND_SIZE)
                    : this.answerDeck.drawMultiple(gameConfig.HAND_SIZE);
            }
        }
    }    

    getCurrentJudge() {
        for (const player of this.players.values()) {
            if (player.role === gameConfig.ROLES.JUDGE) {
                return player;
            }
        }
        throw new Error('No judge found');
    }

    submitQuestion(judgeId, cardId) {
        const judge = this.players.get(judgeId);
        if (!judge || judge.role !== gameConfig.ROLES.JUDGE) {
            throw new Error('Not authorized');
        }
    
        const card = judge.hand.find(c => c.id === cardId);
        if (!card) {
            throw new Error('Card not found');
        }
    
        // Set the selected question in the current round
        this.currentRound.setQuestion(card);
        judge.removeFromHand(cardId);
        judge.addToHand(this.questionDeck.draw());
    
        // Transition to the next phase
        this.phase = gameConfig.PHASES.PLAYERS_PICK;
        this.setPhaseTimeout();
    
        console.log(`Question selected: ${card.text}`);
        console.log(`Game phase after question selection: ${this.phase}`); // Debug log
        return card;
    }    
    

    submitAnswer(playerId, cardId) {
        const player = this.players.get(playerId);
        if (!player || player.role === gameConfig.ROLES.JUDGE) {
            throw new Error('Not authorized');
        }
    
        if (this.phase !== gameConfig.PHASES.PLAYERS_PICK) {
            throw new Error('Wrong phase');
        }
    
        const success = player.submitCard(cardId);
        if (success) {
            this.currentRound.addSubmission(playerId, player.currentSubmission);
    
            // Check if all players have submitted
            const submissions = this.currentRound.getAllSubmissions();
            const expectedSubmissions = Array.from(this.players.values())
                .filter(p => p.role !== gameConfig.ROLES.JUDGE).length;
    
            if (submissions.length === expectedSubmissions) {
                this.phase = gameConfig.PHASES.JUDGE_SELECT;
                this.setPhaseTimeout();
            }
        }
    
        return success;
    }    

    selectWinner(judgeId, winnerId) {
        const judge = this.players.get(judgeId);
        if (!judge || judge.role !== gameConfig.ROLES.JUDGE) {
            throw new Error("Only the judge can select a winner");
        }
    
        const winner = this.players.get(winnerId);
        if (!winner) {
            throw new Error("Winner not found");
        }
    
        const winnerCard = Array.from(this.currentRound.submissions.entries())
            .find(([playerId]) => playerId === winnerId)?.[1];
    
        if (!winnerCard) {
            throw new Error("Winner card not found");
        }
    
        // Increment winner's points
        winner.points++;
        this.currentRound.winner = winnerId;
        this.currentRound.phase = gameConfig.PHASES.ROUND_END;
    
        console.log(`Winner set: Player ${winnerId}`);
    
        // Check if the game should end
        if (winner.points >= gameConfig.WIN_POINTS) {
            this.phase = gameConfig.PHASES.GAME_END;
            console.log(`Game ended. Winner: ${winner.name}`);
        }
    
        return {
            winnerId: winner.id,
            winnerName: winner.name,
            winnerCard: winnerCard.text,
            questionCard: this.currentRound.selectedQuestion?.text,
            players: Array.from(this.players.values()).map((player) => ({
                id: player.id,
                name: player.name,
                points: player.points,
            })),
        };
    }
    
    
    setPhaseTimeout() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }

        let timeout;
        switch (this.phase) {
            case gameConfig.PHASES.JUDGE_PICK:
                timeout = gameConfig.JUDGE_QUESTION_TIME;
                break;
            case gameConfig.PHASES.PLAYERS_PICK:
                timeout = gameConfig.PLAYER_ANSWER_TIME;
                break;
            case gameConfig.PHASES.JUDGE_SELECT:
                timeout = gameConfig.JUDGE_SELECTION_TIME;
                break;
            default:
                return;
        }

        this.timeoutHandle = setTimeout(() => this.handleTimeout(), timeout);
    }

    handleTimeout() {
        if (!this.currentRound) return;
    
        const timeoutAction = this.currentRound.handleTimeout();
        switch (timeoutAction.action) {
            case 'AUTO_QUESTION':
                const judge = this.getCurrentJudge();
                if (judge.hand.length > 0) {
                    const randomCard = judge.hand[Math.floor(Math.random() * judge.hand.length)];
                    this.submitQuestion(judge.id, randomCard.id);
                }
                break;
    
            case 'START_SELECTION':
                this.phase = gameConfig.PHASES.JUDGE_SELECT;
                break;
    
            case 'AUTO_WINNER':
                const submissions = this.currentRound.getAllSubmissions();
                if (submissions.length > 0) {
                    const randomSubmission = submissions[Math.floor(Math.random() * submissions.length)];
                    this.selectWinner(this.getCurrentJudge().id, randomSubmission.playerId);
                } else {
                    this.startNewRound();
                }
                break;
    
            case 'SKIP_ROUND':
                this.startNewRound();
                break;
        }
    
        // Return updated game states for server.js to emit
        return this.getAllGameStates();
    }    

    endGame(reason) {
        this.phase = gameConfig.PHASES.GAME_END;
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        return reason;
    }

    getGameState(playerId) {
        const player = this.players.get(playerId);
        if (!player) return null;
    
        const gameState = {
            gameId: this.gameId,
            phase: this.phase,
            roundNumber: this.roundNumber,
            currentPlayer: {
                ...player,
                hand: player.hand // Include the player's hand here
            },
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                role: p.role,
                points: p.points,
                hasSubmitted: this.currentRound?.submissions.has(p.id) || false
            }))
        };
    
        if (this.currentRound) {
            gameState.round = {
                question: this.currentRound.selectedQuestion,
                // Include submissions for all players
                submissions: this.currentRound.getAllSubmissions(),
                winner: this.currentRound.winner
            };
        }
    
        return gameState;
    }    
     
}

module.exports = Game;