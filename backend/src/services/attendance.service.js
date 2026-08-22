import LeaveRequest from '../models/leave.model.js';

// Leave ↔ attendance integration. The attendance model derives ABSENT/LEAVE
// at read time (records only exist for check-in days), so this service maps
// APPROVED leave requests onto local-calendar date keys for the attendance
// views.

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftKey(key, days) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

// Returns Map<userId, Set<'YYYY-MM-DD'>> covering every day of the users'
// APPROVED leave that overlaps [fromDate, toDate] (inclusive, date keys).
export async function getApprovedLeaveDays(userIds, fromDate, toDate) {
  const ids = userIds.map(String);
  const leaves = await LeaveRequest.find({
    userId: { $in: ids },
    status: 'APPROVED',
    startDate: { $lte: new Date(`${toDate}T23:59:59.999`) },
    endDate: { $gte: new Date(`${fromDate}T00:00:00.000`) },
  }).select('userId startDate endDate');

  const byUser = new Map(ids.map((id) => [id, new Set()]));
  for (const leave of leaves) {
    const days = byUser.get(leave.userId.toString());
    if (!days) continue;
    for (let key = localDateKey(leave.startDate); key <= localDateKey(leave.endDate); key = shiftKey(key, 1)) {
      days.add(key);
    }
  }
  return byUser;
}
