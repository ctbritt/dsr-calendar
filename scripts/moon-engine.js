/**
 * Athasian Moon Engine - Precise Lunar Calculations
 * ================================================
 * Astronomically accurate moon phase calculations for Ral and Guthay
 * Reference Point: Both moons full at Absolute Day 0 (KA1, Y1, D1)
 * Eclipse occurs when both moons are full and aligned
 */

/**
 * Moon Phase Calculator Class
 * Handles precise phase calculations, illumination, and rise/set times
 */
class MoonPhaseCalculator {
    /**
     * Create a moon phase calculator
     * @param {string} name - Moon name ("Ral" or "Guthay")
     * @param {number} period - Synodic period in days
     * @param {number} referenceFullMoonDay - Absolute day when moon was last full (default 0)
     */
    constructor(name, period, referenceFullMoonDay = 0) {
        this.name = name;
        this.period = period;
        this.referenceDay = referenceFullMoonDay;
        
        // Validate inputs
        if (period <= 0) throw new Error(`Invalid period for ${name}: ${period}`);
        if (!Number.isInteger(period)) throw new Error(`Period must be integer for ${name}: ${period}`);
    }
    
    /**
     * Get the phase fraction for a given absolute day
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {number} Phase fraction (0.0 = Full, 0.5 = New, 1.0 = Full again)
     */
    getPhase(absoluteDay) {
        const daysSinceReference = absoluteDay - this.referenceDay;
        const rawPhase = daysSinceReference / this.period;
        
        // Normalize to 0-1 range, handling negative days
        let normalizedPhase = rawPhase - Math.floor(rawPhase);
        if (normalizedPhase < 0) normalizedPhase += 1;
        
        return normalizedPhase;
    }
    
    /**
     * Get illumination percentage (0-100%)
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {number} Illumination percentage
     */
    getIllumination(absoluteDay) {
        const phase = this.getPhase(absoluteDay);
        
        // Cosine curve: Full Moon (phase 0) = 100%, New Moon (phase 0.5) = 0%
        // Formula: 50 * (1 + cos(2π * phase))
        const illumination = 50 * (1 + Math.cos(2 * Math.PI * phase));
        
        return Math.round(illumination);
    }
    
    /**
     * Get descriptive phase name
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {string} Phase name
     */
    getPhaseName(absoluteDay) {
        const phase = this.getPhase(absoluteDay);
        const degrees = phase * 360;
        
        // Convert phase to traditional moon phase names
        if (degrees < 1 || degrees > 359) return "Full";
        if (degrees < 90) return "Waning Gibbous";
        if (degrees >= 89 && degrees <= 91) return "Last Quarter";
        if (degrees < 180) return "Waning Crescent";
        if (degrees >= 179 && degrees <= 181) return "New";
        if (degrees < 270) return "Waxing Crescent";
        if (degrees >= 269 && degrees <= 271) return "First Quarter";
        return "Waxing Gibbous";
    }
    
    /**
     * Get rise and set times based on phase
     * Assumption: Full moon rises at 18:00, sets at 06:00
     * Times shift linearly with phase
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {object} {rise: number, set: number} Hours in 24-hour format
     */
    getRiseSetTimes(absoluteDay) {
        const phase = this.getPhase(absoluteDay);
        
        // Linear shift: Full moon (phase 0) rises at 18:00
        // New moon (phase 0.5) rises at 06:00
        const riseHour = (18 + 24 * phase) % 24;
        const setHour = (6 + 24 * phase) % 24;
        
        return {
            rise: Math.round(riseHour * 100) / 100, // Round to 2 decimal places
            set: Math.round(setHour * 100) / 100
        };
    }
    
