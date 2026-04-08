import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    restTimerEnabled?: boolean;
    defaultRestTime?: number;
    createdAt?: any;
    
    // Basic metrics
    height?: number;
    weight?: number;
    age?: number;
    gender?: 'male' | 'female';
    goal?: 'Lose weight' | 'Maintain' | 'Gain muscle';
    
    // Advanced metrics
    waist?: number;
    neck?: number;
    hips?: number; // Optional for females, required for US Navy method
    
    // Calculated stats
    bmi?: number;
    bodyFatPercentage?: number;
}

export const UserService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const userRef = doc(db, `users/${userId}`);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data() as UserProfile;
        }
        return null;
    },

    async createUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const userRef = doc(db, `users/${userId}`);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await setDoc(userRef, {
                ...data,
                uid: userId,
                createdAt: serverTimestamp()
            });
        } else {
            await setDoc(userRef, data, { merge: true });
        }
    },

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const userRef = doc(db, `users/${userId}`);
        await setDoc(userRef, data, { merge: true });
    }
};
