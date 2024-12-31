# Squirrels Without Morality Backend

This repository contains the backend for **Squirrels Without Morality**, a Penn-themed parody of Cards Against Humanity. It is built with Node.js, Socket.IO, and Express, and serves as the real-time game server for the application.

## Features
- Real-time communication with Socket.IO
- Flexible CORS configuration for local and production environments
- Game logic for managing players, rounds, and card decks
- Supports dynamic card shuffling, drawing, and discarding
- Handles game phases: `JUDGE_PICK`, `PLAYERS_PICK`, `JUDGE_SELECT`, `ROUND_OVER`, and `GAME_END`

## Folder Structure
```
backend/
├── src/
│   ├── config/       # Configuration files (e.g., gameConfig.js)
│   ├── models/       # Game models (e.g., Game, Round, Deck)
│   ├── utils/        # Utility functions (e.g., shuffle.js)
│   ├── server.js     # Main server entry point
│
├── data/             # Card data (e.g., questionCards.json, answerCards.json)
├── .env              # Environment variables (not committed)
├── Procfile          # Heroku process file
├── package.json      # Project metadata and dependencies
```

## Key Endpoints
This backend primarily communicates via WebSocket (Socket.IO). Below are the key Socket.IO events:

### Events Handled
- `createGame`: Creates a new game.
- `joinGame`: Joins an existing game.
- `startGame`: Starts the game.
- `submitQuestion`: Judge submits a question card.
- `submitAnswer`: Player submits an answer card.
- `selectWinner`: Judge selects a winning answer.
- `startNextRound`: Starts the next round.

### Events Emitted
- `gameUpdated`: Sends the updated game state.
- `roundOver`: Announces the winner of a round.
- `gameEnded`: Announces the game winner.
- `error`: Sends error messages.
