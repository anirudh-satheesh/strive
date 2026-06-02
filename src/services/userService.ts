import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    type: 'pr' | 'milestone' | 'first';
    unlockedAt: string;
    icon: string;
}

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;

    achievements?: Achievement[];

    // Phase 2 — Attribute progression persistence
    attributeProgress?: {
        strength?: { xp?: number; level?: number; tier?: number };
        consistency?: { xp?: number; level?: number; tier?: number };
        mobility?: { xp?: number; level?: number; tier?: number };
        endurance?: { xp?: number; level?: number; tier?: number };
        skill?: { xp?: number; level?: number; tier?: number };
        recovery?: { xp?: number; level?: number; tier?: number };
    };

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
    },

    async getAttributeProgress(userId: string): Promise<UserProfile['attributeProgress'] | null> {
        const userRef = doc(db, `users/${userId}`);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return null;
        const data = snap.data() as UserProfile;
        return data.attributeProgress ?? null;
    },

    async updateAttributeProgress(
        userId: string,
        attributeProgress: NonNullable<UserProfile['attributeProgress']>
    ): Promise<void> {
        await setDoc(doc(db, `users/${userId}`), { attributeProgress }, { merge: true });
    }
};

