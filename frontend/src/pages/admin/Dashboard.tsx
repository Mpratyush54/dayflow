import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import Sparkline from '../../components/charts/Sparkline';
import { useCountUp } from '../../hooks/useCountUp';

const employees = [
  { id: 'EMP-0042', name: 'Pratyush M.', initials: 'PM', tone: 'mint', role: 'Employee', status: 'PRESENT' },
  { id: 'EMP-0038', name: 'Aisha K.', initials: 'AK', tone: 'peach', role: 'Employee', status: 'PRESENT' },
  { id: 'EMP-0051', name: 'Rohan S.', initials: 'RS', tone: 'lavender', role: 'Employee', status: 'HALF_DAY' },
  { id: 'EMP-0027', name: 'Meera T.', initials: 'MT', tone: 'sky', role: 'HR', status: 'LEAVE' },
];

const pendingLeaves = [
  { id: 'LV-104', who: 'Pratyush M. · EMP-0042', detail: 'Sick · Aug 24–25', initials: 'PM', tone: 'mint' },
  { id: 'LV-105', who: 'Rohan S. · EMP-0051', detail: 'Paid · Aug 28', initials: 'RS', tone: 'lavender' },
];

const attendanceTrend = [3, 4, 4, 3, 4, 3, 2, 4, 4, 3, 4, 4, 3, 4];
const trendLabels = ['W1', '', 'W2', '', 'W3', '', 'W4'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const present = useCountUp(3, 700, 150);
  const pending = useCountUp(2, 700, 250);

  return (
    <Sidebar
      user={{ name: 'Meera T.', role: 'HR · Admin', initials: 'MT' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧' },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓', badge: '2' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
      ]}
    >
      <div className="container page">
      <div className="orb page__orb" aria-hidden />

      <div className="dash-head">
        <div>
          <p className="dash-sub">Friday, August 22</p>
          <h1>Admin overview</h1>
        </div>
        <div className="hero-actions">
          <Button variant="outline">Export report</Button>
          <Button onClick={() => navigate('/admin/approvals')}>Review approvals</Button>
        </div>
      </div>

      <div className="stat-row">
        <Card>
          <span className="stat">{employees.length}</span>
          <span className="stat-label">Employees</span>
          <Sparkline points={[3, 3, 4, 4, 4]} tone="mint" />
        </Card>
        <Card>
          <span className="stat">{present}</span>
          <span className="stat-label">Present today</span>
          <Sparkline points={[3, 4, 4, 3, 3]} tone="sky" />
        </Card>
        <Card>
          <span className="stat">{pending}</span>
          <span className="stat-label">Pending approvals</span>
          <Sparkline points={[1, 2, 1, 3, 2]} tone="peach" />
        </Card>
        <Card className="card--dark">
          <span className="stat">1</span>
          <span className="stat-label">On leave</span>
          <Sparkline points={[0, 1, 0, 1, 1]} tone="lavender" />
        </Card>
      </div>

      <div className="viz-grid viz-grid--wide">
        <Card heading="Attendance trend">
          <AreaChart id="admin-attendance" points={attendanceTrend} labels={trendLabels} height={200} />
        </Card>
        <Card className="viz-grid__donut">
          <Donut value={75} label="Payroll processed" sublabel="3 of 4 employees" />
        </Card>
      </div>

      <div className="dash-grid">
        <Card heading="Employees">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Role</th><th>Today</th></tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="table-mono">{e.id}</td>
                  <td><span className="cell-name"><span className={`avatar avatar--${e.tone}`}>{e.initials}</span>{e.name}</span></td>
                  <td>{e.role}</td>
                  <td>
                    <Badge tone={e.status === 'PRESENT' ? 'success' : e.status === 'LEAVE' ? 'error' : 'neutral'}>
                      {e.status.replace('_', '-').toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card heading="Leave approvals">
          <ul className="leave-list">
            {pendingLeaves.map((l) => (
              <li key={l.id} className="leave-row">
                <span className="cell-name">
                  <span className={`avatar avatar--${l.tone}`}>{l.initials}</span>
                  <span>
                    <span className="leave-who">{l.who}</span>
                    <span className="leave-detail" style={{ display: 'block' }}>{l.detail}</span>
                  </span>
                </span>
                <span className="leave-actions">
                  <Button variant="outline">Reject</Button>
                  <Button>Approve</Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="dash-sub" style={{ marginTop: 16 }}>2 pending · 14 approved this month</p>
        </Card>
      </div>

      <div className="cta-band">
        <div className="orb" aria-hidden />
        <div className="cta-band__text">
          <h3 className="cta-band__title">August payroll is almost ready</h3>
          <p className="cta-band__sub">3 of 4 salary structures reviewed · 1 pending update</p>
        </div>
        <Button onClick={() => navigate('/admin/payroll')}>Review payroll</Button>
      </div>
      </div>
    </Sidebar>
  );
}
