import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import CountdownRing from '../../components/common/CountdownRing';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import Heatmap from '../../components/charts/Heatmap';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useCountUp } from '../../hooks/useCountUp';
import { useDelayedReady } from '../../hooks/useDelayedReady';

const hoursWeek = [7.5, 8, 4, 8.5, 0, 0, 0];
const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const month = Array.from({ length: 30 }, (_, i) => ({
  date: i + 1,
  level: ([3, 2, 3, 3, 0, 1, 1, 3, 2, 3, 3, 1, 0, 0, 2, 3, 3, 3, 2, 1, 1, 3, 3, 2, 3, 3, 0, 1, 2, 3][i] as 0 | 1 | 2 | 3),
}));

const balances = [
  { label: 'Paid leave', used: 6, total: 18, tone: 'mint' },
  { label: 'Sick leave', used: 2, total: 10, tone: 'peach' },
  { label: 'Unpaid leave', used: 0, total: 5, tone: 'lavender' },
];

const activity = [
  { text: 'Leave request (Sick, Aug 24–25) submitted', when: '2h ago' },
  { text: 'Checked in at 9:02 AM', when: 'Today' },
  { text: 'Payslip for July is available', when: 'Aug 1' },
];

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__hero">
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--wide" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [checkedIn, setCheckedIn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const attendance = useCountUp(92, 900, 200);
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Sidebar
      user={{ name: 'Pratyush M.', role: 'Employee · EMP-0042', initials: 'PM' }}
      items={[
        { to: '/dashboard', label: 'Dashboard', icon: '◧' },
        { to: '/profile', label: 'Profile', icon: '👤' },
        { to: '/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/leaves', label: 'Leave', icon: '🌴', badge: '1' },
        { to: '/payslip', label: 'Payslip', icon: '💵' },
      ]}
      commands={[
        { label: 'Dashboard', hint: 'page', to: '/dashboard' },
        { label: 'My profile', hint: 'page', to: '/profile' },
        { label: 'Attendance', hint: 'page', to: '/attendance' },
        { label: 'Apply for leave', hint: 'action', to: '/leaves' },
        { label: 'View payslip', hint: 'action', to: '/payslip' },
        { label: 'Admin view', hint: 'demo', to: '/admin' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        {!ready ? <Skeletons /> : (<>
        <div className="dash-head">
          <div>
            <p className="dash-sub">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {time}</p>
            <h1>Good morning,<br /><span className="text-gradient">Pratyush</span></h1>
          </div>
          <div className="hero-actions">
            <span className="streak">🔥 12-day streak</span>
            <Badge tone={checkedIn ? 'success' : 'neutral'}>{checkedIn ? 'Checked in' : 'Not checked in'}</Badge>
            <Button
              variant={checkedIn ? 'outline' : 'primary'}
              onClick={() => {
                setCheckedIn(!checkedIn);
                push(checkedIn ? 'Checked out — see you tomorrow' : 'Checked in at ' + time);
              }}
            >
              {checkedIn ? 'Check out' : 'Check in'}
            </Button>
          </div>
        </div>

        <div className="bento">
          <Card className="bento__hero card--grad" heading="Hours this week">
            <div className="art" style={{ marginBottom: 16 }} aria-hidden />
            <AreaChart id="hours" points={hoursWeek} labels={weekLabels} suffix="h" height={200} />
            <p className="dash-sub">28h logged · 4h more than last week <span className="stat-delta">↑ 17%</span></p>
          </Card>

          <Card className="bento__tall card--tint-mint">
            <Donut value={92} label="Attendance · August" sublabel={`${attendance}% present`} />
          </Card>

          <Card className="bento__mid card--tint-lavender" heading="August at a glance">
            <Heatmap days={month} />
            <div className="heatmap-legend">
              <span>less</span>
              <span className="heatmap__cell heatmap__cell--1" />
              <span className="heatmap__cell heatmap__cell--2" />
              <span className="heatmap__cell heatmap__cell--3" />
              <span>more</span>
            </div>
          </Card>

          <Card className="bento__mid card--dark">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CountdownRing days={10} total={31} label="to payday" />
              <div>
                <span className="stat-xl">₹61.3k</span>
                <p className="dash-sub" style={{ color: 'var(--color-on-dark-soft)', marginTop: 6 }}>Net pay · August</p>
              </div>
            </div>
            <div className="summary-row" style={{ marginTop: 16 }}>
              <span className="summary-row__label">Basic + allowances</span>
              <span className="summary-row__value">₹ 67,400</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Deductions</span>
              <span className="summary-row__value">₹ 6,100</span>
            </div>
          </Card>

          <Card className="bento__mid card--tint-peach" heading="Leave balance">
            {balances.map((b) => (
              <div key={b.label} className="balance-row">
                <div className="balance-top">
                  <span>{b.label}</span>
                  <span>{b.total - b.used} of {b.total} left</span>
                </div>
                <div className="balance-track">
                  <div
                    className={`balance-fill balance-fill--${b.tone}`}
                    style={{ width: `${((b.total - b.used) / b.total) * 100}%`, animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            ))}
          </Card>

          <Card className="bento__wide" heading="Recent activity">
            <ul className="activity-list">
              {activity.map((a) => (
                <li key={a.text}>
                  <span>{a.text}</span>
                  <span className="activity-when">{a.when}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="cta-band">
          <div className="orb" aria-hidden />
          <div className="cta-band__text">
            <h3 className="cta-band__title">Your July payslip is ready</h3>
            <p className="cta-band__sub">Net pay ₹ 61,300 · credited Aug 1</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/payslip')}>View payslip</Button>
        </div>
        </>)}
      </div>
    </Sidebar>
  );
}
