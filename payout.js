class PayoutSystem {
    constructor() {
        this.tiers = [
            { stake: 1, s_min: 150, s_max: 400, max_multiplier: 2.0 },
            { stake: 5, s_min: 160, s_max: 425, max_multiplier: 2.5 },
            { stake: 10, s_min: 195, s_max: 475, max_multiplier: 3.0 },
            { stake: 25, s_min: 205, s_max: 500, max_multiplier: 3.5 },
            { stake: 50, s_min: 215, s_max: 1500, max_multiplier: 8.0 },
            { stake: 100, s_min: 225, s_max: 1500, max_multiplier: 10.0 }
        ];
        
        this.milestoneValues = [1, 1.5, 2, 2.5, 3, 3.5];
        this.milestoneThresholds = this.milestoneValues.map((_, i) => 200 + i * 100);
    }

    calculatePayout(score, stake) {
        // Find applicable tier
        const tier = [...this.tiers].reverse().find(t => stake >= t.stake) || this.tiers[0];
        const { s_min, s_max, max_multiplier } = tier;

        // Calculate base payout
        let basePayout = 0;
        if (score >= s_max) {
            basePayout = stake * max_multiplier;
        } else if (score >= s_min) {
            const progress = (score - s_min) / (s_max - s_min);
            const multiplier = 1.0 + (max_multiplier - 1.0) * progress;
            basePayout = stake * multiplier;
        }

        // Calculate milestone bonus
        const milestoneBonus = this.milestoneThresholds
            .reduce((sum, threshold, index) => {
                return score >= threshold ? sum + this.milestoneValues[index] : sum;
            }, 0);

        // Calculate total payout
        const total = Math.round((basePayout + milestoneBonus) * 1000) / 1000;

        return {
            stake,
            score,
            basePayout: Math.round(basePayout * 1000) / 1000,
            milestoneBonus,
            totalPayout: total
        };
    }

    getValidStakeAmounts() {
        return this.tiers.map(tier => tier.stake);
    }
} 