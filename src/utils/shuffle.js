/**
 * Collection of shuffling algorithms for different game purposes
 */

const shuffle = {
    /**
     * Fisher-Yates (Knuth) shuffle algorithm
     * Time complexity: O(n)
     * @param {Array} array Array to shuffle
     * @returns {Array} New shuffled array
     */
    fisherYates: (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Shuffles array in place using Fisher-Yates
     * @param {Array} array Array to shuffle
     */
    fisherYatesInPlace: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    /**
     * Shuffles an array while keeping track of original indices
     * Useful for when you need to know the original position of items
     * @param {Array} array Array to shuffle
     * @returns {Array} Array of objects with value and originalIndex
     */
    trackedShuffle: (array) => {
        const tracked = array.map((value, index) => ({
            value,
            originalIndex: index
        }));
        
        for (let i = tracked.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tracked[i], tracked[j]] = [tracked[j], tracked[i]];
        }
        
        return tracked;
    },

    /**
     * Randomly selects n items from an array without replacement
     * @param {Array} array Source array
     * @param {number} n Number of items to select
     * @returns {Array} Array of n randomly selected items
     */
    randomSelect: (array, n) => {
        if (n > array.length) {
            throw new Error('Cannot select more items than array length');
        }
        
        const shuffled = shuffle.fisherYates(array);
        return shuffled.slice(0, n);
    },

    /**
     * Creates a random order for players
     * Useful for determining play order at the start of a game
     * @param {Array} playerIds Array of player IDs
     * @returns {Array} Shuffled array of player IDs
     */
    randomizePlayerOrder: (playerIds) => {
        return shuffle.fisherYates([...playerIds]);
    },

    /**
     * Shuffles submissions for anonymous display
     * @param {Map} submissions Map of player submissions
     * @returns {Array} Array of shuffled submissions
     */
    shuffleSubmissions: (submissions) => {
        const submissionArray = Array.from(submissions.entries());
        return shuffle.fisherYates(submissionArray);
    }
};

module.exports = shuffle;