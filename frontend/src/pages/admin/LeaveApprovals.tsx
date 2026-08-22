import { Fragment, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { getAllLeaves, reviewLeave } from '../../api/leaves';
import type { ReviewDecision } from '../../api/leaves';
import type { LeaveApplicant, LeaveRequest, LeaveStatus } from '../../types';

const FILTERS: { key: 'ALL' | LeaveStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_TONE: Record<LeaveStatus, 'success' | 'error' | 'neutral'> = {
  APPROVED: 'success',
  REJECTED: 'error',
  PENDING: 'neutral',
};

const AVATAR_TONES = ['mint', 'peach', 'lavender', 'sky'];

function applicantOf(leave: LeaveRequest): LeaveApplicant {
  return typeof leave.userId === 'string'
    ? { id: leave.userId, employeeId: '—', email: '', role: 'EMPLOYEE' }
    : leave.userId;
}

function toneOf(seed: string) {
  const sum = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function daysInclusive(start: string, end: string) {
  return Math.round((+new Date(end) - +new Date(start)) / 86_400_000) + 1;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function LeaveApprovals() {
  const ready = useDelayedReady();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const { toasts, push } = useToasts();
  const [leaves, setLeaves] = useState<LeaveRequest[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [filter, setFilter] = useState<'ALL' | LeaveStatus>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(p = page) {
    try {
      const res = await getAllLeaves(filter === 'ALL' ? undefined : filter, p, 10);
      if (Array.isArray(res)) {
        setLeaves(res);
        setPagination(null);
      } else {
        setLeaves(res.data);
        setPagination({ total: res.total, pages: res.pages });
      }
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    }
  }

  useEffect(() => { void load(page); }, [page, filter]);

  const pending = leaves?.filter((l) => l.status === 'PENDING').length ?? 0;

  const visible = (leaves ?? [])
    .filter((l) => filter === 'ALL' || l.status === filter)
    .sort((a, b) => {
      if ((a.status === 'PENDING') !== (b.status === 'PENDING')) return a.status === 'PENDING' ? -1 : 1;
      return +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0);
    });

  function setComment(id: string) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setComments((prev) => ({ ...prev, [id]: e.target.value }));
  }

  async function decide(id: string, status: ReviewDecision, who: string) {
    setBusyId(id);
    try {
      await reviewLeave(id, status, comments[id]);
      push(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${who}'s leave`);
      setExpanded(null);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Sidebar
      user={{ name: 'Meera T.', role: 'HR · Admin', initials: 'MT' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧', end: true },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓', ...(pending > 0 ? { badge: String(pending) } : {}) },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
      ]}
      commands={[
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        {!ready ? (
          <div className="bento">
            <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
          </div>
        ) : loadError ? (
          <p className="dash-sub">{loadError}</p>
        ) : (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">Pending first · decisions are final until re-requested</p>
                <h1>Leave <span className="text-gradient">approvals</span></h1>
              </div>
              <div className="hero-actions">
                {FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    variant={filter === f.key ? 'primary' : 'outline'}
                    onClick={() => {
                      setFilter(f.key);
                      setSearchParams({});
                    }}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="bento__wide table-card" heading={`Requests (${pagination ? pagination.total : visible.length})`}>
              {visible.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {visible.map((l) => {
                      const who = applicantOf(l);
                      const name = who.name || who.email || who.id;
                      const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
                      const isOpen = expanded === l.id;
                      const isPending = l.status === 'PENDING';
                      const busy = busyId === l.id;
                      return (
                        <Fragment key={l.id}>
                          <tr
                            className={isPending ? 'expandable-row' : ''}
                            onClick={isPending ? () => setExpanded(isOpen ? null : l.id) : undefined}
                          >
                            <td>
                              <span className="cell-name">
                                <span className={`avatar avatar--${toneOf(name)}`}>{initials}</span>
                                <span>
                                  {name}
                                  <span className="dash-sub" style={{ display: 'block' }}>{who.employeeId}</span>
                                </span>
                              </span>
                            </td>
                            <td className="table-mono">{l.type}</td>
                            <td>{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                            <td>{daysInclusive(l.startDate, l.endDate)}</td>
                            <td>
                              <Badge tone={STATUS_TONE[l.status]}>{l.status.toLowerCase()}</Badge>
                              {l.reviewerComment && (
                                <span className="dash-sub" style={{ display: 'block' }} title={l.reviewerComment}>
                                  “{l.reviewerComment}”
                                </span>
                              )}
                            </td>
                            <td>
                              {isPending ? (
                                <span className="leave-actions" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => void decide(l.id, 'REJECTED', name)}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    disabled={busy}
                                    onClick={() => void decide(l.id, 'APPROVED', name)}
                                  >
                                    Approve
                                  </Button>
                                </span>
                              ) : (
                                <span className="dash-sub">—</span>
                              )}
                            </td>
                          </tr>
                          {isOpen && l.status === 'PENDING' && (
                            <tr className="row-detail">
                              <td colSpan={6}>
                                <div className="row-detail__inner">
                                  {l.remarks && (
                                    <div>
                                      <strong>Remarks</strong>
                                      <div className="dash-sub">{l.remarks}</div>
                                    </div>
                                  )}
                                  <input
                                    className="input"
                                    placeholder="Add a comment (optional)"
                                    maxLength={500}
                                    value={comments[l.id] ?? ''}
                                    onChange={setComment(l.id)}
                                    style={{ maxWidth: 320 }}
                                  />
                                  <span className="leave-actions" style={{ marginLeft: 'auto' }}>
                                    <Button
                                      variant="outline"
                                      disabled={busyId === l.id}
                                      onClick={() => void decide(l.id, 'REJECTED', name)}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      disabled={busyId === l.id}
                                      onClick={() => void decide(l.id, 'APPROVED', name)}
                                    >
                                      Approve
                                    </Button>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="dash-sub">Nothing here — all caught up ✓</p>
              )}
              {pagination && visible.length > 0 && (
                <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => setSearchParams(p === 1 ? {} : { page: String(p) })} />
              )}
              <p className="dash-sub" style={{ marginTop: 12 }}>Click a pending row to review it</p>
            </Card>
          </>
        )}
      </div>
    </Sidebar>
  );
}