    /**
     * Format rise/set time as HH:MM string
     * @param {number} hour - Hour as decimal (e.g., 18.5 = 18:30)
     * @returns {string} Formatted time
     */
    static formatTime(hour) {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    /**
     * Get complete moon data for a given day
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {object} Complete moon data
     */
    getMoonData(absoluteDay) {
        const phase = this.getPhase(absoluteDay);
        const illumination = this.getIllumination(absoluteDay);
        const phaseName = this.getPhaseName(absoluteDay);
        const times = this.getRiseSetTimes(absoluteDay);
        
        return {
            name: this.name,
            period: this.period,
            absoluteDay,
            phase,
            illumination,
            phaseName,
            rise: times.rise,
            set: times.set,
            riseFormatted: MoonPhaseCalculator.formatTime(times.rise),
            setFormatted: MoonPhaseCalculator.formatTime(times.set)
        };
    }
    
    /**
     * Check if moon is full (within tolerance)
     * @param {number} absoluteDay - Absolute days since epoch
     * @param {number} tolerance - Phase tolerance (default 0.02 = ~0.7 days for 33-day cycle)
     * @returns {boolean} True if moon is full
     */
    isFull(absoluteDay, tolerance = 0.02) {
        const phase = this.getPhase(absoluteDay);
        return phase < tolerance || phase > (1 - tolerance);
    }
    
    /**
     * Check if moon is new (within tolerance)
     * @param {number} absoluteDay - Absolute days since epoch
     * @param {number} tolerance - Phase tolerance (default 0.02)
     * @returns {boolean} True if moon is new
     */
    isNew(absoluteDay, tolerance = 0.02) {
        const phase = this.getPhase(absoluteDay);
        return Math.abs(phase - 0.5) < tolerance;
    }
    
    /**
     * Find next full moon from given day
     * @param {number} fromAbsoluteDay - Starting absolute day
     * @returns {number} Absolute day of next full moon
     */
    getNextFullMoon(fromAbsoluteDay) {
        const currentPhase = this.getPhase(fromAbsoluteDay);
        let daysToNextFull;
        
        if (currentPhase === 0) {
            // Already full, next full moon is one complete cycle away
            daysToNextFull = this.period;
        } else {
            // Calculate days until phase returns to 0
            daysToNextFull = (1 - currentPhase) * this.period;
        }
        
        return fromAbsoluteDay + Math.ceil(daysToNextFull);
    }
    
    /**
     * Find next new moon from given day
     * @param {number} fromAbsoluteDay - Starting absolute day
     * @returns {number} Absolute day of next new moon
     */
    getNextNewMoon(fromAbsoluteDay) {
        const currentPhase = this.getPhase(fromAbsoluteDay);
        let daysToNextNew;
        
        if (currentPhase === 0.5) {
            // Already new, next new moon is one complete cycle away
            daysToNextNew = this.period;
        } else if (currentPhase < 0.5) {
            daysToNextNew = (0.5 - currentPhase) * this.period;
        } else {
            daysToNextNew = (1.5 - currentPhase) * this.period;
        }
        
        return fromAbsoluteDay + Math.ceil(daysToNextNew);
    }
}

/**
 * Athasian Moon System
 * Manages both Ral and Guthay with their specific parameters
 */
class AthasianMoonSystem {
    constructor() {
        // Create moon calculators with reference point at Absolute Day 0
        this.ral = new MoonPhaseCalculator("Ral", 33, 0);
        this.guthay = new MoonPhaseCalculator("Guthay", 125, 0);
        
        // Eclipse cycle (LCM of 33 and 125)
        this.eclipseCycle = this.calculateLCM(33, 125);
    }
    
    /**
     * Calculate Least Common Multiple of two numbers
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} LCM
     */
    calculateLCM(a, b) {
        // Input validation
        if (!Number.isInteger(a) || !Number.isInteger(b)) {
            throw new Error('LCM calculation requires integer inputs');
        }
        if (a === 0 || b === 0) {
            throw new Error('Cannot calculate LCM with zero');
        }
        
        // Use iterative GCD to avoid stack overflow
        const gcd = (x, y) => {
            while (y !== 0) {
                const temp = y;
                y = x % y;
                x = temp;
            }
            return x;
        };
        
        const gcdResult = gcd(Math.abs(a), Math.abs(b));
        if (gcdResult === 0) {
            throw new Error('GCD calculation failed');
        }
        
        return Math.abs(a * b) / gcdResult;
    }
    
    /**
     * Get both moon data for a given absolute day
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {object} Both moon data
     */
    getBothMoons(absoluteDay) {
        return {
            ral: this.ral.getMoonData(absoluteDay),
            guthay: this.guthay.getMoonData(absoluteDay),
            absoluteDay
        };
    }
    
    /**
     * Check if an eclipse is occurring (both moons full and aligned)
     * @param {number} absoluteDay - Absolute days since epoch
     * @param {number} tolerance - Phase tolerance for eclipse detection
     * @returns {boolean} True if eclipse is occurring
     */
    isEclipse(absoluteDay, tolerance = 0.02) {
        return this.ral.isFull(absoluteDay, tolerance) && 
               this.guthay.isFull(absoluteDay, tolerance);
    }
    
    // Eclipse calculation is now handled by the EclipseCalculator class
    // which uses actual moon phase mathematics instead of hardcoded cycles
    
    /**
     * Validate the moon system against reference point
     * @returns {boolean} True if validation passes
     */
    validateSystem() {
        // Test reference point (Absolute Day 0)
        const referenceData = this.getBothMoons(0);
        
        if (referenceData.ral.illumination !== 100) {
            throw new Error(`Ral not full at reference: ${referenceData.ral.illumination}%`);
        }
        
        if (referenceData.guthay.illumination !== 100) {
            throw new Error(`Guthay not full at reference: ${referenceData.guthay.illumination}%`);
        }
        
        if (!this.isEclipse(0)) {
            throw new Error("No eclipse at reference point");
        }
        
        // Test that the mathematical LCM represents a natural eclipse cycle
        // Both moons should return to their starting phases at the LCM interval
        const cycleData = this.getBothMoons(this.eclipseCycle);
        if (Math.abs(cycleData.ral.illumination - 100) > 1 || Math.abs(cycleData.guthay.illumination - 100) > 1) {
            console.warn(`Eclipse cycle (${this.eclipseCycle}) may not align perfectly: Ral ${cycleData.ral.illumination}%, Guthay ${cycleData.guthay.illumination}%`);
        }
        
        // Test rise/set times at reference
        if (Math.abs(referenceData.ral.rise - 18) > 0.01) {
            throw new Error(`Ral rise time incorrect at reference: ${referenceData.ral.rise}`);
        }
        
        if (Math.abs(referenceData.guthay.rise - 18) > 0.01) {
            throw new Error(`Guthay rise time incorrect at reference: ${referenceData.guthay.rise}`);
        }
        
        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        MoonPhaseCalculator,
        AthasianMoonSystem
    };
} else {
    // Browser/FoundryVTT environment
    window.AthasianMoonEngine = {
        MoonPhaseCalculator,
        AthasianMoonSystem
    };
}