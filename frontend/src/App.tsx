import { useState } from 'react';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';

export default function App() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return mode === 'signin'
    ? <SignIn onSwitch={() => setMode('signup')} />
    : <SignUp onSwitch={() => setMode('signin')} />;
}
