import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';

import { AuthService } from './services/authService';
import { Auth } from './components/Auth';
import { BrandedLoader } from './components/BrandedLoader';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { WorkoutLog } from './components/WorkoutLog';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { ProfileView } from './components/ProfileView';
import { AchievementsHistoryView } from './components/AchievementsHistoryView';
import { OnboardingModal } from './components/OnboardingModal';
import { UserService } from './services/userService';
import { NotificationProvider } from './context/NotificationContext';
import { AchievementProvider } from './context/AchievementContext';

export type Page = 'home' | 'workout' | 'calendar' | 'analytics' | 'profile' | 'achievements';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('home');
  const [workoutDate, setWorkoutDate] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const profile = await UserService.getProfile(u.uid);
          if (!profile || !profile.displayName) {
            setShowOnboarding(true);
          } else {
            setShowOnboarding(false);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
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
      setWorkoutDate(null);
      setActivePage('home');
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
    return <BrandedLoader text="Loading" />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <AchievementProvider>
      <NotificationProvider>
        <Layout
          activePage={activePage}
          setActivePage={setActivePage}
          user={user}
        >
          {activePage === 'home' && (
            <HomePage
              user={user}
              setActivePage={setActivePage}
              onNavigateToWorkout={handleNavigateToWorkout}
            />
          )}

          {activePage === 'workout' && <WorkoutLog initialDate={workoutDate} />}
          {activePage === 'calendar' && <CalendarView onNavigateToWorkout={handleNavigateToWorkout} />}
          {activePage === 'analytics' && <AnalyticsView />}
          {activePage === 'profile' && <ProfileView onLogout={handleLogout} setActivePage={setActivePage} />}
          {activePage === 'achievements' && <AchievementsHistoryView onBack={() => setActivePage('profile')} />}
        </Layout>
        {showOnboarding && user && (
          <OnboardingModal
            userId={user.uid}
            email={user.email}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </NotificationProvider>
    </AchievementProvider>
  );
};

export default App;
