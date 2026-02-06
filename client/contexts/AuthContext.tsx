import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, queryClient } from "@/lib/query-client";

type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "participant" | "verifier";
  bio?: string | null;
  profileImage?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, requiredRole?: string) => Promise<User>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      // SIMPLIFIED: No longer checking or using 'token' from storage.

      if (storedUser) {
        console.log(`[Auth Check] Found User in storage: ${storedUser.substring(0, 50)}...`);

        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsLoading(false);

        // Verify session in background (using Cookies)
        try {
          const res = await apiRequest("GET", "/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            await AsyncStorage.setItem("user", JSON.stringify(data));
          } else {
            console.log("[Auth Check] Session invalid on server (Cookie expired or server restarted).");
            // Optional: Force logout if server session is gone, or just let them stay logged in "offline" style until an action fails.
            // For simplicity, we'll keep them logged in optimistically unless they get a 401 on an action.
          }
        } catch (error: any) {
          console.log("Background session check failed:", error.message);
        }
      } else {
        console.log("[Auth Check] No user found in storage.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string, requiredRole?: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();

    if (requiredRole && data.user.role !== requiredRole) {
      throw new Error(`Access Denied. You are a ${data.user.role}, please login from the ${data.user.role} tab.`);
    }

    // SIMPLIFIED: Only persist User. Session/Cookie is handled by the network layer.
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    // No token saving.

    queryClient.clear();
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: string) => {
    const response = await apiRequest("POST", "/api/auth/signup", { email, password, name, role });
    const data = await response.json();

    // SIMPLIFIED: Only persist User.
    await AsyncStorage.setItem("user", JSON.stringify(data.user));

    queryClient.clear();
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    // 1. Instant UI cleanup
    setUser(null);
    queryClient.clear();

    // 2. Clear Storage immediately (synchronous-like speed)
    await AsyncStorage.multiRemove(["user", "token"]);

    // 3. Background API cleanup (don't wait for this to navigate)
    apiRequest("POST", "/api/auth/logout", {}).catch(() => { });

    console.log("[Auth] Logout complete (Optimistic)");
  }, []);


  const updateUser = useCallback(async (updatedUser: User) => {
    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      setUser(data);
      await AsyncStorage.setItem("user", JSON.stringify(data));
    } catch (error: any) {
      // Gracefully handle session expiry during refresh
      if (error.message && error.message.includes("401")) {
        console.log("Session check 401 - Keeping local user state active (Zombie Mode).");
        // FIX: Do NOT log out here. Just let the cached user stay.
        // If the user tries a write action, that will fail and handle logout if needed.
        // setUser(null); 
        // await AsyncStorage.removeItem("user");
        // await AsyncStorage.removeItem("token");
        // queryClient.clear();
      } else {
        console.error("Failed to refresh user:", error);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
