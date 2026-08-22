/** Escape user input for safe use inside RegExp */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a case-insensitive $or filter on name, email, employeeId */
export function employeeTextFilter(q) {
  const term = typeof q === 'string' ? q.trim() : '';
  if (!term) return null;
  const re = new RegExp(escapeRegex(term), 'i');
  return {
    $or: [{ name: re }, { email: re }, { employeeId: re }],
  };
}
