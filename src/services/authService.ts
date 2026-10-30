import { supabaseClientService } from "./supabaseClient";
import type { AuthUser } from "../types";

const AUTH_USER_KEY = "cashflow_auth_user";

type AuthListener = (user: AuthUser | null) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: AuthUser | null = null;


  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    // 1. Read cached user from LocalStorage for instant offline availability
    try {
      const cached = localStorage.getItem(AUTH_USER_KEY);
      if (cached) {
        this.currentUser = JSON.parse(cached);
      }
    } catch (e) {
      console.error("Error reading cached user:", e);
    }

    // 2. Listen to Supabase Auth state changes if client is available
    const client = supabaseClientService.getClient();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          this.setCurrentUser({
            id: session.user.id,
            email: session.user.email || "",
            createdAt: session.user.created_at
          });
        } else {
          // If no active session from Supabase and online, clear cached user
          if (navigator.onLine && !this.currentUser?.id.startsWith("guest-")) {
            this.setCurrentUser(null);
          }
        }

      }).catch((err) => {
        console.warn("Failed to get initial auth session:", err);

      });

      client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          this.setCurrentUser({
            id: session.user.id,
            email: session.user.email || "",
            createdAt: session.user.created_at
          });
        } else {
          this.setCurrentUser(null);
        }
      });
    } else {

    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  private setCurrentUser(user: AuthUser | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    this.listeners.forEach((listener) => {
      try {
        listener(user);
      } catch (e) {
        console.error("Error in auth listener:", e);
      }
    });
  }

  // Sign up with Email and Password
  public async signUp(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: AuthUser; needsEmailConfirmation?: boolean }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client." };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Check if session was returned or email confirmation is required
        if (data.session) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || email,
            createdAt: data.user.created_at
          };
          this.setCurrentUser(authUser);
          return { success: true, message: "Đăng ký thành công!", user: authUser };
        } else {
          return {
            success: true,
            needsEmailConfirmation: true,
            message: "Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận tài khoản."
          };
        }
      }

      return { success: false, message: "Không thể tạo tài khoản. Vui lòng thử lại." };
    } catch (err: any) {
      return { success: false, message: err.message || "Lỗi đăng ký tài khoản." };
    }
  }

  // Sign in with Email and Password
  public async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client." };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          createdAt: data.user.created_at
        };
        this.setCurrentUser(authUser);
        return { success: true, message: "Đăng nhập thành công!", user: authUser };
      }

      return { success: false, message: "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin." };
    } catch (err: any) {
      return { success: false, message: err.message || "Lỗi đăng nhập." };
    }
  }

  // Sign in (or auto-register) with Google OAuth
  public async signInWithGoogle(): Promise<{ success: boolean; message: string }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client." };
    }
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        return { success: false, message: error.message };
      }
      // Browser will redirect to Google; session is handled by onAuthStateChange after return
      return { success: true, message: "Đang chuyển hướng đến Google..." };
    } catch (err: any) {
      return { success: false, message: err.message || "Lỗi đăng nhập Google." };
    }
  }

  // Sign out
  public async signOut(): Promise<{ success: boolean }> {
    const client = supabaseClientService.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("Sign out error:", e);
      }
    }
    this.setCurrentUser(null);
    return { success: true };
  }
}

export const authService = new AuthService();
export default authService;
