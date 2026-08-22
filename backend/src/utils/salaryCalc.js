/** Standard payroll keys — auto-calculated on every save */
export const PF_KEY = 'provident_fund';
export const PROF_TAX_KEY = 'professional_tax';

const PF_RATE = 0.12;
const PROF_TAX_AMOUNT = 200;

export function computeStandardDeductions(basicSalary) {
  const basic = Math.max(Number(basicSalary) || 0, 0);
  return {
    [PF_KEY]: Math.round(basic * PF_RATE),
    [PROF_TAX_KEY]: PROF_TAX_AMOUNT,
  };
}

/** Merge manual deductions with mandatory PF (12% of basic) and Prof Tax (₹200). */
export function mergeStandardDeductions(basicSalary, manualDeductions = {}) {
  const standard = computeStandardDeductions(basicSalary);
  return { ...manualDeductions, ...standard };
}

/**
 * Compute allowance component amount.
 * @param {'fixed'|'percent_of_wage'|'percent_of_basic'} mode
 */
export function computeComponentAmount(mode, value, monthlyWage, basicAmount) {
  const num = Number(value) || 0;
  if (mode === 'percent_of_wage') return Math.round(monthlyWage * (num / 100));
  if (mode === 'percent_of_basic') return Math.round(basicAmount * (num / 100));
  return Math.round(num);
}

/**
 * Build flat payroll structure from monthly wage + component rules.
 * `basic` is stored as basicSalary; other components go to allowances.
 */
export function buildPayrollStructure(monthlyWage, components) {
  const wage = Math.max(Number(monthlyWage) || 0, 0);
  let basicAmount = 0;
  const allowances = {};

  for (const comp of components) {
    if (comp.key === 'basic') {
      basicAmount = computeComponentAmount(comp.mode, comp.value, wage, 0);
      continue;
    }
    if (comp.key === 'fixed_allowance') continue;
    const amount = computeComponentAmount(comp.mode, comp.value, wage, basicAmount);
    if (amount > 0) allowances[comp.key] = amount;
  }

  const otherTotal = Object.values(allowances).reduce((s, v) => s + v, 0);
  const fixedAllowance = Math.max(wage - basicAmount - otherTotal, 0);
  if (fixedAllowance > 0) allowances.fixed_allowance = fixedAllowance;

  const deductions = mergeStandardDeductions(basicAmount, {});

  return {
    basicSalary: basicAmount,
    allowances,
    deductions,
    monthlyWage: wage,
    grossPay: basicAmount + Object.values(allowances).reduce((s, v) => s + v, 0),
  };
}
