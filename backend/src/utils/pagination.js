export function parsePagination(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : defaultLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse(docs, total, page, limit) {
  return {
    data: docs,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    limit,
  };
}
