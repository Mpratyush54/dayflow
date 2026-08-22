import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const week = [
  { day: 'Mon', date: '17', status: 'PRESENT' },
  { day: 'Tue', date: '18', status: 'PRESENT' },
  { day: 'Wed', date: '19', status: 'HALF_DAY' },
  { day: 'Thu', date: '20', status: 'PRESENT' },
  { day: 'Fri', date: '21', status: 'LEAVE' },
];

const activity = [
  { text: 'Leave request (Sick, Aug 24–25) submitted', when: '2h ago' },
  { text: 'Checked in at 9:02 AM', when: 'Today' },
  { text: 'Payslip for July is available', when: 'Aug 1' },
];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <AppLayout
      links={
        <>
          <a href="#">Profile</a>
          <a href="#">Attendance</a>
          <a href="#">Leave</a>
          <Button variant="text" onClick={() => navigate('/signin')}>Logout</Button>
        </>
      }
    >
      <div className="orb page__orb" aria-hidden />

      <div className="dash-head">
        <div>
          <p className="dash-sub">Friday, August 22</p>
          <h1>Good morning,<br />Pratyush</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="dash-sub" style={{ marginBottom: 8 }}>Employee · EMP-0042</p>
          <Badge>{checkedIn ? 'Checked in' : 'Not checked in'}</Badge>
        </div>
      </div>

      <div className="quick-cards">
        <Card>
          <span className="chip" aria-hidden>👤</span>
          <h3 className="card__heading">Profile</h3>
          <p>Personal &amp; job details, documents.</p>
          <Button variant="outline">View profile</Button>
        </Card>
        <Card>
          <span className="chip" aria-hidden>🗓</span>
          <h3 className="card__heading">Attendance</h3>
          <p>Daily &amp; weekly check-in history.</p>
          <Button variant="outline">View attendance</Button>
        </Card>
        <Card>
          <span className="chip" aria-hidden>🌴</span>
          <h3 className="card__heading">Leave requests</h3>
          <p>Apply and track time-off status.</p>
          <Button variant="outline">Apply for leave</Button>
        </Card>
        <Card>
          <span className="chip" aria-hidden>⏱</span>
          <h3 className="card__heading">Today</h3>
          <p>{checkedIn ? 'Checked in — have a good day.' : 'Not checked in yet.'}</p>
          <Button variant={checkedIn ? 'outline' : 'primary'} onClick={() => setCheckedIn(!checkedIn)}>
            {checkedIn ? 'Check out' : 'Check in'}
          </Button>
        </Card>
      </div>

      <div className="dash-grid">
        <Card heading="This week">
          <div className="week-strip">
            {week.map((d) => (
              <div
                key={d.date}
                className={`week-cell ${d.status === 'PRESENT' ? 'week-cell--present' : d.status === 'LEAVE' ? 'week-cell--leave' : ''}`}
              >
                <span className="week-cell__day">{d.day}</span>
                <span className="week-cell__date">{d.date}</span>
                <span className="week-cell__status">
                  {d.status === 'PRESENT' ? '9:02' : d.status === 'HALF_DAY' ? 'half' : d.status === 'LEAVE' ? 'leave' : '—'}
                </span>
              </div>
            ))}
          </div>
          <p className="dash-sub" style={{ marginTop: 16, marginBottom: 8 }}>August 17 – 21 · 3 present · 1 half-day · 1 leave</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge tone="success">present ×3</Badge>
            <Badge>half-day</Badge>
            <Badge tone="error">leave</Badge>
          </div>
        </Card>
        <Card heading="Recent activity">
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
    </AppLayout>
  );
}
