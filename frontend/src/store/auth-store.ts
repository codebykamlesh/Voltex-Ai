import { create } from "zustand";
import { onAuthChange, getIdToken, firebaseSignOut, type FirebaseUser } from "@/lib/firebase";
import { authApi } from "@/lib/api";

type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  provider: string;
};

type AuthState = {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  initialize: () => () => void;
  setUser: (user: UserProfile, firebaseUser: FirebaseUser) => void;
  demoLogin: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // If the user appears unverified, force a reload to get the latest status from the server
        if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === "password")) {
          try {
            await firebaseUser.reload();
          } catch (e) {
            console.warn("Failed to reload user data", e);
          }
        }

        // Block unverified email/password users from the app state
        if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === "password")) {
          set({ user: null, firebaseUser, isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          const token = await firebaseUser.getIdToken();
          const profile = await authApi.verify(token) as UserProfile;
          set({
            user: profile,
            firebaseUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          console.error("Auth verification failed:", err);
          set({ user: null, firebaseUser: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, firebaseUser: null, isAuthenticated: false, isLoading: false });
      }
    });
    return unsubscribe;
  },

  setUser: (user, firebaseUser) => {
    set({ user, firebaseUser, isAuthenticated: true, isLoading: false, error: null });
  },

  demoLogin: () => {
    set({
      user: {
        id: "demo-user-123",
        email: "demo@voltex.ai",
        display_name: "Demo User",
        avatar_url: null,
        provider: "demo"
      },
      firebaseUser: null,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },

  logout: async () => {
    try {
      await firebaseSignOut();
      set({ user: null, firebaseUser: null, isAuthenticated: false, error: null });
    } catch (err) {
      console.error("Logout error:", err);
    }
  },

  clearError: () => set({ error: null }),
}));
