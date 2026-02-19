import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PREDEFINED_EXERCISES } from '../data/exercises';
import type { Exercise } from '../types';

export const ExerciseService = {
    async getPredefinedExercises(): Promise<Exercise[]> { // This will now be an error as Exercise is not imported
        return PREDEFINED_EXERCISES;
    },

    async getCustomExercises(userId: string): Promise<Exercise[]> {
        const exercisesRef = collection(db, `users/${userId}/exercises`);
        const snapshot = await getDocs(exercisesRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isCustom: true
        })) as Exercise[];
    },

    async getAllExercises(userId: string): Promise<Exercise[]> {
        const [predefined, custom] = await Promise.all([
            this.getPredefinedExercises(),
            this.getCustomExercises(userId)
        ]);
        return [...predefined, ...custom];
    },

    async addCustomExercise(userId: string, exercise: Omit<Exercise, 'id'>): Promise<string> {
        const exercisesRef = collection(db, `users/${userId}/exercises`);
        const docRef = await addDoc(exercisesRef, {
            ...exercise,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    },

    async deleteCustomExercise(userId: string, exerciseId: string): Promise<void> {
        const exerciseRef = doc(db, `users/${userId}/exercises/${exerciseId}`);
        await deleteDoc(exerciseRef);
    }
};
