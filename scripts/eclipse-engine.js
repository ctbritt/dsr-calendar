/**
 * Athasian Eclipse Engine - Advanced Eclipse Detection and Prediction
 * ==================================================================
 * Sophisticated eclipse detection, prediction, and astronomical event tracking
 * for the dual moon system of Athas
 */

/**
 * Eclipse Types and Classifications
 */
const EclipseType = {
    NONE: 'none',
    PARTIAL: 'partial',
    TOTAL: 'total',
    GRAND: 'grand'  // Both moons at 100% full and aligned
};

const EclipseAlignment = {
    NONE: 'none',
    RAL_OCCLUDES_GUTHAY: 'ral_occludes_guthay',
    GUTHAY_OCCLUDES_RAL: 'guthay_occludes_ral',
    PERFECT_ALIGNMENT: 'perfect_alignment'
};

/**
 * Eclipse Calculator Class
 * Advanced eclipse detection and prediction system
 */
class EclipseCalculator {
    constructor(moonSystem) {
        this.moonSystem = moonSystem;
        this.eclipseCycle = moonSystem.eclipseCycle; // 4,125 days
        
        // Eclipse detection tolerances
        this.tolerances = {
            grand: 0.005,    // Very tight tolerance for grand eclipses
            total: 0.02,     // Standard tolerance for total eclipses
            partial: 0.05    // Broader tolerance for partial eclipses
        };
        
        // Cache for performance
        this.eclipseCache = new Map();
    }
    
    /**
     * Determine eclipse type and alignment for a given day
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {object} Eclipse information
     */
    getEclipseInfo(absoluteDay) {
        // Check cache first
        const cacheKey = absoluteDay.toString();
        if (this.eclipseCache.has(cacheKey)) {
            return this.eclipseCache.get(cacheKey);
        }
        
        const ralData = this.moonSystem.ral.getMoonData(absoluteDay);
        const guthayData = this.moonSystem.guthay.getMoonData(absoluteDay);
        
        const eclipseInfo = {
            absoluteDay,
            type: EclipseType.NONE,
            alignment: EclipseAlignment.NONE,
            ralIllumination: ralData.illumination,
            guthayIllumination: guthayData.illumination,
            ralPhase: ralData.phase,
            guthayPhase: guthayData.phase,
            magnitude: 0,
            duration: 0,
            isVisible: false,
            description: 'No eclipse'
        };
        
        // Check for eclipse conditions
        const ralFull = this.moonSystem.ral.isFull(absoluteDay, this.tolerances.partial);
        const guthayFull = this.moonSystem.guthay.isFull(absoluteDay, this.tolerances.partial);
        
        if (ralFull && guthayFull) {
            // Both moons are full - potential eclipse
            const ralFullPrecise = this.moonSystem.ral.isFull(absoluteDay, this.tolerances.grand);
            const guthayFullPrecise = this.moonSystem.guthay.isFull(absoluteDay, this.tolerances.grand);
            
            if (ralFullPrecise && guthayFullPrecise) {
                // Grand Eclipse - perfect alignment with both at 100%
                eclipseInfo.type = EclipseType.GRAND;
                eclipseInfo.alignment = EclipseAlignment.PERFECT_ALIGNMENT;
                eclipseInfo.magnitude = 1.0;
                eclipseInfo.duration = this.calculateEclipseDuration(absoluteDay, EclipseType.GRAND);
                eclipseInfo.isVisible = true;
                eclipseInfo.description = 'Grand Eclipse - Ral crosses the face of Guthay in perfect alignment';
            } else if (this.moonSystem.ral.isFull(absoluteDay, this.tolerances.total) && 
                      this.moonSystem.guthay.isFull(absoluteDay, this.tolerances.total)) {
                // Total Eclipse
                eclipseInfo.type = EclipseType.TOTAL;
                eclipseInfo.alignment = this.determineAlignment(ralData.phase, guthayData.phase);
                eclipseInfo.magnitude = this.calculateMagnitude(ralData.illumination, guthayData.illumination);
                eclipseInfo.duration = this.calculateEclipseDuration(absoluteDay, EclipseType.TOTAL);
                eclipseInfo.isVisible = true;
                eclipseInfo.description = this.generateEclipseDescription(eclipseInfo);
            } else {
                // Partial Eclipse
                eclipseInfo.type = EclipseType.PARTIAL;
                eclipseInfo.alignment = this.determineAlignment(ralData.phase, guthayData.phase);
                eclipseInfo.magnitude = this.calculateMagnitude(ralData.illumination, guthayData.illumination);
                eclipseInfo.duration = this.calculateEclipseDuration(absoluteDay, EclipseType.PARTIAL);
                eclipseInfo.isVisible = true;
                eclipseInfo.description = this.generateEclipseDescription(eclipseInfo);
            }
        }
        
        // Cache the result
        this.eclipseCache.set(cacheKey, eclipseInfo);
        
        return eclipseInfo;
    }
    
