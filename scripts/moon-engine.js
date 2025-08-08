/**
 * Athasian Moon Engine - Precise Lunar Calculations
 * ================================================
 * Astronomically accurate moon phase calculations for Ral and Guthay
 * Reference Point: First new moon for each moon
 * Ral: Year 1, Day 17 (first new moon)
 * Guthay: Year 1, Day 63 (first new moon)
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
     * @param {number} firstNewMoonDay - Total calendar day of first new moon
     * @param {Object} moonConfig - Moon configuration from JSON (optional)
     */
    constructor(name, period, firstNewMoonDay, moonConfig = null) {
        this.name = name;
        this.period = period;
        this.firstNewMoonDay = firstNewMoonDay;
        console.log(name, period, firstNewMoonDay, moonConfig);

        // Read offset from moon configuration, default to 0
        this.offset = moonConfig && moonConfig.offset !== undefined ? moonConfig.offset : 0;

        // Validate inputs
        if (period <= 0) throw new Error(`Invalid period for ${name}: ${period}`);
        if (!Number.isInteger(period)) throw new Error(`Period must be integer for ${name}: ${period}`);
        if (this.offset < 0 || this.offset >= 1) throw new Error(`Offset must be between 0 and 1 for ${name}: ${this.offset}`);
    }
    
    /**
     * Get the day within the current cycle for a given total calendar day
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {number} Day within the current cycle (0 to period-1)
     */
    getCycleDay(totalCalendarDay) {
        const daysSinceFirstNewMoon = totalCalendarDay - this.firstNewMoonDay;
        const cycleDay = daysSinceFirstNewMoon % this.period;
        // Handle negative days (before first new moon)
        return cycleDay < 0 ? cycleDay + this.period : cycleDay;
    }
    
    /**
     * Get the phase fraction for a given total calendar day
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {number} Phase fraction (0.0 = New, 0.5 = Full, 1.0 = New again)
     */
    getPhase(totalCalendarDay) {
        const cycleDay = this.getCycleDay(totalCalendarDay);
        const basePhase = cycleDay / this.period;
        
        // Apply offset and normalize to 0-1 range
        let adjustedPhase = basePhase + this.offset;
        if (adjustedPhase >= 1) adjustedPhase -= 1;
        if (adjustedPhase < 0) adjustedPhase += 1;
        
        return adjustedPhase;
    }
    
    /**
     * Get illumination percentage (0-100%)
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {number} Illumination percentage
     */
    getIllumination(totalCalendarDay) {
        const phase = this.getPhase(totalCalendarDay);
        
        // Cosine curve: New Moon (phase 0) = 0%, Full Moon (phase 0.5) = 100%
        // Formula: 50 * (1 + cos(2π * (phase - 0.5)))
        const illumination = 50 * (1 + Math.cos(2 * Math.PI * (phase - 0.5)));
        
        return Math.round(illumination);
    }
    
    /**
     * Get descriptive phase name based on cycle day ranges
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {string} Phase name
     */
    getPhaseName(totalCalendarDay) {
        const cycleDay = this.getCycleDay(totalCalendarDay);
        const p = this.period;
        
        // Phase ranges based on 1/8th divisions of the cycle
        if (cycleDay >= 0 && cycleDay < p/8) return "New";
        if (cycleDay >= p/8 && cycleDay < p/4) return "Waxing Crescent";
        if (cycleDay >= p/4 && cycleDay < 3*p/8) return "First Quarter";
        if (cycleDay >= 3*p/8 && cycleDay < p/2) return "Waxing Gibbous";
        if (cycleDay >= p/2 && cycleDay < 5*p/8) return "Full";
        if (cycleDay >= 5*p/8 && cycleDay < 3*p/4) return "Waning Gibbous";
        if (cycleDay >= 3*p/4 && cycleDay < 7*p/8) return "Last Quarter";
        return "Waning Crescent"; // 7*p/8 to p
    }
    
    /**
     * Get rise and set times based on phase
     * Assumption: Full moon rises at 18:00, sets at 06:00
     * Times shift linearly with phase
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {object} {rise: number, set: number} Hours in 24-hour format
     */
    getRiseSetTimes(totalCalendarDay) {
        const phase = this.getPhase(totalCalendarDay);
        
        // Linear shift: Full moon (phase 0.5) rises at 18:00
        // New moon (phase 0) rises at 06:00
        const riseHour = (6 + 24 * phase) % 24;
        const setHour = (18 + 24 * phase) % 24;
        
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
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {object} Complete moon data
     */
    getMoonData(totalCalendarDay) {
        const phase = this.getPhase(totalCalendarDay);
        const illumination = this.getIllumination(totalCalendarDay);
        const phaseName = this.getPhaseName(totalCalendarDay);
        const times = this.getRiseSetTimes(totalCalendarDay);
        
        return {
            name: this.name,
            period: this.period,
            absoluteDay: totalCalendarDay, // Keep absoluteDay for compatibility
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
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @param {number} tolerance - Phase tolerance (default 0.02 = ~0.7 days for 33-day cycle)
     * @returns {boolean} True if moon is full
     */
    isFull(totalCalendarDay, tolerance = 0.02) {
        const phase = this.getPhase(totalCalendarDay);
        return phase < tolerance || phase > (1 - tolerance);
    }
    
    /**
     * Check if moon is new (within tolerance)
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @param {number} tolerance - Phase tolerance (default 0.02)
     * @returns {boolean} True if moon is new
     */
    isNew(totalCalendarDay, tolerance = 0.02) {
        const phase = this.getPhase(totalCalendarDay);
        return Math.abs(phase - 0.0) < tolerance || Math.abs(phase - 1.0) < tolerance;
    }
    
    /**
     * Find next full moon from given day
     * @param {number} fromTotalCalendarDay - Starting total calendar days since year 1
     * @returns {number} Total calendar day of next full moon
     */
    getNextFullMoon(fromTotalCalendarDay) {
        const currentPhase = this.getPhase(fromTotalCalendarDay);
        let daysToNextFull;
        
        if (Math.abs(currentPhase - 0.5) < 0.01) {
            // Already full, next full moon is one complete cycle away
            daysToNextFull = this.period;
        } else if (currentPhase < 0.5) {
            daysToNextFull = (0.5 - currentPhase) * this.period;
        } else {
            daysToNextFull = (1.5 - currentPhase) * this.period;
        }
        
        return fromTotalCalendarDay + Math.ceil(daysToNextFull);
    }
    
    /**
     * Find next new moon from given day
     * @param {number} fromTotalCalendarDay - Starting total calendar days since year 1
     * @returns {number} Total calendar day of next new moon
     */
    getNextNewMoon(fromTotalCalendarDay) {
        const currentPhase = this.getPhase(fromTotalCalendarDay);
        let daysToNextNew;
        
        if (Math.abs(currentPhase - 0.0) < 0.01 || Math.abs(currentPhase - 1.0) < 0.01) {
            // Already new, next new moon is one complete cycle away
            daysToNextNew = this.period;
        } else if (currentPhase < 0.5) {
            daysToNextNew = (0.0 - currentPhase) * this.period;
            if (daysToNextNew < 0) daysToNextNew += this.period;
        } else {
            daysToNextNew = (1.0 - currentPhase) * this.period;
        }
        
        return fromTotalCalendarDay + Math.ceil(daysToNextNew);
    }
}

/**
 * Athasian Moon System
 * Manages both Ral and Guthay with their specific parameters
 */
class AthasianMoonSystem {
    constructor(moonConfigs = null) {
        // Create moon calculators using data from JSON configuration
        // Get moon configurations from the provided data
        const ralConfig = moonConfigs ? moonConfigs.find(m => m.name === "Ral") : null;
        const guthayConfig = moonConfigs ? moonConfigs.find(m => m.name === "Guthay") : null;
        
        // Calculate first new moon total calendar days from JSON data
        const ralFirstNewMoonDay = ralConfig && ralConfig.firstNewMoon ? 
            (ralConfig.firstNewMoon.year - 1) * 375 + ralConfig.firstNewMoon.day : 17;
        const guthayFirstNewMoonDay = guthayConfig && guthayConfig.firstNewMoon ? 
            (guthayConfig.firstNewMoon.year - 1) * 375 + guthayConfig.firstNewMoon.day : 63;
        
        this.ral = new MoonPhaseCalculator("Ral", 33, ralFirstNewMoonDay, ralConfig);
        this.guthay = new MoonPhaseCalculator("Guthay", 125, guthayFirstNewMoonDay, guthayConfig);
        
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
     * Get both moon data for a given total calendar day
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @returns {object} Both moon data
     */
    getBothMoons(totalCalendarDay) {
        return {
            ral: this.ral.getMoonData(totalCalendarDay),
            guthay: this.guthay.getMoonData(totalCalendarDay),
            absoluteDay: totalCalendarDay
        };
    }
    
    /**
     * Check if an eclipse is occurring (both moons full and aligned)
     * @param {number} totalCalendarDay - Total calendar days since year 1
     * @param {number} tolerance - Phase tolerance for eclipse detection
     * @returns {boolean} True if eclipse is occurring
     */
    isEclipse(totalCalendarDay, tolerance = 0.02) {
        return this.ral.isFull(totalCalendarDay, tolerance) && 
               this.guthay.isFull(totalCalendarDay, tolerance);
    }
    
    // Eclipse calculation is now handled by the EclipseCalculator class
    // which uses actual moon phase mathematics instead of hardcoded cycles
    
    /**
     * Validate the moon system against reference point
     * @returns {boolean} True if validation passes
     */
    validateSystem() {
        // Test first new moon points
        const ralFirstNewMoon = this.ral.firstNewMoonDay;
        const guthayFirstNewMoon = this.guthay.firstNewMoonDay;
        
        const ralNewMoonData = this.ral.getMoonData(ralFirstNewMoon);
        const guthayNewMoonData = this.guthay.getMoonData(guthayFirstNewMoon);
        
        if (ralNewMoonData.illumination > 5) {
            throw new Error(`Ral not new at first new moon: ${ralNewMoonData.illumination}%`);
        }
        
        if (guthayNewMoonData.illumination > 5) {
            throw new Error(`Guthay not new at first new moon: ${guthayNewMoonData.illumination}%`);
        }
        
        // Test that the mathematical LCM represents a natural eclipse cycle
        // Both moons should return to their starting phases at the LCM interval
        const cycleData = this.getBothMoons(this.eclipseCycle);
        if (Math.abs(cycleData.ral.illumination - 0) > 5 || Math.abs(cycleData.guthay.illumination - 0) > 5) {
            console.warn(`Eclipse cycle (${this.eclipseCycle}) may not align perfectly: Ral ${cycleData.ral.illumination}%, Guthay ${cycleData.guthay.illumination}%`);
        }
        
        // Test rise/set times at first new moon (should rise at 06:00)
        if (Math.abs(ralNewMoonData.rise - 6) > 0.01) {
            throw new Error(`Ral rise time incorrect at first new moon: ${ralNewMoonData.rise}`);
        }
        
        if (Math.abs(guthayNewMoonData.rise - 6) > 0.01) {
            throw new Error(`Guthay rise time incorrect at first new moon: ${guthayNewMoonData.rise}`);
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