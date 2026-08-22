// Central email/notification service (issue #14).
//
// No SMTP provider yet — like the auth verification links, every message is
// logged in development. To go live: build a nodemailer transport from SMTP
// env vars in `deliver()` and delete the dev branch. Every public function
// swallows its own errors after logging, so mail problems can never break
// the request that triggered them.

const FROM = 'DayFlow HRMS <no-reply@dayflow.dev>';

async function deliver(message) {
  // Dev transport: structured console log, one line per message
  console.log(
    `[mailer] from=${FROM} to=${message.to} subject="${message.subject}"\n` +
      `[mailer] ${message.text.replace(/\n/g, '\n[mailer] ')}`,
  );
}

// Fire-and-forget wrapper for controllers: `void send(...)`
export async function send(message) {
  try {
    if (!message?.to) return;
    await deliver(message);
  } catch (err) {
    console.error(`[mailer] delivery failed (${message?.subject}): ${err.message}`);
  }
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtMoney(amount, currency) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function leaveDays(leave) {
  return Math.round((+new Date(leave.endDate) - +new Date(leave.startDate)) / 86_400_000) + 1;
}

// Leave request approved/rejected → notify the applicant (with reviewer comment)
export function notifyLeaveDecision(employee, leave) {
  const name = employee.name || employee.email;
  const comment = leave.reviewerComment ? `\nComment: "${leave.reviewerComment}"` : '';
  return send({
    to: employee.email,
    subject: `Your ${leave.type.toLowerCase()} leave was ${leave.status.toLowerCase()}`,
    text:
      `Hi ${name || 'there'},\n\n` +
      `Your ${leave.type.toLowerCase()} leave request for ` +
      `${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)} ` +
      `(${leaveDays(leave)} day${leaveDays(leave) > 1 ? 's' : ''}) has been ` +
      `${leave.status.toLowerCase()}.${comment}\n\n— DayFlow HRMS`,
  });
}

// New leave request → notify HR (and ADMIN as fallback approvers)
export function notifyNewLeaveRequest(applicant, leave, approvers) {
  const requester = applicant.name || applicant.email || applicant.employeeId;
  const remarks = leave.remarks ? `\nRemarks: "${leave.remarks}"` : '';
  return Promise.all(
    (approvers ?? []).map((approver) =>
      send({
        to: approver.email,
        subject: `New leave request: ${requester} · ${leave.type.toLowerCase()}`,
        text:
          `Hi ${approver.name || approver.email},\n\n` +
          `${requester} requested ${leave.type.toLowerCase()} leave for ` +
          `${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)} ` +
          `(${leaveDays(leave)} day${leaveDays(leave) > 1 ? 's' : ''}).${remarks}\n` +
          `Review it under Approvals in DayFlow.\n\n— DayFlow HRMS`,
      }),
    ),
  );
}

// Salary structure updated → payslip-ready notification to the employee
export function notifyPayslipReady(employee, payroll, changedBy) {
  const name = employee.name || employee.email;
  const editor = changedBy?.name || changedBy?.email || 'HR';
  return send({
    to: employee.email,
    subject: 'Your payslip has been updated',
    text:
      `Hi ${name || 'there'},\n\n` +
      `Your salary structure was updated by ${editor}, effective ` +
      `${fmtDate(payroll.effectiveFrom)}.\n` +
      `New net pay: ${fmtMoney(payroll.netPay, payroll.currency)} ` +
      `(basic ${fmtMoney(payroll.basicSalary, payroll.currency)} + ` +
      `${fmtMoney(payroll.totalAllowances ?? 0, payroll.currency)} allowances − ` +
      `${fmtMoney(payroll.totalDeductions ?? 0, payroll.currency)} deductions).\n` +
      `View the full breakdown under Payslip in DayFlow.\n\n— DayFlow HRMS`,
  });
}
