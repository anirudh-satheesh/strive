import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { UserService } from '../services/userService';
import type { Achievement } from '../services/userService';
import { Trophy, Flame, Medal, Sparkles, Clock, Star } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const AchievementsHistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) return;
      try {
        const profile = await UserService.getProfile(auth.currentUser.uid);
        setAchievements(profile?.achievements?.slice().reverse() || []); // newest first
      } catch (e) {
        console.error(e);
        showToast('Failed to load achievements', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 shadow-lg shadow-cyan-500/20" />
      </div>
    );
  }

  const tierOrder: Record<string, number> = {
    gold: 4,
    orange: 3,
    purple: 2,
    blue: 1,
  };

  const iconToTier: Record<string, string> = {
    Trophy: 'gold',
    Flame: 'orange',
    Medal: 'purple',
    Sparkles: 'blue',
    Clock: 'blue',
    Star: 'blue',
  };

  const sorted = [...achievements].sort((a, b) => {
    const tierA = tierOrder[iconToTier[a.icon] ?? 'blue'];
    const tierB = tierOrder[iconToTier[b.icon] ?? 'blue'];
    if (tierA !== tierB) return tierB - tierA;
    const timeA = new Date(a.unlockedAt || 0).getTime();
    const timeB = new Date(b.unlockedAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="space-y-5 pb-24 animate-[fade-in_0.4s_ease-out]">
      <header className="flex items-center justify-between p-4 bg-[#1A2236] rounded-3xl shadow-xl border border-white/5">
        <button onClick={onBack} className="text-white hover:text-cyan-400 transition-colors">
          ← Back
        </button>
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Achievements</h2>
        <span className="text-sm font-black text-cyan-400 uppercase">
          {achievements.length} Unlocked
        </span>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sorted.map((ach) => (
          <div key={ach.id} className="p-4 bg-[#131B2E]/50 border border-white/5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              {React.createElement({
                Trophy,
                Flame,
                Medal,
                Sparkles,
                Clock,
                Star,
              }[ach.icon] || Trophy, { size: 20, className: 'text-white' })}
              <h3 className="text-white font-black text-sm uppercase">{ach.title}</h3>
            </div>
            <p className="text-xs text-zinc-400">Unlocked {new Date(ach.unlockedAt || '').toLocaleDateString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
