"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, apiEndpoints } from "@/lib/api/axios";
import { config } from "@/lib/config";
import { getRecaptchaToken } from "@/lib/recaptcha";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer" | string;
  rawRole?: string;
  systemRole?: string;
  tenantId?: string;
  workspaceId: string;
  workspaceName: string;
  permissions: string[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  register: (data: SignupData) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    token: string,
    password: string,
    confirmPassword?: string,
    email?: string,
  ) => Promise<void>;
  verifyOtp: (
    email: string,
    otp: string,
    type: "email_verification" | "password_reset" | "2fa",
  ) => Promise<void>;
  resendOtp: (
    email: string,
    type: "email_verification" | "password_reset" | "2fa",
  ) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  workspaceName: string;
  termsAccepted?: boolean;
}

export type RegisterData = SignupData;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistAccessToken(token: string) {
  localStorage.setItem(config.auth.tokenKey, token);
  localStorage.setItem("appnix_access_token", token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const isProdDomain = typeof window !== "undefined" && window.location.hostname.endsWith("appnix.co.in");
  const domainAttr = isProdDomain ? "; Domain=.appnix.co.in" : "";

  document.cookie = `appnix_access_token=${encodeURIComponent(token)}; Path=/; Max-Age=900; SameSite=Lax${domainAttr}${secure}`;
  document.cookie = `appnix_auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=900; SameSite=Lax${domainAttr}${secure}`;
}

function clearAccessToken() {
  localStorage.removeItem(config.auth.tokenKey);
  localStorage.removeItem("appnix_access_token");
  localStorage.removeItem("token");
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const isProdDomain = typeof window !== "undefined" && window.location.hostname.endsWith("appnix.co.in");
  const domainAttr = isProdDomain ? "; Domain=.appnix.co.in" : "";

  document.cookie = `appnix_access_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `appnix_auth_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  if (domainAttr) {
    document.cookie = `appnix_access_token=; Path=/; Max-Age=0; SameSite=Lax${domainAttr}${secure}`;
    document.cookie = `appnix_auth_token=; Path=/; Max-Age=0; SameSite=Lax${domainAttr}${secure}`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const clearError = () => setState((prev) => ({ ...prev, error: null }));

  const setAuth = (user: User | null) => {
    setState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
      error: null,
    });
  };

  const refreshUser = async () => {
    try {
      const response = await api.get(apiEndpoints.auth.me);
      const userData = response.data?.data || response.data;
      if (userData && userData.id) {
        setAuth(userData);
        localStorage.setItem(config.auth.userKey, JSON.stringify(userData));
        if (
          !localStorage.getItem("appnix_guest_impersonation") &&
          (localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem(config.auth.adminUserKey) ||
          localStorage.getItem("appnix_admin_token"))
        ) {
          localStorage.setItem(config.auth.adminUserKey, JSON.stringify(userData));
        }
      } else {
        setAuth(null);
      }
    } catch {
      setAuth(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const isGuest = typeof window !== "undefined" && !!localStorage.getItem("appnix_guest_impersonation");
      const token = isGuest
        ? localStorage.getItem(config.auth.tokenKey)
        : localStorage.getItem(config.auth.tokenKey) ||
          localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem("appnix_admin_token");
      const storedUser = isGuest
        ? localStorage.getItem(config.auth.userKey)
        : localStorage.getItem(config.auth.adminUserKey) ||
          localStorage.getItem(config.auth.userKey) ||
          localStorage.getItem("appnix_admin_user");

      if (token) {
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setAuth(user);
          } catch {
            localStorage.removeItem(config.auth.userKey);
          }
        }
        await refreshUser();
      } else {
        setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const recaptchaToken = await getRecaptchaToken("login");
      const cleanEmail = email ? email.toLowerCase().trim() : "";
      const response = await api.post(apiEndpoints.auth.login, {
        email: cleanEmail,
        password,
        recaptchaToken,
      });

      const authData = response.data?.data || response.data;
      const accessToken = authData?.accessToken || authData?.token;
      const refreshToken = authData?.refreshToken;
      const user = authData?.user;

      if (!accessToken) {
        throw new Error(response.data?.message || "Invalid credentials received");
      }

      persistAccessToken(accessToken);
      if (refreshToken) {
        localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
      }

      if (user) {
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
        setAuth(user);
      } else {
        await refreshUser();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message
          ? Array.isArray(error.response.data.message)
            ? error.response.data.message.join(", ")
            : error.response.data.message
          : error.response?.data?.error || error.message || "Invalid email or password";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const signup = async (data: SignupData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const recaptchaToken = await getRecaptchaToken("signup");
      const response = await api.post(apiEndpoints.auth.signup, {
        tenantName: data.workspaceName,
        workspaceName: data.workspaceName,
        email: data.email,
        password: data.password,
        name: data.name,
        recaptchaToken,
      });

      const authData = response.data?.data || response.data;
      const accessToken = authData?.accessToken || authData?.token;
      const refreshToken = authData?.refreshToken;
      const user = authData?.user;

      if (!accessToken) {
        throw new Error(response.data?.message || "Registration failed");
      }

      persistAccessToken(accessToken);
      if (refreshToken) {
        localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
      }

      if (user) {
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
        setAuth(user);
      } else {
        await refreshUser();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message
          ? Array.isArray(error.response.data.message)
            ? error.response.data.message.join(", ")
            : error.response.data.message
          : error.response?.data?.error || error.message || "Registration failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const loginWithGoogleToken = async (idToken: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.post("/auth/google", { idToken });
      const authData = response.data?.data || response.data;
      const accessToken = authData?.accessToken || authData?.token;
      const refreshToken = authData?.refreshToken;
      const user = authData?.user;

      if (!accessToken) {
        throw new Error("Google authentication failed to return access token");
      }

      persistAccessToken(accessToken);
      if (refreshToken) {
        localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
      }

      if (user) {
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
        setAuth(user);
      } else {
        await refreshUser();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Google sign in failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.post(apiEndpoints.auth.logout);
    } catch {
    } finally {
      clearAccessToken();
      localStorage.removeItem(config.auth.refreshTokenKey);
      localStorage.removeItem(config.auth.userKey);
      localStorage.removeItem(config.auth.adminTokenKey);
      localStorage.removeItem(config.auth.adminUserKey);
      localStorage.removeItem(config.auth.adminRefreshTokenKey);
      localStorage.removeItem("appnix_admin_token");
      localStorage.removeItem("appnix_admin_user");
      localStorage.removeItem("appnix_admin_refresh_token");
      localStorage.removeItem("appnix_auth_token");
      localStorage.removeItem("appnix_user");
      localStorage.removeItem("appnix_refresh_token");
      localStorage.removeItem("appnix_guest_impersonation");
      localStorage.removeItem("appnix_guest_backup");
      localStorage.removeItem("appnix_impersonation_token");
      sessionStorage.removeItem("appnix_impersonation_token");
      setAuth(null);
    }
  };

  const forgotPassword = async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const recaptchaToken = await getRecaptchaToken("forgot_password");
      await api.post(apiEndpoints.auth.forgotPassword, { email, recaptchaToken });
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to send password reset instructions";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const resetPassword = async (
    token: string,
    password: string,
    confirmPassword?: string,
    email?: string,
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await api.post(apiEndpoints.auth.resetPassword, {
        token,
        password,
        confirmPassword,
        email,
      });
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Password reset failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const verifyOtp = async (
    email: string,
    otp: string,
    type: "email_verification" | "password_reset" | "2fa",
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.post(apiEndpoints.auth.verifyOtp, {
        email,
        otp,
        type,
      });
      const data = response.data?.data || response.data;
      if (data) {
        const { user, accessToken, refreshToken } = data;
        if (accessToken) {
          persistAccessToken(accessToken);
        }
        if (refreshToken) {
          localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
        }
        if (user) {
          localStorage.setItem(config.auth.userKey, JSON.stringify(user));
          setAuth(user);
        }
      } else {
        throw new Error(response.data?.message || "OTP verification failed");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "OTP verification failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  const resendOtp = async (
    email: string,
    type: "email_verification" | "password_reset" | "2fa",
  ) => {
    try {
      await api.post(apiEndpoints.auth.resendOtp, { email, type });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to resend OTP";
      setState((prev) => ({ ...prev, error: message }));
      throw new Error(message);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.put(apiEndpoints.user.update, data);
      const updatedUser = response.data?.data || response.data;
      if (updatedUser) {
        const merged = { ...state.user, ...updatedUser } as User;
        localStorage.setItem(config.auth.userKey, JSON.stringify(merged));
        setAuth(merged);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Profile update failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        register: signup,
        loginWithGoogleToken,
        logout,
        forgotPassword,
        resetPassword,
        verifyOtp,
        resendOtp,
        updateProfile,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
