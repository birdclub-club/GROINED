const fs = require('fs');
const path = require('path');

// Function to read and parse localStorage data
function readLocalStorage() {
    try {
        // Path to the localStorage file (this is the default location for Chrome)
        const localStoragePath = path.join(
            process.env.HOME,
            'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb'
        );

        // Read all .log files in the directory
        const files = fs.readdirSync(localStoragePath)
            .filter(file => file.endsWith('.log'));

        let scores = [];
        
        files.forEach(file => {
            const filePath = path.join(localStoragePath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Look for gameScores in the content
            if (content.includes('gameScores')) {
                const match = content.match(/"gameScores":"([^"]+)"/);
                if (match) {
                    try {
                        const decoded = JSON.parse(JSON.parse(`"${match[1]}"`));
                        scores = decoded;
                    } catch (e) {
                        console.error('Error parsing scores:', e);
                    }
                }
            }
        });

        return scores;
    } catch (error) {
        console.error('Error reading localStorage:', error);
        return [];
    }
}

// Main function to display scores
function displayScores() {
    const scores = readLocalStorage();
    
    if (scores.length === 0) {
        console.log('No scores found in localStorage.');
        return;
    }

    console.log('\n=== Game Scores ===');
    console.log('Score\tWager\tPayout\tTimestamp');
    console.log('----------------------------------------');
    
    scores.forEach(score => {
        const date = new Date(score.timestamp);
        console.log(
            `${score.score}\t${score.wager}\t${score.payout}\t${date.toLocaleString()}`
        );
    });

    // Calculate and display statistics
    const totalScores = scores.length;
    const totalPayout = scores.reduce((sum, score) => sum + score.payout, 0);
    const averageScore = scores.reduce((sum, score) => sum + score.score, 0) / totalScores;
    
    console.log('\n=== Statistics ===');
    console.log(`Total Games: ${totalScores}`);
    console.log(`Total Payout: ${totalPayout} $GRIND`);
    console.log(`Average Score: ${averageScore.toFixed(2)}`);
}

// Run the display function
displayScores(); 