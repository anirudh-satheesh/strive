import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeWorkout } from './normalizeWorkout';
import { runMigration } from './migrationService';
import { getMigrationStats, logMigrationProgress } from './migrationStats';
import type { Workout, WorkoutTemplate } from '../types';

export const WorkoutService = {
    async getWorkoutForDate(userId: string, date: string): Promise<Workout | null> {
        const workoutRef = doc(db, `users/${userId}/workouts/${date}`);
        const snap = await getDoc(workoutRef);
        if (snap.exists()) {
            return normalizeWorkout({ id: snap.id, ...snap.data() } as Workout);
        }
        return null;
    },

    async saveWorkout(userId: string, workout: Workout): Promise<void> {
        const workoutRef = doc(db, `users/${userId}/workouts/${workout.date}`);
        // Stamp with version 2 so this document never needs migration
        await setDoc(workoutRef, { ...workout, version: 2 });
    },

    async getAllWorkouts(userId: string): Promise<Workout[]> {
        const workoutsRef = collection(db, `users/${userId}/workouts`);
        const q = query(workoutsRef, orderBy('date', 'asc'));
        const snapshot = await getDocs(q);

        // --- Background migration (fire-and-forget) ---
        const stats = getMigrationStats(snapshot.docs);
        logMigrationProgress(stats);

        if (!stats.complete) {
            // Non-blocking: migrate oldest-first without awaiting
            runMigration(snapshot.docs);
        }

        // --- Return normalized data for UI (newest first) ---
        return snapshot.docs
            .map(d => normalizeWorkout({ id: d.id, ...d.data() } as Workout))
            .reverse();
    },

    async deleteWorkout(userId: string, date: string): Promise<void> {
        const workoutRef = doc(db, `users/${userId}/workouts/${date}`);
        await deleteDoc(workoutRef);
    },

    async saveTemplate(userId: string, name: string, exercises: Workout['exercises']): Promise<void> {
        const templatesRef = collection(db, `users/${userId}/templates`);
        await addDoc(templatesRef, {
            name,
            exercises,
            createdAt: new Date().toISOString()
        });
    },

    async getTemplates(userId: string): Promise<WorkoutTemplate[]> {
        const templatesRef = collection(db, `users/${userId}/templates`);
        const q = query(templatesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkoutTemplate[];
    },

    async deleteTemplate(userId: string, templateId: string): Promise<void> {
        const templateRef = doc(db, `users/${userId}/templates/${templateId}`);
        await deleteDoc(templateRef);
    }
};
