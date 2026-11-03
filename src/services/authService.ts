import { supabaseClientService } from "./supabaseClient";
import type { AuthUser } from "../types";

const AUTH_USER_KEY = "cashflow_auth_user";
const GUEST_USER_KEY = "cashflow_guest_user_id";
const GUEST_USER_ALIASES_KEY = "cashflow_guest_user_id_aliases";

type AuthListener = (user: AuthUser | null) => void;

/**
 * Maps Supabase Auth errors into clear, friendly Vietnamese messages.
 */
export function mapAuthError(message?: string): string {
  if (!message) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  const msg = message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.";
  }
  if (msg.includes("email not confirmed")) {
    return "Tài khoản chưa được kích hoạt email. Vui lòng kiểm tra hộp thư (cả mục Spam) để nhấn link xác nhận.";
  }
  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab 'Đăng nhập'.";
  }
  if (msg.includes("password should be at least 6") || msg.includes("weak_password")) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  if (msg.includes("signup requires a valid password")) {
    return "Vui lòng nhập mật khẩu hợp lệ (tối thiểu 6 ký tự).";
  }
  if (msg.includes("over_email_send_rate_limit") || msg.includes("rate limit")) {
    return "Bạn đã gửi yêu cầu quá nhanh. Vui lòng đợi 1-2 phút trước khi thử lại.";
  }
  if (msg.includes("access_denied") || msg.includes("canceled") || msg.includes("cancelled")) {
    return "Bạn đã hủy quá trình đăng nhập.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror")) {
    return "Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra lại kết nối mạng.";
  }
  if (msg.includes("invalid refresh token") || msg.includes("refresh_token_not_found")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  return message;
}

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: AuthUser | null = null;
  private authStateSubscription: { unsubscribe: () => void } | null = null;
  private lastAuthError: string | null = null;
  private isHandlingOAuth = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    // 1. Read cached user from LocalStorage for instant offline availability & zero UI flicker
    try {
      const cached = localStorage.getItem(AUTH_USER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.id === "string") {
          this.currentUser = parsed;
        }
      }
    } catch (e) {
      console.error("Error reading cached user from LocalStorage:", e);
    }

    // Default to guest if nothing was cached
    if (!this.currentUser) {
      this.currentUser = this.getOrCreateGuestUser();
    }

    // 2. Check for OAuth callback error or code in URL
    this.inspectUrlForAuthParams();

    // 3. Connect Supabase Client Auth listeners
    this.setupClientAuth();

    // 4. Re-bind whenever Supabase settings are updated in Settings page
    supabaseClientService.onConfigChange(() => {
      this.setupClientAuth();
    });

    // 5. Maintain persistent session on tab focus / wake from sleep / reconnect
    this.setupSessionKeepAlive();
  }

  /**
   * Check if URL has OAuth code or error params returned from Google / Supabase redirect
   */
  private inspectUrlForAuthParams() {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);

      // Check for OAuth error
      const errorDesc = url.searchParams.get("error_description") || url.searchParams.get("error");
      if (errorDesc) {
        this.lastAuthError = mapAuthError(decodeURIComponent(errorDesc));
        this.cleanAuthUrlParams();
        return;
      }

      // Check for PKCE code
      const code = url.searchParams.get("code");
      if (code) {
        this.isHandlingOAuth = true;
      }
    } catch (err) {
      console.warn("Could not inspect URL for auth params:", err);
    }
  }

  /**
   * Remove OAuth code/error query and hash fragments from address bar without reloading
   */
  private cleanAuthUrlParams(): void {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      let changed = false;

      const authKeys = ["code", "error", "error_code", "error_description"];
      for (const k of authKeys) {
        if (url.searchParams.has(k)) {
          url.searchParams.delete(k);
          changed = true;
        }
      }

      if (url.hash && (url.hash.includes("access_token") || url.hash.includes("error"))) {
        url.hash = "";
        changed = true;
      }

      if (changed) {
        const cleanPath =
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
        window.history.replaceState({}, document.title, cleanPath || "/");
      }
    } catch (err) {
      console.warn("Error cleaning auth URL params:", err);
    }
  }

  /**
   * Set up or rebind Supabase Auth listeners
   */
  private setupClientAuth() {
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
      this.authStateSubscription = null;
    }

    const client = supabaseClientService.getClient();
    if (!client) {
      if (!this.currentUser) {
        this.setCurrentUser(this.getOrCreateGuestUser());
      }
      return;
    }

    // Explicitly exchange OAuth code if present in URL
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        client.auth
          .exchangeCodeForSession(code)
          .then(({ data, error }) => {
            this.isHandlingOAuth = false;
            if (error) {
              console.warn("Error exchanging OAuth code:", error.message);
              this.lastAuthError = mapAuthError(error.message);
            } else if (data?.session?.user) {
              const u = data.session.user;
              this.setCurrentUser({
                id: u.id,
                email: u.email || u.user_metadata?.email || "",
                createdAt: u.created_at,
                isGuest: false
              });
              this.cleanAuthUrlParams();
            }
          })
          .catch((err) => {
            this.isHandlingOAuth = false;
            console.warn("Exception during exchangeCodeForSession:", err);
          });
      }
    }

    // Listen to real-time auth events from Supabase client
    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const isGuest = Boolean(session.user.is_anonymous);
        if (isGuest) {
          this.rememberSupabaseGuestUser(session.user.id);
          this.setCurrentUser({
            id: session.user.id,
            email: "",
            createdAt: session.user.created_at,
            isGuest: true
          });
        } else {
          const email = session.user.email || session.user.user_metadata?.email || "";
          this.setCurrentUser({
            id: session.user.id,
            email,
            createdAt: session.user.created_at,
            isGuest: false
          });
          this.cleanAuthUrlParams();
        }
      } else if (event === "SIGNED_OUT") {
        // User or server explicitly signed out
        this.setCurrentUser(this.getOrCreateGuestUser());
      } else if (event === "INITIAL_SESSION") {
        // No session returned on initial check
        if (this.isHandlingOAuth) {
          // Wait for OAuth exchange to complete
          return;
        }

        // If user was previously authenticated, attempt token refresh to keep session alive
        if (this.currentUser && !this.currentUser.isGuest) {
          if (navigator.onLine) {
            try {
              const { data: refreshData, error: refreshError } = await client.auth.refreshSession();
              if (refreshError || !refreshData.session) {
                // If refresh token is genuinely revoked / expired
                console.warn("Could not refresh session:", refreshError?.message);
                this.setCurrentUser(this.getOrCreateGuestUser());
              }
            } catch (err) {
              console.warn("Session refresh error:", err);
              // In case of network error, do not demote to guest; keep cached user
            }
          }
          // If offline, maintain logged-in state from LocalStorage
        } else if (!this.currentUser) {
          this.setCurrentUser(this.getOrCreateGuestUser());
        }
      }
    });

    this.authStateSubscription = authListener.subscription;

    // Initial check: if client has stored session, verify it
    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const isGuest = Boolean(session.user.is_anonymous);
        if (!isGuest) {
          const email = session.user.email || session.user.user_metadata?.email || "";
          this.setCurrentUser({
            id: session.user.id,
            email,
            createdAt: session.user.created_at,
            isGuest: false
          });
        }
      }
    }).catch((err) => {
      console.warn("Initial getSession error:", err);
    });
  }

  /**
   * Listen for window focus, visibility change, and online events to refresh the token
   * and maintain session indefinitely.
   */
  private setupSessionKeepAlive() {
    if (typeof window === "undefined") return;

    const refreshIfNeeded = async () => {
      const client = supabaseClientService.getClient();
      if (!client) return;

      // Start auto refresh loop
      client.auth.startAutoRefresh();

      // If user is logged in, ensure session is valid
      if (this.currentUser && !this.currentUser.isGuest && navigator.onLine) {
        try {
          const { data: { session }, error } = await client.auth.getSession();
          if (error || !session) {
            // Attempt explicit refresh
            await client.auth.refreshSession();
          }
        } catch (e) {
          console.warn("Keep-alive session check failed:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void refreshIfNeeded();
      }
    });

    window.addEventListener("focus", () => {
      void refreshIfNeeded();
    });

    window.addEventListener("online", () => {
      void refreshIfNeeded();
    });
  }

  private getOrCreateGuestUser(): AuthUser {
    let id = localStorage.getItem(GUEST_USER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_USER_KEY, id);
    }
    return { id, email: "", isGuest: true };
  }

  private rememberSupabaseGuestUser(userId: string): void {
    const previousGuestId = localStorage.getItem(GUEST_USER_KEY);
    if (previousGuestId && previousGuestId !== userId) {
      const aliases = this.getGuestUserIds();
      if (!aliases.includes(previousGuestId)) aliases.push(previousGuestId);
      localStorage.setItem(GUEST_USER_ALIASES_KEY, JSON.stringify(aliases));
    }
    localStorage.setItem(GUEST_USER_KEY, userId);
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public getLastAuthError(): string | null {
    return this.lastAuthError;
  }

  public clearLastAuthError(): void {
    this.lastAuthError = null;
  }

  public getGuestUserId(): string | null {
    return localStorage.getItem(GUEST_USER_KEY);
  }

  public getGuestUserIds(): string[] {
    try {
      const aliases = JSON.parse(localStorage.getItem(GUEST_USER_ALIASES_KEY) || "[]");
      return [...new Set([this.getGuestUserId(), ...(Array.isArray(aliases) ? aliases : [])]
        .filter((id): id is string => typeof id === "string"))];
    } catch (error) {
      console.error("Could not read guest user ID aliases:", error);
      const guestUserId = this.getGuestUserId();
      return guestUserId ? [guestUserId] : [];
    }
  }

  public isGuestUserId(userId: string): boolean {
    return this.getGuestUserIds().includes(userId) || userId.startsWith("guest-");
  }

  public ensureGuestUserId(): string {
    return this.getOrCreateGuestUser().id;
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

  /**
   * Sign up with Email and Password
   */
  public async signUp(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: AuthUser; needsEmailConfirmation?: boolean }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client. Vui lòng nhập URL và API Key." };
    }

    const cleanEmail = email.trim().toLowerCase();
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { success: false, message: mapAuthError(error.message) };
      }

      if (data.user) {
        // If session was returned immediately (email confirmation disabled in Supabase)
        if (data.session) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            createdAt: data.user.created_at,
            isGuest: false
          };
          this.setCurrentUser(authUser);
          return { success: true, message: "Đăng ký thành công!", user: authUser };
        } else {
          // Email confirmation is required
          return {
            success: true,
            needsEmailConfirmation: true,
            message: "Đăng ký thành công! Supabase đã gửi email xác nhận. Vui lòng kiểm tra hộp thư của bạn."
          };
        }
      }

      return { success: false, message: "Không thể tạo tài khoản. Vui lòng thử lại." };
    } catch (err: any) {
      return { success: false, message: mapAuthError(err?.message || "Lỗi đăng ký tài khoản.") };
    }
  }

  /**
   * Sign in with Email and Password
   */
  public async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client. Vui lòng nhập URL và API Key." };
    }

    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        return { success: false, message: mapAuthError(error.message) };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          createdAt: data.user.created_at,
          isGuest: false
        };
        this.setCurrentUser(authUser);
        return { success: true, message: "Đăng nhập thành công!", user: authUser };
      }

      return { success: false, message: "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin." };
    } catch (err: any) {
      return { success: false, message: mapAuthError(err?.message || "Lỗi đăng nhập.") };
    }
  }

  /**
   * Sign in or register with Google OAuth
   */
  public async signInWithGoogle(): Promise<{ success: boolean; message: string }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase Client. Vui lòng nhập URL và API Key." };
    }

    try {
      // Redirect back to current origin + pathname cleanly
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });

      if (error) {
        return { success: false, message: mapAuthError(error.message) };
      }

      return { success: true, message: "Đang chuyển hướng đến Google..." };
    } catch (err: any) {
      return { success: false, message: mapAuthError(err?.message || "Lỗi đăng nhập Google.") };
    }
  }

  /**
   * Sign out explicitly
   */
  public async signOut(): Promise<{ success: boolean }> {
    const client = supabaseClientService.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("Sign out error:", e);
      }
    }
    // Set to local guest user
    this.setCurrentUser(this.getOrCreateGuestUser());
    return { success: true };
  }
}

export const authService = new AuthService();
export default authService;
