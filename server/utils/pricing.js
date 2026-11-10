// Fee computation for on-demand pickups by a private operator.
// Fee = the operator's per-waste-type base + a load-size surcharge.
// Kept here (not in a controller) so the model, routes and seed all agree.

const WASTE_TYPES = ['household', 'bulky', 'recyclables', 'garden'];
const LOAD_SIZES = ['small', 'medium', 'large'];

// Fallback surcharges if the operator hasn't set their own (FCFA).
const DEFAULT_LOAD_SURCHARGE = { small: 0, medium: 500, large: 1500 };

// Resolve the base fee for a waste type from the operator's pricing,
// falling back to baseFee (household) / commercialRate (bulky).
function baseFeeFor(operator, wasteType) {
  const pricing = operator.pricing || {};
  if (typeof pricing[wasteType] === 'number') return pricing[wasteType];
  if (wasteType === 'bulky' && typeof operator.commercialRate === 'number') {
    return operator.commercialRate;
  }
  return typeof operator.baseFee === 'number' ? operator.baseFee : 0;
}

// Compute the total fee (FCFA) for a pickup request against an operator.
function computeFee(operator, { wasteType, loadSize }) {
  const base = baseFeeFor(operator, wasteType);
  const surcharge =
    (operator.loadSurcharge && typeof operator.loadSurcharge[loadSize] === 'number'
      ? operator.loadSurcharge[loadSize]
      : DEFAULT_LOAD_SURCHARGE[loadSize]) || 0;
  return Math.max(0, Math.round(base + surcharge));
}

module.exports = { WASTE_TYPES, LOAD_SIZES, DEFAULT_LOAD_SURCHARGE, computeFee, baseFeeFor };
