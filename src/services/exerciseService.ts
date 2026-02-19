import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PREDEFINED_EXERCISES } from '../data/exercises';
import type { Exercise } from '../types';

export const ExerciseService = {
    async getPredefinedExercises(): Promise<Exercise[]> {
        return PREDEFINED_EXERCISES;
    },

    async getCustomExercises(userId: string): Promise<Exercise[]> {
        try {
            const exercisesRef = collection(db, `users/${userId}/exercises`);
            const snapshot = await getDocs(exercisesRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isCustom: true
            })) as Exercise[];
        } catch (error) {
            console.error('Error getting custom exercises:', error);
            return [];
        }
    },

    async getAllExercises(userId: string): Promise<Exercise[]> {
        try {
            const [predefined, custom] = await Promise.all([
                this.getPredefinedExercises(),
                this.getCustomExercises(userId)
            ]);
            return [...predefined, ...custom];
        } catch (error) {
            console.error('Error getting all exercises:', error);
            return PREDEFINED_EXERCISES;
        }
    },

    async addCustomExercise(userId: string, exercise: Omit<Exercise, 'id'>): Promise<string> {
        try {
            const exercisesRef = collection(db, `users/${userId}/exercises`);
            const docRef = await addDoc(exercisesRef, {
                ...exercise,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding custom exercise:', error);
            throw error;
        }
    },

    async deleteCustomExercise(userId: string, exerciseId: string): Promise<void> {
        try {
            const exerciseRef = doc(db, `users/${userId}/exercises/${exerciseId}`);
            await deleteDoc(exerciseRef);
        } catch (error) {
            console.error('Error deleting custom exercise:', error);
            throw error;
        }
    }
};
