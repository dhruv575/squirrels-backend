const gameConfig = {
    MAX_PLAYERS: 8,
    MIN_PLAYERS: 3,
    HAND_SIZE: 5,
    WIN_POINTS: 5,
    NAME_MAX_LENGTH: 10,
    
    // Time limits (in milliseconds)
    JUDGE_QUESTION_TIME: 20000,
    PLAYER_ANSWER_TIME: 60000,
    JUDGE_SELECTION_TIME: 60000,
    
    // Game phases
    PHASES: {
        LOBBY: 'LOBBY',
        JUDGE_PICK: 'JUDGE_PICK',
        PLAYERS_PICK: 'PLAYERS_PICK',
        JUDGE_SELECT: 'JUDGE_SELECT',
        ROUND_OVER: 'ROUND_OVER',
        GAME_END: 'GAME_END'
    },
    
    // Player roles
    ROLES: {
        JUDGE: 'JUDGE',
        PLAYER: 'PLAYER'
    }
};

console.log('Game config loaded, ROLES:', gameConfig.ROLES); // Debug log

module.exports = gameConfig;