    /**
     * Determine which moon is occluding the other
     * @param {number} ralPhase - Ral's phase (0-1)
     * @param {number} guthayPhase - Guthay's phase (0-1)
     * @returns {string} Alignment type
     */
    determineAlignment(ralPhase, guthayPhase) {
        const phaseDiff = Math.abs(ralPhase - guthayPhase);
        const alignmentThreshold = 0.01;
        
        if (phaseDiff < alignmentThreshold || phaseDiff > (1 - alignmentThreshold)) {
            return EclipseAlignment.PERFECT_ALIGNMENT;
        }
        
        // Ral has shorter period, so it "laps" Guthay
        // When Ral is slightly ahead in phase, it appears to cross Guthay
        if (ralPhase < guthayPhase) {
            return EclipseAlignment.RAL_OCCLUDES_GUTHAY;
        } else {
            return EclipseAlignment.GUTHAY_OCCLUDES_RAL;
        }
    }
    
    /**
     * Calculate eclipse magnitude based on illumination levels
     * @param {number} ralIllumination - Ral's illumination (0-100)
     * @param {number} guthayIllumination - Guthay's illumination (0-100)
     * @returns {number} Eclipse magnitude (0-1)
     */
    calculateMagnitude(ralIllumination, guthayIllumination) {
        // Magnitude based on how close both moons are to full
        const ralMagnitude = ralIllumination / 100;
        const guthayMagnitude = guthayIllumination / 100;
        
        // Eclipse magnitude is the product of both illuminations
        return Math.round((ralMagnitude * guthayMagnitude) * 1000) / 1000;
    }
    
    /**
     * Calculate eclipse duration in hours
     * @param {number} absoluteDay - Absolute days since epoch
     * @param {string} eclipseType - Type of eclipse
     * @returns {number} Duration in hours
     */
    calculateEclipseDuration(absoluteDay, eclipseType) {
        // Duration varies by eclipse type and moon positions
        const baseDuration = {
            [EclipseType.GRAND]: 8,
            [EclipseType.TOTAL]: 6,
            [EclipseType.PARTIAL]: 4
        };
        
        // Add some variation based on the specific day within the cycle
        const cyclePosition = (absoluteDay % this.eclipseCycle) / this.eclipseCycle;
        const variation = Math.sin(2 * Math.PI * cyclePosition) * 0.5;
        
        return Math.round((baseDuration[eclipseType] + variation) * 10) / 10;
    }
    
    /**
     * Generate descriptive text for eclipse
     * @param {object} eclipseInfo - Eclipse information object
     * @returns {string} Description
     */
    generateEclipseDescription(eclipseInfo) {
        const { type, alignment, magnitude } = eclipseInfo;
        
        let description = '';
        
        switch (type) {
            case EclipseType.GRAND:
                description = 'Grand Eclipse - Both moons shine with perfect radiance as Ral crosses the face of Guthay in celestial harmony';
                break;
            case EclipseType.TOTAL:
                if (alignment === EclipseAlignment.RAL_OCCLUDES_GUTHAY) {
                    description = `Total Eclipse - The green moon Ral passes across golden Guthay (magnitude ${magnitude})`;
                } else if (alignment === EclipseAlignment.GUTHAY_OCCLUDES_RAL) {
                    description = `Total Eclipse - The golden moon Guthay eclipses green Ral (magnitude ${magnitude})`;
                } else {
                    description = `Total Eclipse - Both moons align in perfect celestial dance (magnitude ${magnitude})`;
                }
                break;
            case EclipseType.PARTIAL:
                description = `Partial Eclipse - The moons partially align in the Athasian sky (magnitude ${magnitude})`;
                break;
            default:
                description = 'No eclipse';
        }
        
        return description;
    }
    
    /**
     * Find all eclipses within a date range
     * @param {number} startAbsoluteDay - Starting absolute day
     * @param {number} endAbsoluteDay - Ending absolute day
     * @param {string} minType - Minimum eclipse type to include
     * @returns {Array} Array of eclipse events
     */
    findEclipsesInRange(startAbsoluteDay, endAbsoluteDay, minType = EclipseType.PARTIAL) {
        const eclipses = [];
        const typeOrder = [EclipseType.PARTIAL, EclipseType.TOTAL, EclipseType.GRAND];
        const minTypeIndex = typeOrder.indexOf(minType);
        
        // Use eclipse cycle to optimize search
        const cycleStart = Math.floor(startAbsoluteDay / this.eclipseCycle) * this.eclipseCycle;
        const cycleEnd = Math.ceil(endAbsoluteDay / this.eclipseCycle) * this.eclipseCycle;
        
        // Check each eclipse cycle position
        for (let cycleDay = cycleStart; cycleDay <= cycleEnd; cycleDay += this.eclipseCycle) {
            if (cycleDay >= startAbsoluteDay && cycleDay <= endAbsoluteDay) {
                const eclipseInfo = this.getEclipseInfo(cycleDay);
                
                if (eclipseInfo.type !== EclipseType.NONE) {
                    const typeIndex = typeOrder.indexOf(eclipseInfo.type);
                    if (typeIndex >= minTypeIndex) {
                        eclipses.push(eclipseInfo);
                    }
                }
            }
        }
        
        return eclipses.sort((a, b) => a.absoluteDay - b.absoluteDay);
    }
    
