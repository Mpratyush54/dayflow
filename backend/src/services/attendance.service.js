// Integration point between leave approval (issue #9) and the attendance
// module (issue #7). Kept as an isolated service so leave approval works
// before/after attendance lands without touching the leave controller.

// Called when a leave request is approved. Once the Attendance model from
// issue #7 exists, this should upsert one record per day in the range:
//   { userId, date, status: 'LEAVE' }
export async function markLeaveInAttendance(userId, startDate, endDate) {
  // TODO(#7): upsert Attendance records for each day in [startDate, endDate]
  console.log(
    `[leave] approved leave ${startDate.toISOString().slice(0, 10)}..${endDate
      .toISOString()
      .slice(0, 10)} for user ${userId} — attendance sync lands with #7`,
  );
}
