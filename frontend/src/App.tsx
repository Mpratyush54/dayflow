import { useState } from 'react';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Profile from './pages/employee/Profile';

// Sign-in/sign-up are owned by the auth workstream. Until that lands, a dev
// link under the auth pages opens the employee profile using a dev token
// (see src/utils/devUser.ts).
export default function App() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return <Profile />;
  }

  return (
    <>
      {mode === 'signin'
        ? <SignIn onSwitch={() => setMode('signup')} />
        : <SignUp onSwitch={() => setMode('signin')} />}
      <p className="dev-bypass">
        Employee profile (auth pending) —{' '}
        <button type="button" className="dev-bypass__link" onClick={() => setShowProfile(true)}>
          open profile
        </button>
      </p>
    </>
  );
}
