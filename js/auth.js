// js/auth.js
class AuthManager {
    constructor() {
        this.initAuthStateListener();
    }

    initAuthStateListener() {
        auth.onAuthStateChanged(async (user) => {
            window.currentUser = user;
            
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data() || {};
                window.currentUserRole = userData.role || 'user';
                
                this.redirectBasedOnRole();
            } else {
                window.currentUserRole = null;
            }
        });
    }

    redirectBasedOnRole() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('admin') && window.currentUserRole !== 'admin') {
            window.location.href = '../dashboard.html';
        }
    }

    async register(email, password, displayName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: email,
                displayName: displayName,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            await db.collection('users').doc(userCredential.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async forgotPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        await auth.signOut();
        window.location.href = '../index.html';
    }

    isAdmin() {
        return window.currentUserRole === 'admin';
    }
}

window.authManager = new AuthManager();
