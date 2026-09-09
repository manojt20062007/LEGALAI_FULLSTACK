"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user_data");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_data");
        localStorage.removeItem("user_role");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Route guarding
    if (!isLoading) {
      const isPublicPath = pathname === "/login";
      if (!token && !isPublicPath) {
        router.push("/login");
      } else if (token && isPublicPath) {
        router.push("/dashboard");
      }
    }
  }, [token, isLoading, pathname, router]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user_data", JSON.stringify(userData));
    localStorage.setItem("user_role", userData.role);
    setToken(newToken);
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("user_role");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {/* Hide content while determining auth state, except on login page to avoid flash */}
      {isLoading && pathname !== "/login" ? null : children}
    </AuthContext.Provider>
  );
}
