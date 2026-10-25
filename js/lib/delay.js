/*
 * Delivery Late compensation for customers.
 * The order total is turned into agorot (integers) so percentages stay
 * exact; the result is rounded up to a whole shekel. Credits are shekels.
 */

// Restaurant orders, by minutes late (the first band whose `to` fits).
// percent: share of the order total; fee: the delivery fee is refunded in
// credits, or a flat amount for Wolt+ customers.
const RESTAURANT_BANDS = [
    { to: 15 },
    { to: 25, fee: true, woltPlus: 10 },
    { to: 30, percent: 18 },
    { to: 40, percent: 19 },
    { to: 45, percent: 28 },
    { to: Infinity, percent: 30 }
];

// Retail (supermarket) orders pay fixed credits whatever the order costs.
const RETAIL_BANDS = [
    { to: 25 },
    { to: 40, credits: 20, woltPlus: 10 },
    { to: 50, credits: 25 },
    { to: Infinity, credits: 30 }
];

// Whether the compensation for these minutes depends on the order total
function needsPrice(minutes, retail = false) {
    const band = (retail ? RETAIL_BANDS : RESTAURANT_BANDS).find(b => minutes <= b.to);
    return band.percent !== undefined;
}

// Compensation in whole shekels, rounded up; 'deliveryFee' when the delivery
// fee is refunded instead. `price` is the order total in shekels, delivery
// included; it only matters for restaurant percentage bands.
function delayCompensation(minutes, price, retail = false, woltPlus = false) {
    const band = (retail ? RETAIL_BANDS : RESTAURANT_BANDS).find(b => minutes <= b.to);
    if (woltPlus && band.woltPlus !== undefined) return band.woltPlus;
    if (band.fee) return 'deliveryFee';
    if (band.credits !== undefined) return band.credits;
    if (band.percent === undefined) return 0;
    const agorot = Math.round(price * 100);
    return Math.ceil(agorot * band.percent / 10000);
}

if (typeof module !== 'undefined') module.exports = { delayCompensation, needsPrice };
