import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LoginInput, type RegisterInput, type AuthResponse } from "@shared/routes";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => void;
  register: (data: RegisterInput) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  // Fetch current user if token exists
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await fetch(api.auth.me.path, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout(); // Token expired or invalid
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch user");
        return await res.json() as User;
      } catch (e) {
        logout();
        return null;
      }
    },
    enabled: !!token,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid credentials");
        throw new Error("Login failed");
      }
      return await res.json() as AuthResponse;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      // Clean up optional fields before sending
      const payload = { ...data };
      if (payload.role !== 'doctor') {
        delete payload.specialization;
      }

      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return await res.json() as AuthResponse;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Account created", description: "Welcome to HealthMate!" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear();
    setLocation("/");
    toast({ title: "Logged out", description: "See you next time!" });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isLoadingUser,
        login: loginMutation.mutate,
        register: registerMutation.mutate,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper to get headers for other hooks
export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
