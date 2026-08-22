import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  return (
    <AppLayout
      links={
        <>
          <a href="#">Employees</a>
          <a href="#">Attendance</a>
          <a href="#">Leave approvals</a>
          <a href="#">Payroll</a>
          <Button variant="text" onClick={() => navigate('/signin')}>Logout</Button>
        </>
      }
    >
      <div className="orb page__orb" aria-hidden />

      <div className="dash-head">
        <div>
          <p className="dash-sub">Friday, August 22</p>
          <h1>Admin overview</h1>
        </div>
        <Button variant="outline" style={{ alignSelf: 'flex-end' }}>Export report</Button>
      </div>

      <div className="stat-row">
        <Card>
          <span className="stat">4</span>
          <span className="stat-label">Employees</span>
        </Card>
        <Card>
          <span className="stat">3</span>
          <span className="stat-label">Present today</span>
        </Card>
        <Card>
          <span className="stat">2</span>
          <span className="stat-label">Pending approvals</span>
        </Card>
        <Card className="card--dark">
          <span className="stat">1</span>
          <span className="stat-label">On leave</span>
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
    </AppLayout>
  );
}
