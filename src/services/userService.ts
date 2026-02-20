import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    createdAt?: string;
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
        await setDoc(userRef, {
            ...data,
            uid: userId,
            createdAt: new Date().toISOString()
        }, { merge: true });
    },

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const userRef = doc(db, `users/${userId}`);
        await setDoc(userRef, data, { merge: true });
    }
};
