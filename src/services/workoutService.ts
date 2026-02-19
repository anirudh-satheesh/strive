import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Workout } from '../types';

export const WorkoutService = {
    async getWorkoutForDate(userId: string, date: string): Promise<Workout | null> {
        const workoutRef = doc(db, `users/${userId}/workouts/${date}`);
        const snap = await getDoc(workoutRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Workout;
        }
        return null;
    },

    async saveWorkout(userId: string, workout: Workout): Promise<void> {
        const workoutRef = doc(db, `users/${userId}/workouts/${workout.date}`);
        await setDoc(workoutRef, workout);
    },

    async getAllWorkouts(userId: string): Promise<Workout[]> {
        const workoutsRef = collection(db, `users/${userId}/workouts`);
        const q = query(workoutsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workout[];
    },

    async deleteWorkout(userId: string, date: string): Promise<void> {
        const workoutRef = doc(db, `users/${userId}/workouts/${date}`);
        await deleteDoc(workoutRef);
    }
};
