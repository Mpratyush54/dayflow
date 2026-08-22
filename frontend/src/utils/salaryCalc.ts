export const PF_KEY = 'provident_fund';
export const PROF_TAX_KEY = 'professional_tax';

export type ComponentMode = 'fixed' | 'percent_of_wage' | 'percent_of_basic';

export interface SalaryComponent {
  key: string;
  label: string;
  mode: ComponentMode;
  value: string;
  auto?: boolean;
}

export const DEFAULT_SALARY_COMPONENTS: SalaryComponent[] = [
  { key: 'basic', label: 'Basic', mode: 'percent_of_wage', value: '50' },
  { key: 'hra', label: 'HRA', mode: 'percent_of_basic', value: '50' },
  { key: 'standard_allowance', label: 'Standard Allowance', mode: 'fixed', value: '0' },
  { key: 'fixed_allowance', label: 'Fixed Allowance', mode: 'fixed', value: '0', auto: true },
];

export function computeStandardDeductions(basicSalary: number) {
  const basic = Math.max(basicSalary, 0);
  return {
    [PF_KEY]: Math.round(basic * 0.12),
    [PROF_TAX_KEY]: 200,
  };
}

export function computeComponentAmount(
  mode: ComponentMode,
  value: string,
  monthlyWage: number,
  basicAmount: number,
) {
  const num = Number(value) || 0;
  if (mode === 'percent_of_wage') return Math.round(monthlyWage * (num / 100));
  if (mode === 'percent_of_basic') return Math.round(basicAmount * (num / 100));
  return Math.round(num);
}

export function buildStructurePreview(monthlyWage: number, components: SalaryComponent[]) {
  const wage = Math.max(monthlyWage, 0);
  let basicAmount = 0;
  const allowanceLines: { key: string; label: string; amount: number }[] = [];

  for (const comp of components) {
    if (comp.key === 'basic') {
      basicAmount = computeComponentAmount(comp.mode, comp.value, wage, 0);
      continue;
    }
    if (comp.auto) continue;
    const amount = computeComponentAmount(comp.mode, comp.value, wage, basicAmount);
    allowanceLines.push({ key: comp.key, label: comp.label, amount });
  }

  const otherTotal = allowanceLines.reduce((s, l) => s + l.amount, 0);
  const fixedAllowance = Math.max(wage - basicAmount - otherTotal, 0);
  if (fixedAllowance > 0) {
    allowanceLines.push({ key: 'fixed_allowance', label: 'Fixed Allowance', amount: fixedAllowance });
  }

  const allowances = Object.fromEntries(allowanceLines.map((l) => [l.key, l.amount]));
  const deductions = computeStandardDeductions(basicAmount);
  const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
  const gross = basicAmount + totalAllowances;
  const net = gross - totalDeductions;

  return {
    basicSalary: basicAmount,
    allowances,
    allowanceLines,
    deductions,
    gross,
    net,
    totalDeductions,
    componentTotal: basicAmount + otherTotal + fixedAllowance,
    withinWage: basicAmount + otherTotal + fixedAllowance <= wage,
  };
}

/** Reverse-engineer monthly wage from stored payroll (basic + allowances). */
export function inferMonthlyWage(basicSalary: number, allowances?: Record<string, number>) {
  const allowTotal = Object.values(allowances ?? {}).reduce((s, v) => s + v, 0);
  return basicSalary + allowTotal;
}

export function recordToComponents(
  basicSalary: number,
  allowances?: Record<string, number>,
): SalaryComponent[] {
  const wage = inferMonthlyWage(basicSalary, allowances);
  const basicPct = wage > 0 ? Math.round((basicSalary / wage) * 100) : 50;
  const hraAmount = allowances?.hra ?? 0;
  const hraPct = basicSalary > 0 && hraAmount ? Math.round((hraAmount / basicSalary) * 100) : 50;
  const stdAmount = allowances?.standard_allowance ?? 0;

  return [
    { key: 'basic', label: 'Basic', mode: 'percent_of_wage', value: String(basicPct) },
    { key: 'hra', label: 'HRA', mode: 'percent_of_basic', value: String(hraPct) },
    { key: 'standard_allowance', label: 'Standard Allowance', mode: 'fixed', value: String(stdAmount) },
    { key: 'fixed_allowance', label: 'Fixed Allowance', mode: 'fixed', value: '0', auto: true },
  ];
}
