const gameConfig = require('../config/gameConfig');

class Round {
    constructor(roundNumber, judgeId) {
        this.roundNumber = roundNumber;
        this.judgeId = judgeId;
        this.phase = gameConfig.PHASES.JUDGE_PICK;
        this.selectedQuestion = null;
        this.submissions = new Map(); // playerId -> card
        this.winner = null;
        this.timeoutId = null;
        
        // Timestamps for timing management
        this.phaseStartTime = Date.now();
        this.phaseEndTime = null;
    }

    setQuestion(card) {
        this.selectedQuestion = card;
        this.phase = gameConfig.PHASES.PLAYERS_PICK;
        this.phaseStartTime = Date.now();
    }

    addSubmission(playerId, card) {
        if (this.phase === gameConfig.PHASES.PLAYERS_PICK) {
            this.submissions.set(playerId, card);
            console.log(`Submission added for player ${playerId}:`, card);
            return true;
        }
        console.error(`Cannot add submission: Incorrect phase (${this.phase})`);
        return false;
    }    

    getAllSubmissions() {
        return Array.from(this.submissions.entries()).map(([playerId, card]) => ({
            playerId,
            card
        }));
    }

    getShuffledSubmissions() {
        const submissions = this.getAllSubmissions();
        // Shuffle submissions for anonymous display
        for (let i = submissions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [submissions[i], submissions[j]] = [submissions[j], submissions[i]];
        }
        return submissions;
    }

    setWinner(playerId) {
        if (this.submissions.has(playerId)) {
            this.winner = playerId;
            console.log(`Winner set: Player ${playerId}`);
            this.phase = gameConfig.PHASES.ROUND_END;
            return true;
        }
        console.error(`Failed to set winner: No submission found for player ${playerId}`);
        return false;
    }
    

    isComplete() {
        return this.phase === gameConfig.PHASES.ROUND_END;
    }

    // Check if the current phase has timed out
    checkTimeout() {
        const now = Date.now();
        const elapsed = now - this.phaseStartTime;

        switch (this.phase) {
            case gameConfig.PHASES.JUDGE_PICK:
                return elapsed >= gameConfig.JUDGE_QUESTION_TIME;
            case gameConfig.PHASES.PLAYERS_PICK:
                return elapsed >= gameConfig.PLAYER_ANSWER_TIME;
            case gameConfig.PHASES.JUDGE_SELECT:
                return elapsed >= gameConfig.JUDGE_SELECTION_TIME;
            default:
                return false;
        }
    }

    // Handle automatic actions when time runs out
    handleTimeout() {
        switch (this.phase) {
            case gameConfig.PHASES.JUDGE_PICK:
                // Auto-select a random question
                return { action: 'AUTO_QUESTION' };
            case gameConfig.PHASES.PLAYERS_PICK:
                // Move to judge selection phase
                this.phase = gameConfig.PHASES.JUDGE_SELECT;
                this.phaseStartTime = Date.now();
                return { action: 'START_SELECTION' };
            case gameConfig.PHASES.JUDGE_SELECT:
                // Auto-select a random winner
                const submissions = this.getAllSubmissions();
                if (submissions.length > 0) {
                    const randomIndex = Math.floor(Math.random() * submissions.length);
                    const randomWinner = submissions[randomIndex].playerId;
                    this.setWinner(randomWinner);
                    return { action: 'AUTO_WINNER', winner: randomWinner };
                }
                return { action: 'SKIP_ROUND' };
            default:
                return { action: 'NONE' };
        }
    }
}

module.exports = Round;