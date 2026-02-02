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
  login: (email: string, password: string) => Promise<void>;
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
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Verify session validity with server
        try {
          await apiRequest("GET", "/api/auth/me");
        } catch (error: any) {
          // If session is invalid/expired (401), force logout to prevent stuck state
          if (error.message && error.message.includes("401")) {
            console.log("Session expired, logging out...");
            // We verify session failed, so we strictly clear local state
            setUser(null);
            await AsyncStorage.removeItem("user");
            queryClient.clear();
          }
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    queryClient.clear();
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: string) => {
    const response = await apiRequest("POST", "/api/auth/signup", { email, password, name, role });
    const data = await response.json();
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    queryClient.clear();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (error) {
      console.error("Logout API call failed:", error);
    }
    setUser(null);
    await AsyncStorage.removeItem("user");
    queryClient.clear();
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
    } catch (error) {
      console.error("Failed to refresh user:", error);
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
