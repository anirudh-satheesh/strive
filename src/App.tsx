import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { AuthService } from './services/authService';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { WorkoutLog } from './components/WorkoutLog';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { ProfileView } from './components/ProfileView';
import { CalendarView } from './components/CalendarView';
import { NotificationProvider } from './context/NotificationContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('workout');
  const [workoutDate, setWorkoutDate] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setActivePage('workout');
    }
  };

  const handleNavigateToWorkout = (date: string) => {
    setWorkoutDate(date);
    setActivePage('workout');
  };

  // Clear workoutDate when navigating away from workout page
  useEffect(() => {
    if (activePage !== 'workout') {
      setWorkoutDate(null);
    }
  }, [activePage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <NotificationProvider>
      <Layout
        activePage={activePage}
        setActivePage={setActivePage}
      >
        {activePage === 'workout' && <WorkoutLog initialDate={workoutDate} />}
        {activePage === 'exercises' && <ExerciseLibrary />}
        {activePage === 'calendar' && <CalendarView onNavigateToWorkout={handleNavigateToWorkout} />}
        {activePage === 'profile' && <ProfileView onLogout={handleLogout} />}
      </Layout>
    </NotificationProvider>
  );
};

export default App;
