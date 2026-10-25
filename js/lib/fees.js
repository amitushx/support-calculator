/*
 * Courier distance compensation.
 * All amounts are computed in agorot (integers) to avoid floating-point
 * rounding errors; only the final result is converted to shekels.
 */

// Per-100m rates (in agorot) for non-walkers, by distance band.
const BANDS = [
    { from: 200,  to: 1100,     rate: 55 },
    { from: 1100, to: 3100,     rate: 35 },
    { from: 3100, to: 5100,     rate: 30 },
    { from: 5100, to: Infinity, rate: 20 }
];

// Base fee in agorot for bicycle / motorcycle / car.
// 3 ILS up to 200m, then each started 100m within a band adds that band's rate,
// so 101-200m pays 3 ILS, 201-300m pays 3.55, and so on (matches the original calculator).
function riderFee(m) {
    let fee = 300;
    for (const b of BANDS) {
        const len = Math.min(Math.max(m - b.from, 0), b.to - b.from);
        fee += Math.ceil(len / 100) * b.rate;
    }
    return fee;
}

// Base fee in agorot for walkers.
// 7 ILS up to 100m, +1 ILS per started 50m, capped at 16 ILS.
function walkerFee(m) {
    if (m <= 100) return 700;
    return Math.min(700 + Math.ceil((m - 100) / 50) * 100, 1600);
}

// Final payment rounded up to a whole shekel, including bonus percentage.
function payment(meters, bonusPercent = 0, walker = false) {
    const base = walker ? walkerFee(meters) : riderFee(meters);
    // base * (100 + bonus) is in units of 1/10000 ILS; round away float noise
    // from fractional bonuses before dividing so exact integers stay exact.
    const units = Math.round(base * (100 + bonusPercent) * 100);
    return Math.ceil(units / 1e6);
}

if (typeof module !== 'undefined') module.exports = { riderFee, walkerFee, payment };
