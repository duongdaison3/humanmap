/**
 * Data Service Abstraction Layer (Phase 3: Firebase Data & Persistence)
 * 
 * Provides unified persistence with dual-mode capability:
 * - Real Mode: Uses Firebase Auth & Firestore collections (users, helpRequests, matches, interactions, stories)
 * - Demo Mode: Seamless localStorage persistence with mock fallback when Firebase is unprovisioned
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';

import { 
  NeedRequest, 
  Story, 
  UserProfile, 
  HelpSession, 
  SessionStatus,
  MeetingPoint,
  ConsentState,
  PrivacyState,
  MatchRecord, 
  InteractionRecord, 
  RequestStatus 
} from '../types';

import {
  initializeHelpSession,
  proposeMeetingPoint,
  applyParticipantConsent,
  transitionHelpSession,
  derivePrivacyState,
  isValidTransition
} from './sessionStateMachine';

const DEFAULT_GUEST_USER: UserProfile = {
  id: 'guest_user',
  name: 'Người dùng Khách',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'Thành viên mới gia nhập cộng đồng Human Map.',
  role: 'Thành viên mới',
  locationName: 'Hà Nội',
  totalHelpedCount: 0,
  totalReceivedCount: 0,
  savedStoryIds: [],
  isHelperAvailable: true,
  reliabilityScore: 1.0,
  skills: ['Chỉ đường', 'Thông tin địa phương'],
  privacySettings: {
    anonymousByDefault: false,
    shareApproxLocationOnly: true,
  },
};

const STORAGE_KEYS = {
  NEEDS: 'humanmap_needs_v3',
  STORIES: 'humanmap_stories_v3',
  USER: 'humanmap_current_user_v3',
  ACTIVE_SESSION: 'humanmap_active_session_v3',
  MATCHES: 'humanmap_matches_v3',
  INTERACTIONS: 'humanmap_interactions_v3',
};

import firebaseAppletConfig from '../../firebase-applet-config.json';

let db: Firestore | null = null;
let auth: Auth | null = null;
let isFirebaseConfigured = false;

// Attempt Firebase Client Config initialization
try {
  const metaEnv = (import.meta as any).env || {};
  const firebaseConfig = {
    apiKey: firebaseAppletConfig.apiKey || metaEnv.VITE_FIREBASE_API_KEY || (window as any).__FIREBASE_CONFIG__?.apiKey,
    authDomain: firebaseAppletConfig.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (window as any).__FIREBASE_CONFIG__?.authDomain,
    projectId: firebaseAppletConfig.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || (window as any).__FIREBASE_CONFIG__?.projectId,
    storageBucket: firebaseAppletConfig.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (window as any).__FIREBASE_CONFIG__?.storageBucket,
    messagingSenderId: firebaseAppletConfig.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (window as any).__FIREBASE_CONFIG__?.messagingSenderId,
    appId: firebaseAppletConfig.appId || metaEnv.VITE_FIREBASE_APP_ID || (window as any).__FIREBASE_CONFIG__?.appId,
    firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId,
  };

  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);
    auth = getAuth(app);
    isFirebaseConfigured = true;
    console.log('Firebase Firestore and Auth initialized successfully.');
  }
} catch (err) {
  console.warn('Firebase initialization skipped, running in Demo Mode with persistent local storage:', err);
}

export const dataService = {
  /**
   * Alias for initializeLocalSeed for backwards compatibility
   */
  async initializeData(): Promise<void> {
    await this.initializeLocalSeed();
  },

  getSystemMode(): { isRealFirebase: boolean; modeLabel: string } {
    return {
      isRealFirebase: isFirebaseConfigured && !!db,
      modeLabel: isFirebaseConfigured ? 'Firebase Firestore Live' : 'Bản đồ Nhân ái Live',
    };
  },

  /**
   * Initializes local fallback storage if empty
   */
  async initializeLocalSeed(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    ['humanmap_needs', 'humanmap_needs_v2', 'humanmap_stories', 'humanmap_stories_v2', 'humanmap_user', 'humanmap_current_user_v2'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        // ignore
      }
    });

    if (!localStorage.getItem(STORAGE_KEYS.NEEDS)) {
      localStorage.setItem(STORAGE_KEYS.NEEDS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STORIES)) {
      localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_GUEST_USER));
    }
  },

  // --- AUTHENTICATION ---
  formatAuthError(error: any): string {
    const code = error?.code || '';
    switch (code) {
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập này chưa được bật trong Firebase Console (Authentication > Sign-in method). Bạn có thể tiếp tục bằng Chế độ Demo / Khách để trải nghiệm ngay.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email hoặc mật khẩu không chính xác.';
      case 'auth/email-already-in-use':
        return 'Địa chỉ email này đã được sử dụng cho một tài khoản khác.';
      case 'auth/weak-password':
        return 'Mật khẩu quá yếu. Vui lòng đặt mật khẩu từ 6 ký tự trở lên.';
      case 'auth/invalid-email':
        return 'Địa chỉ email không hợp lệ.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet của bạn.';
      case 'auth/popup-closed-by-user':
        return 'Bạn đã đóng cửa sổ đăng nhập Google.';
      case 'auth/too-many-requests':
        return 'Quá nhiều lần thử không thành công. Vui lòng thử lại sau ít phút.';
      default:
        return error?.message || 'Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.';
    }
  },

  subscribeToAuth(callback: (user: User | null) => void): () => void {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  },

  getCurrentFirebaseUser(): User | null {
    return isFirebaseConfigured && auth ? auth.currentUser : null;
  },

  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        return await auth.currentUser.getIdToken(forceRefresh);
      } catch (err) {
        console.warn('Error fetching Firebase ID token:', err);
        return null;
      }
    }
    return null;
  },

  async getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          return docSnap.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Error fetching user profile from Firestore:', err);
      }
    }
    return null;
  },

  async getCurrentUser(): Promise<UserProfile> {
    if (isFirebaseConfigured && auth?.currentUser) {
      const fbUser = auth.currentUser;
      const remoteProfile = await this.getUserProfileFromFirestore(fbUser.uid);
      if (remoteProfile) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(remoteProfile));
        return remoteProfile;
      }
    }

    await this.initializeLocalSeed();
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : DEFAULT_GUEST_USER;
  },

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Hệ thống Firebase Authentication chưa được cấu hình.');
    }

    const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = res.user;

    // Update Firebase auth profile
    if (displayName) {
      await updateProfile(fbUser, { displayName });
    }

    // Send verification email
    try {
      await sendEmailVerification(fbUser);
    } catch (e) {
      console.warn('Failed to send verification email:', e);
    }

    const defaultAvatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`;

    const userProfile: UserProfile = {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: displayName.trim() || 'Thành viên mới',
      email: email.trim(),
      avatar: fbUser.photoURL || defaultAvatar,
      bio: 'Thành viên cộng đồng Bản đồ Nhân ái.',
      role: 'Thành viên xác thực',
      locationName: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
      totalHelpedCount: 0,
      totalReceivedCount: 0,
      savedStoryIds: [],
      isHelperAvailable: true,
      reliabilityScore: 1.0,
      skills: ['Chỉ đường', 'Thông tin địa phương', 'Giao tiếp tốt'],
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      onboardingCompleted: true,
      privacySettings: {
        anonymousByDefault: false,
        shareApproxLocationOnly: true,
      },
    };

    if (db) {
      await setDoc(doc(db, 'users', userProfile.id), userProfile, { merge: true });
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userProfile));
    return userProfile;
  },

  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Hệ thống Firebase Authentication chưa được cấu hình.');
    }

    const res = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = res.user;

    let userProfile = await this.getUserProfileFromFirestore(fbUser.uid);

    if (!userProfile) {
      userProfile = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || 'Thành viên mới',
        email: fbUser.email || email.trim(),
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'Thành viên cộng đồng Bản đồ Nhân ái.',
        role: 'Thành viên Email Authenticated',
        locationName: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
        totalHelpedCount: 0,
        totalReceivedCount: 0,
        savedStoryIds: [],
        isHelperAvailable: true,
        reliabilityScore: 0.95,
        skills: ['Chỉ đường', 'Thông tin địa phương', 'Giao tiếp tốt'],
        authProvider: 'password',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        onboardingCompleted: true,
        privacySettings: {
          anonymousByDefault: false,
          shareApproxLocationOnly: true,
        },
      };

      if (db) {
        await setDoc(doc(db, 'users', fbUser.uid), userProfile, { merge: true });
      }
    } else {
      // Update lastActiveAt
      userProfile.lastActiveAt = new Date().toISOString();
      if (db) {
        await updateDoc(doc(db, 'users', fbUser.uid), { lastActiveAt: userProfile.lastActiveAt });
      }
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userProfile));
    return userProfile;
  },

  async signInWithGoogle(): Promise<UserProfile> {
    if (isFirebaseConfigured && auth) {
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        const fbUser = res.user;

        let userProfile = await this.getUserProfileFromFirestore(fbUser.uid);
        
        if (!userProfile) {
          userProfile = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Thành viên mới',
            email: fbUser.email || '',
            avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            bio: 'Thành viên cộng đồng Bản đồ Nhân ái.',
            role: 'Thành viên Google Authenticated',
            locationName: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
            totalHelpedCount: 0,
            totalReceivedCount: 0,
            savedStoryIds: [],
            isHelperAvailable: true,
            reliabilityScore: 0.95,
            skills: ['Chỉ đường', 'Thông tin địa phương', 'Giao tiếp tốt'],
            authProvider: 'google',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            onboardingCompleted: true,
            privacySettings: {
              anonymousByDefault: false,
              shareApproxLocationOnly: true,
            },
          };

          if (db) {
            await setDoc(doc(db, 'users', userProfile.id), userProfile, { merge: true });
          }
        } else {
          userProfile.lastActiveAt = new Date().toISOString();
          if (db) {
            await updateDoc(doc(db, 'users', userProfile.id), { lastActiveAt: userProfile.lastActiveAt });
          }
        }

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userProfile));
        return userProfile;
      } catch (err: any) {
        console.warn('Google Auth popup closed or not configured:', err);
        throw err;
      }
    }

    const current = await this.getCurrentUser();
    return current;
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Hệ thống Firebase Authentication chưa được cấu hình.');
    }
    await sendPasswordResetEmail(auth, email.trim());
  },

  async sendVerificationEmail(): Promise<void> {
    if (isFirebaseConfigured && auth?.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  },

  async signInAsDemoUser(user: UserProfile): Promise<UserProfile> {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    // Switch to guest/default profile
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_GUEST_USER));
  },

  // --- HELP REQUESTS ---
  async getNeedRequests(): Promise<NeedRequest[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const list: NeedRequest[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as NeedRequest);
        });
        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Firestore fetch failed, using local storage fallback:', err);
      }
    }

    await this.initializeLocalSeed();
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.NEEDS) : null;
    return raw ? JSON.parse(raw) : [];
  },

  subscribeToHelpRequests(callback: (needs: NeedRequest[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: NeedRequest[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as NeedRequest);
          });
          callback(list);
        }, (err) => {
          console.warn('Realtime listener error:', err);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Failed to attach Firebase realtime listener:', err);
      }
    }

    // Local storage interval listener
    if (typeof localStorage === 'undefined') return () => {};

    let previous = localStorage.getItem(STORAGE_KEYS.NEEDS);
    const interval = setInterval(() => {
      const current = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.NEEDS) : null;
      if (current !== previous) {
        previous = current;
        callback(current ? JSON.parse(current) : []);
      }
    }, 1500);

    return () => clearInterval(interval);
  },

  async createNeedRequest(requestData: Omit<NeedRequest, 'id' | 'createdAt' | 'status'>): Promise<NeedRequest> {
    const user = await this.getCurrentUser();
    const newNeed: NeedRequest = {
      ...requestData,
      id: `need_${Date.now()}`,
      requesterId: user.id,
      createdAt: 'Vừa xong',
      status: 'open',
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'helpRequests', newNeed.id), newNeed);
      } catch (err) {
        console.warn('Firestore create request failed, persisting locally:', err);
      }
    }

    const needs = await this.getNeedRequests();
    const updated = [newNeed, ...needs];
    localStorage.setItem(STORAGE_KEYS.NEEDS, JSON.stringify(updated));
    return newNeed;
  },

  async updateNeedStatus(id: string, status: RequestStatus): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const reqRef = doc(db, 'helpRequests', id);
        await updateDoc(reqRef, { status });
      } catch (err) {
        console.warn('Firestore update status failed:', err);
      }
    }

    const needs = await this.getNeedRequests();
    const updated = needs.map((n) => (n.id === id ? { ...n, status } : n));
    localStorage.setItem(STORAGE_KEYS.NEEDS, JSON.stringify(updated));
  },

  // --- MATCHES ---
  async createMatch(helpRequestId: string, helperId: string, helperName: string, score: number): Promise<MatchRecord> {
    const matchRecord: MatchRecord = {
      id: `match_${Date.now()}`,
      helpRequestId,
      helperId,
      helperName,
      score,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'matches', matchRecord.id), matchRecord);
      } catch (e) {
        console.warn('Firestore match store warning:', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.MATCHES);
    const existing: MatchRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify([matchRecord, ...existing]));

    return matchRecord;
  },

  // --- INTERACTIONS ---
  async createInteraction(helpRequestId: string, requesterName: string, helperName: string): Promise<InteractionRecord> {
    const user = await this.getCurrentUser();
    const interaction: InteractionRecord = {
      id: `interaction_${Date.now()}`,
      helpRequestId,
      requesterName,
      helperId: user.id,
      helperName,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'in_progress',
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'interactions', interaction.id), interaction);
      } catch (e) {
        console.warn('Firestore interaction store warning:', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.INTERACTIONS);
    const existing: InteractionRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify([interaction, ...existing]));

    return interaction;
  },

  async updateInteractionStatus(id: string, status: 'in_progress' | 'completed' | 'cancelled'): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'interactions', id), {
          status,
          completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (e) {
        console.warn('Firestore update interaction status warning:', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.INTERACTIONS);
    const existing: InteractionRecord[] = raw ? JSON.parse(raw) : [];
    const updated = existing.map((i) =>
      i.id === id
        ? {
            ...i,
            status,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : i
    );
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(updated));
  },

  // --- STORIES ---
  async getStories(): Promise<Story[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const list: Story[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Story);
        });
        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Firestore stories fetch failed, using local fallback:', err);
      }
    }

    await this.initializeLocalSeed();
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.STORIES) : null;
    return raw ? JSON.parse(raw) : [];
  },

  async createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'likesCount'>): Promise<Story> {
    const currentUser = await this.getCurrentUser();
    const newStory: Story = {
      ...storyData,
      id: `story_${Date.now()}`,
      authorId: currentUser?.id,
      createdAt: 'Vừa xong',
      likesCount: 1,
      authorVisibility: storyData.isAnonymous ? 'anonymous' : 'public',
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'stories', newStory.id), newStory);
      } catch (err) {
        console.warn('Firestore story create failed, persisting locally:', err);
      }
    }

    const stories = await this.getStories();
    const updated = [newStory, ...stories];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(updated));
    }

    // Update user profile saved stories
    if (currentUser) {
      await this.updateUserProfile({
        ...currentUser,
        savedStoryIds: [...(currentUser.savedStoryIds || []), newStory.id],
      });
    }

    return newStory;
  },

  async likeStory(id: string): Promise<number> {
    const stories = await this.getStories();
    let newLikes = 0;

    const updated = stories.map((s) => {
      if (s.id === id) {
        newLikes = s.likesCount + 1;
        return { ...s, likesCount: newLikes };
      }
      return s;
    });

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'stories', id), { likesCount: newLikes });
      } catch (e) {
        console.warn('Firestore story like failed:', e);
      }
    }

    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(updated));
    return newLikes;
  },

  // --- USER PROFILE & HELP SESSIONS ---
  async updateUserProfile(profile: UserProfile): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        // Exclude system metrics from user-controlled profile updates to adhere to security rules
        const { reliabilityScore, totalHelpedCount, totalReceivedCount, role, email, ...editableProfile } = profile as any;
        
        await setDoc(doc(db, 'users', profile.id), editableProfile, { merge: true });

        // If exact lat/lng is present, store in protected privateLocations subcollection
        if (typeof profile.lat === 'number' && typeof profile.lng === 'number') {
          const privateLocRef = doc(db, 'users', profile.id, 'privateLocations', 'location');
          await setDoc(privateLocRef, {
            lat: profile.lat,
            lng: profile.lng,
            accuracy: profile.locationAccuracy || 10,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore user update warning:', e);
      }
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
  },

  async incrementUserHelpedCount(): Promise<number> {
    const user = await this.getCurrentUser();
    const updatedUser = {
      ...user,
      totalHelpedCount: user.totalHelpedCount + 1,
    };
    await this.updateUserProfile(updatedUser);
    return updatedUser.totalHelpedCount;
  },

  async getActiveSession(): Promise<HelpSession | null> {
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        const qReq = query(collection(db, 'helpSessions'), where('requesterId', '==', uid));
        const qHelp = query(collection(db, 'helpSessions'), where('helperId', '==', uid));
        const [snapReq, snapHelp] = await Promise.all([getDocs(qReq), getDocs(qHelp)]);
        
        const sessions: HelpSession[] = [];
        snapReq.forEach((d) => sessions.push(d.data() as HelpSession));
        snapHelp.forEach((d) => sessions.push(d.data() as HelpSession));

        const active = sessions.find((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
        if (active) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(active));
          return active;
        }
      } catch (e) {
        console.warn('Error fetching active session from Firestore:', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  },

  async setActiveSession(session: HelpSession | null): Promise<void> {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      if (isFirebaseConfigured && db && auth?.currentUser) {
        try {
          await setDoc(doc(db, 'helpSessions', session.id), session, { merge: true });
        } catch (e) {
          console.warn('Error syncing helpSession to Firestore:', e);
        }
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  },

  async getHelpSessionById(sessionId: string): Promise<HelpSession | null> {
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const snap = await getDoc(doc(db, 'helpSessions', sessionId));
        if (snap.exists()) {
          const data = snap.data() as HelpSession;
          // Verify user is participant
          if (data.requesterId === auth.currentUser.uid || data.helperId === auth.currentUser.uid) {
            return data;
          }
          return null; // Deny third-party read
        }
      } catch (e) {
        console.warn('Error reading helpSession from Firestore:', e);
      }
    }
    const active = await this.getActiveSession();
    if (active && active.id === sessionId) return active;
    return null;
  },

  async createHelpSession(params: {
    requestId: string;
    requesterId: string;
    helperId: string;
    needTitle?: string;
    requesterName?: string;
    helperName?: string;
    locationName?: string;
  }): Promise<HelpSession> {
    const authUser = auth?.currentUser;
    if (isFirebaseConfigured && !authUser) {
      throw new Error('GUEST_NOT_ALLOWED');
    }

    if (isFirebaseConfigured && authUser) {
      if (authUser.uid !== params.requesterId && authUser.uid !== params.helperId) {
        throw new Error('UNAUTHORIZED_PARTICIPANT');
      }
    }

    const session = initializeHelpSession(params);
    await this.setActiveSession(session);
    return session;
  },

  async proposeMeetingPointForSession(
    sessionId: string,
    meetingPointData: Omit<MeetingPoint, 'id' | 'createdAt'>
  ): Promise<HelpSession> {
    const session = await this.getHelpSessionById(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const authUser = auth?.currentUser;
    if (isFirebaseConfigured && authUser) {
      if (authUser.uid !== session.requesterId && authUser.uid !== session.helperId) {
        throw new Error('UNAUTHORIZED_PARTICIPANT');
      }
    }

    const meetingPoint: MeetingPoint = {
      ...meetingPointData,
      id: `mp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    const updated = proposeMeetingPoint(session, meetingPoint);
    await this.setActiveSession(updated);
    return updated;
  },

  async updateSessionConsent(
    sessionId: string,
    participantRole: 'requester' | 'helper',
    consentValue: 'ACCEPTED' | 'DECLINED'
  ): Promise<HelpSession> {
    const session = await this.getHelpSessionById(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const authUser = auth?.currentUser;
    if (isFirebaseConfigured && authUser) {
      const expectedUid = participantRole === 'requester' ? session.requesterId : session.helperId;
      if (authUser.uid !== expectedUid && authUser.uid !== session.requesterId && authUser.uid !== session.helperId) {
        throw new Error('UNAUTHORIZED_PARTICIPANT');
      }
    }

    const updated = applyParticipantConsent(session, participantRole, consentValue);
    await this.setActiveSession(updated);
    return updated;
  },

  async transitionSessionState(
    sessionId: string,
    targetStatus: SessionStatus,
    reason?: string
  ): Promise<HelpSession> {
    const session = await this.getHelpSessionById(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const authUser = auth?.currentUser;
    if (isFirebaseConfigured && authUser) {
      if (authUser.uid !== session.requesterId && authUser.uid !== session.helperId) {
        throw new Error('UNAUTHORIZED_PARTICIPANT');
      }
    }

    const updated = transitionHelpSession(session, targetStatus, reason);
    await this.setActiveSession(updated);
    return updated;
  },

  async resetToDefaultMockData(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.NEEDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_GUEST_USER));
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.MATCHES);
    localStorage.removeItem(STORAGE_KEYS.INTERACTIONS);
  },
};
