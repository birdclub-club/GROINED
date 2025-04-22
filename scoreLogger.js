class ScoreLogger {
    constructor() {
        console.log('ScoreLogger initialized');
        this.scores = [];
        this.loadScores();
        console.log('Initial scores:', this.scores);
    }

    // Load scores from localStorage if they exist
    loadScores() {
        try {
            const savedScores = localStorage.getItem('gameScores');
            console.log('Loaded from localStorage:', savedScores);
            if (savedScores) {
                this.scores = JSON.parse(savedScores);
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            this.scores = [];
        }
    }

    // Save scores to localStorage
    saveScores() {
        try {
            localStorage.setItem('gameScores', JSON.stringify(this.scores));
            console.log('Saved scores:', this.scores);
        } catch (error) {
            console.error('Error saving scores:', error);
        }
    }

    // Log a new score with additional metadata
    logScore(score, wager, payout, timestamp = new Date()) {
        console.log('Logging new score:', { score, wager, payout, timestamp });
        const scoreEntry = {
            score,
            wager,
            payout,
            timestamp: timestamp.toISOString()
        };
        
        this.scores.push(scoreEntry);
        this.saveScores();
        
        // Log to console for immediate feedback
        console.log('Score logged:', scoreEntry);
    }

    // Get all scores
    getAllScores() {
        console.log('Current scores:', this.scores);
        return this.scores;
    }

    // Get scores within a date range
    getScoresInRange(startDate, endDate) {
        return this.scores.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });
    }

    // Clear all scores
    clearScores() {
        this.scores = [];
        this.saveScores();
    }

    // Export scores as CSV
    exportScoresAsCSV() {
        if (this.scores.length === 0) return '';
        
        const headers = ['Score', 'Wager', 'Payout', 'Timestamp'];
        const rows = this.scores.map(entry => [
            entry.score,
            entry.wager,
            entry.payout,
            entry.timestamp
        ]);
        
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }
}

// Create a global instance
const scoreLogger = new ScoreLogger();

// Export the instance
window.scoreLogger = scoreLogger;

// Add a test score to verify it's working
scoreLogger.logScore(100, 10, 20);
console.log('Test score added. Current scores:', scoreLogger.getAllScores()); 