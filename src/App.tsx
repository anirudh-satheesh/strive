import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { AuthService } from './services/authService';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { WorkoutLog } from './components/WorkoutLog';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { ProfileView } from './components/ProfileView';
import { CalendarView } from './components/CalendarView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('workout');

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setActivePage('workout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      onLogout={handleLogout}
    >
      {activePage === 'workout' && <WorkoutLog />}
      {activePage === 'exercises' && <ExerciseLibrary />}
      {activePage === 'calendar' && <CalendarView />}
      {activePage === 'profile' && <ProfileView onLogout={handleLogout} />}
    </Layout>
  );
};

export default App;
