import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export const AuthService = {
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    },

    async login(email: string, pass: string) {
        return signInWithEmailAndPassword(auth, email, pass);
    },

    async signup(email: string, pass: string) {
        return createUserWithEmailAndPassword(auth, email, pass);
    },

    async loginWithGoogle() {
        return signInWithPopup(auth, googleProvider);
    },

    async logout() {
        return signOut(auth);
    }
};
