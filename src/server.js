const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const Game = require('./models/Game');
const gameConfig = require('./config/gameConfig');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const allowedOrigins = "https://swithoutm.com" || "http://localhost:3000";

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Store active games
const games = new Map();

// Load card data
async function loadCardData() {
    try {
        const questionCardsPath = path.join(__dirname, '../data/questionCards.json');
        const answerCardsPath = path.join(__dirname, '../data/answerCards.json');

        const [questionCardsData, answerCardsData] = await Promise.all([
            fs.readFile(questionCardsPath, 'utf8'),
            fs.readFile(answerCardsPath, 'utf8')
        ]);

        return {
            questionCards: JSON.parse(questionCardsData),
            answerCards: JSON.parse(answerCardsData)
        };
    } catch (error) {
        console.error('Error loading card data:', error);
        throw error;
    }
}

// Generate a random game ID
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new game
    socket.on('createGame', async ({ playerName }) => {
        try {
            const gameId = generateGameId();
            const cardData = await loadCardData();
            
            const game = new Game(gameId, cardData.questionCards, cardData.answerCards);
            const player = game.addPlayer(socket.id, playerName);
            console.log(`Created game ${gameId} with host ${playerName}, role: ${player.role}`); // Debug log
            
            games.set(gameId, game);
            socket.join(gameId);
            
            socket.emit('gameCreated', {
                gameId,
                gameState: game.getGameState(socket.id)
            });
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    // Join an existing game
    socket.on('joinGame', async ({ gameId, playerName }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Game not found');
            }
    
            game.addPlayer(socket.id, playerName);
            socket.join(gameId);
    
            // Notify all players in the game
            for (const player of game.players.keys()) {
                io.to(player).emit('playerJoined', {
                    gameState: game.getGameState(player) // Send personalized game state
                });
            }
        } catch (error) {
            socket.emit('error', error.message);
        }
    });    

    // Start game
    socket.on('startGame', ({ gameId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Game not found');
            }

            // Start the game and get updated game states
            const gameStates = game.startGame();

            // Emit updated states to all players
            for (const [playerId, gameState] of Object.entries(gameStates)) {
                io.to(playerId).emit('gameUpdated', { gameState });
            }
        } catch (error) {
            console.error("Error starting game:", error.message);
            socket.emit('error', error.message);
        }
    });
 
    // Start the next round
    socket.on('startNextRound', ({ gameId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Game not found');
            }
    
            const result = game.startNewRound();
    
            if (result.phase === gameConfig.PHASES.GAME_END) {
                // Emit game ended event
                io.to(gameId).emit('gameEnded', {
                    winner: result.winner,
                    players: result.players,
                });
                return;
            }
    
            // Emit updated game states to all players
            for (const playerId of game.players.keys()) {
                io.to(playerId).emit('gameUpdated', {
                    gameState: game.getGameState(playerId),
                });
            }
        } catch (error) {
            console.error('Error starting next round:', error.message);
            socket.emit('error', error.message);
        }
    });
    

    // Submit question (judge)
    socket.on('submitQuestion', ({ gameId, cardId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Game not found');
            }
    
            game.submitQuestion(socket.id, cardId);
    
            // Notify all players in the game about the updated state
            for (const player of game.players.keys()) {
                io.to(player).emit('gameUpdated', {
                    gameState: game.getGameState(player),
                });
            }
        } catch (error) {
            socket.emit('error', error.message);
        }
    });
    
    

    // Submit answer (player)
    socket.on('submitAnswer', ({ gameId, cardId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Game not found');
            }
    
            game.submitAnswer(socket.id, cardId);
    
            // Emit updated game state to all players
            for (const playerId of game.players.keys()) {
                const playerGameState = game.getGameState(playerId);
                io.to(playerId).emit('gameUpdated', { gameState: playerGameState });
            }
    
            // Check if all players have submitted and phase changed
            if (game.phase === gameConfig.PHASES.JUDGE_SELECT) {
                console.log('All players submitted. Notifying players of phase transition.');
                io.to(gameId).emit('phaseChanged', { phase: game.phase });
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            socket.emit('error', error.message);
        }
    });    

    // Select winner (judge)
    socket.on('selectWinner', ({ gameId, playerId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                console.error(`SelectWinner Error: Game ${gameId} not found.`);
                throw new Error('Game not found');
            }

            const result = game.selectWinner(socket.id, playerId); // Returns roundOverData

            // Use the result to emit data to all players
            io.to(gameId).emit('roundOver', {
                winnerId: result.winnerId,
                winnerName: result.winnerName,
                winnerCard: result.winnerCard,
                questionCard: result.questionCard,
                players: result.players, // Already prepared in the result
            });

            console.log('Round Over Data emitted:', result);
        } catch (error) {
            console.error(`SelectWinner Error: ${error.message}`);
            socket.emit('error', error.message);
        }
    });
  

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find and handle any games the player was in
        for (const [gameId, game] of games.entries()) {
            if (game.players.has(socket.id)) {
                const gameEnded = game.removePlayer(socket.id);
                
                if (gameEnded) {
                    io.to(gameId).emit('gameEnded', {
                        reason: 'Player disconnected',
                        gameState: game.getGameState(socket.id)
                    });
                    games.delete(gameId);
                } else {
                    io.to(gameId).emit('playerLeft', {
                        gameState: game.getGameState(socket.id)
                    });
                }
                
                break;
            }
        }
    });
});

// Clean up inactive games periodically
setInterval(() => {
    for (const [gameId, game] of games.entries()) {
        if (game.phase === gameConfig.PHASES.GAME_END) {
            games.delete(gameId);
        }
    }
}, 300000); // Clean up every 5 minutes

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});