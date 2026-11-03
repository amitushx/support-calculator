/*
 * The plain calculator: + − × ÷ and %, with × and ÷ before + and −.
 * The result keeps up to 3 digits after the point, rounded half away from
 * zero; with the floating-point noise trimmed first, 0.1 + 0.2 is 0.3
 * rather than 0.30000000000000004, and 1.0005 rounds up to 1.001.
 */

const DECIMALS = 3;
function roundResult(value) {
    const clean = Number(value.toPrecision(15));
    if (Math.abs(clean) >= 1e12) return clean;   // no decimals left to round
    const scaled = Number((Math.abs(clean) * 10 ** DECIMALS).toPrecision(15));
    return Math.sign(clean) * Math.round(scaled) / 10 ** DECIMALS || 0;   // || 0: no -0
}

// The expression as typed: numbers, each maybe with a % after it, and the
// operators + - * /. A - right at the start or after * or / is the number's
// sign. A trailing operator is ignored, so a half-typed expression still
// has a value to show.
// Returns the value, null for nothing to calculate, or 'divByZero'.
function calculate(expr) {
    const tokens = expr.match(/(\d+\.?\d*|\.\d+)%?|[-+*/]/g) ?? [];
    if (/[-+*/]$/.test(expr)) tokens.pop();
    // Each term, joined by + or -: its sign and its factors, joined by * or /
    const terms = [];
    let term = null, op = '*', sign = 1;
    for (const tok of tokens) {
        if (/^[-+*/]$/.test(tok)) {
            if (term === null || op !== null) {   // no number since the last operator: a sign
                if (tok === '-') sign = -sign;
                continue;
            }
            if (tok === '+' || tok === '-') {
                terms.push(term);
                term = null;
                op = '*';
                sign = tok === '-' ? -1 : 1;
            } else op = tok;
            continue;
        }
        const factor = { n: sign * parseFloat(tok), percent: tok.endsWith('%'), op };
        term ??= { factors: [] };
        term.factors.push(factor);
        op = null;
        sign = 1;
    }
    if (term) terms.push(term);
    if (!terms.length) return null;

    let total = 0;
    for (const [i, t] of terms.entries()) {
        // a + b% adds b% of a, like a phone calculator; anywhere else b% is b/100
        if (i > 0 && t.factors.length === 1 && t.factors[0].percent) {
            total += total * t.factors[0].n / 100;
            continue;
        }
        let value = 1;
        for (const f of t.factors) {
            const n = f.percent ? f.n / 100 : f.n;
            if (f.op === '/') {
                if (n === 0) return 'divByZero';
                value /= n;
            } else value *= n;
        }
        total += value;
    }
    return roundResult(total);
}
