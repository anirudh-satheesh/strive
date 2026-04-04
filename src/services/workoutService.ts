import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Workout, WorkoutTemplate } from '../types';

const normalizeWorkout = (workout: Workout): Workout => {
    return {
        ...workout,
        exercises: workout.exercises?.map(ex => {
            if (!Array.isArray(ex.sets)) {
                const numSets = Number(ex.sets) || 1;
                const legacySets = [];
                for(let i=0; i<numSets; i++) {
                    legacySets.push({
                        id: crypto.randomUUID(),
                        weight: Number(ex.weight) || 0,
                        reps: Number(ex.reps) || 0,
                        duration: Number(ex.duration) || 0,
                        distance: Number(ex.distance) || 0,
                        completed: true
                    });
                }
                return { ...ex, sets: legacySets };
            }
            return ex;
        }) || []
    };
};

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
        await setDoc(workoutRef, workout);
    },

    async getAllWorkouts(userId: string): Promise<Workout[]> {
        const workoutsRef = collection(db, `users/${userId}/workouts`);
        const q = query(workoutsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => normalizeWorkout({ id: doc.id, ...doc.data() } as Workout));
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