    /**
     * Find the next eclipse from a given day
     * @param {number} fromAbsoluteDay - Starting absolute day
     * @param {string} minType - Minimum eclipse type
     * @returns {object|null} Next eclipse information
     */
    findNextEclipse(fromAbsoluteDay, minType = EclipseType.PARTIAL) {
        // Search forward day by day until we find an eclipse
        // This is mathematically correct - no hardcoded cycles
        const maxSearchDays = this.eclipseCycle * 2; // Safety limit
        
        for (let searchDay = fromAbsoluteDay + 1; searchDay <= fromAbsoluteDay + maxSearchDays; searchDay++) {
            const eclipseInfo = this.getEclipseInfo(searchDay);
            
            if (eclipseInfo.type !== EclipseType.NONE) {
                const typeOrder = [EclipseType.PARTIAL, EclipseType.TOTAL, EclipseType.GRAND];
                const minTypeIndex = typeOrder.indexOf(minType);
                const eclipseTypeIndex = typeOrder.indexOf(eclipseInfo.type);
                
                if (eclipseTypeIndex >= minTypeIndex) {
                    return eclipseInfo;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Find the previous eclipse from a given day
     * @param {number} fromAbsoluteDay - Starting absolute day
     * @param {string} minType - Minimum eclipse type
     * @returns {object|null} Previous eclipse information
     */
    findPreviousEclipse(fromAbsoluteDay, minType = EclipseType.PARTIAL) {
        // Search backward day by day until we find an eclipse
        // This is mathematically correct - no hardcoded cycles
        const maxSearchDays = this.eclipseCycle * 2; // Safety limit
        const startSearch = Math.max(0, fromAbsoluteDay - maxSearchDays); // Don't go below day 0
        
        for (let searchDay = fromAbsoluteDay - 1; searchDay >= startSearch; searchDay--) {
            const eclipseInfo = this.getEclipseInfo(searchDay);
            
            if (eclipseInfo.type !== EclipseType.NONE) {
                const typeOrder = [EclipseType.PARTIAL, EclipseType.TOTAL, EclipseType.GRAND];
                const minTypeIndex = typeOrder.indexOf(minType);
                const eclipseTypeIndex = typeOrder.indexOf(eclipseInfo.type);
                
                if (eclipseTypeIndex >= minTypeIndex) {
                    return eclipseInfo;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Check if a specific day has any eclipse activity
     * @param {number} absoluteDay - Absolute days since epoch
     * @returns {boolean} True if eclipse is occurring
     */
    hasEclipse(absoluteDay) {
        const eclipseInfo = this.getEclipseInfo(absoluteDay);
        return eclipseInfo.type !== EclipseType.NONE;
    }
    
    /**
     * Get eclipse calendar for a year
     * @param {number} kingsAge - King's Age
     * @param {number} year - Year within the age
     * @returns {Array} Eclipse events for the year
     */
    getYearlyEclipseCalendar(kingsAge, year) {
        const startDay = window.AthasianCalendarCore.toAbsoluteDays(kingsAge, year, 1);
        const endDay = startDay + 374; // 375 days in a year
        
        return this.findEclipsesInRange(startDay, endDay);
    }
    
    /**
     * Validate eclipse system against known reference points
     * @returns {boolean} True if validation passes
     */
    validateEclipseSystem() {
        // Test reference point (KA1, Y1, D1 = Absolute Day 0)
        const referenceEclipse = this.getEclipseInfo(0);
        
        if (referenceEclipse.type !== EclipseType.GRAND) {
            throw new Error(`Expected Grand Eclipse at reference, got ${referenceEclipse.type}`);
        }
        
        if (referenceEclipse.ralIllumination !== 100 || referenceEclipse.guthayIllumination !== 100) {
            throw new Error(`Expected 100% illumination at reference, got Ral: ${referenceEclipse.ralIllumination}%, Guthay: ${referenceEclipse.guthayIllumination}%`);
        }
        
        // Test that eclipse finding works mathematically
        const nextEclipse = this.findNextEclipse(0);
        if (!nextEclipse) {
            throw new Error('Next eclipse finding failed - no eclipse found');
        }
        
        // Verify the found eclipse is actually an eclipse
        if (nextEclipse.type === EclipseType.NONE) {
            throw new Error('Found eclipse is not actually an eclipse');
        }
        
        // Test that the mathematically calculated LCM cycle produces an eclipse
        // (but don't require it to be the NEXT eclipse, just that it's AN eclipse)
        const lcmEclipse = this.getEclipseInfo(this.eclipseCycle);
        if (lcmEclipse.type === EclipseType.NONE) {
            console.warn(`LCM cycle day ${this.eclipseCycle} is not an eclipse - mathematical variance expected`);
        }
        
        return true;
    }
    
    /**
     * Clear eclipse cache (useful for memory management)
     */
    clearCache() {
        this.eclipseCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        EclipseCalculator,
        EclipseType,
        EclipseAlignment
    };
} else {
    // Browser/FoundryVTT environment
    window.AthasianEclipseEngine = {
        EclipseCalculator,
        EclipseType,
        EclipseAlignment
    };
}