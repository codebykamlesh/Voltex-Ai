"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from "lucide-react";
import Image from "next/image";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isAuthenticated && !isLoading) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err: unknown) {
      console.error("Google login error:", err);
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      if (!message.includes("popup-closed")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !displayName.trim()) {
      setError("Please enter a display name.");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const isStrong = /[A-Za-z]/.test(password) && /[0-9]/.test(password);
    if (mode === "signup" && !isStrong) {
      setError("Password must contain both letters and numbers.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, displayName.trim());
        setVerificationSent(true);
      } else {
        await signInWithEmail(email, password);
        router.push("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("email-not-verified")) {
        setError("Email not verified. Please check your inbox.");
      } else if (message.includes("user-not-found") || message.includes("invalid-credential")) {
        setError("Invalid email or password.");
      } else if (message.includes("email-already-in-use")) {
        setError("An account with this email already exists. Please sign in.");
      } else if (message.includes("weak-password")) {
        setError("Password is too weak. Use at least 8 characters.");
      } else {
        setError(mode === "signup" ? "Sign up failed. Please try again." : "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-[var(--accent)]" />
        </motion.div>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-[var(--outline-variant)] bg-[var(--surface-container)] p-8 text-center"
        >
          <Mail className="mx-auto mb-4 h-12 w-12 text-[var(--accent)]" />
          <h2 className="mb-2 text-xl font-bold text-[var(--primary)]">Check Your Email</h2>
          <p className="mb-6 text-sm text-[var(--on-surface-variant)]">
            We&apos;ve sent a verification link to <span className="font-semibold text-[var(--primary)]">{email}</span>.
            Please verify your email and then sign in.
          </p>
          <button
            onClick={() => { setVerificationSent(false); setMode("login"); }}
            className="w-full bg-[var(--primary)] py-3 font-bold text-[var(--on-primary)] transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen items-center justify-center bg-[var(--bg)] p-4">
      {/* Atmospheric background elements */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[var(--primary)] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[var(--accent)] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mb-3 flex items-center justify-center gap-2"
          >
            <Image src="/logo.jpg" alt="Voltex AI Logo" width={32} height={32} className="rounded-sm" priority />
            <span className="text-2xl font-black tracking-widest text-[var(--primary)]">VOLTEX AI</span>
          </motion.div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
            Technical Workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="border border-[var(--outline-variant)] bg-[var(--surface-container)] p-8">
          <h1 className="mb-6 text-xl font-bold text-[var(--primary)]">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 border border-[var(--outline-variant)] bg-transparent py-3 text-sm font-semibold text-[var(--primary)] transition-all hover:bg-[var(--surface-container-high)] active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[var(--outline-variant)]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">or</span>
            <div className="h-px flex-1 bg-[var(--outline-variant)]" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[var(--on-surface-variant)]" />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-[var(--outline-variant)] bg-[var(--bg)] py-3 pl-10 pr-4 text-sm text-[var(--primary)] placeholder-[var(--on-surface-variant)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--on-surface-variant)]" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--outline-variant)] bg-[var(--bg)] py-3 pl-10 pr-4 text-sm text-[var(--primary)] placeholder-[var(--on-surface-variant)] transition-colors focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--on-surface-variant)]" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[var(--outline-variant)] bg-[var(--bg)] py-3 pl-10 pr-10 text-sm text-[var(--primary)] placeholder-[var(--on-surface-variant)] transition-colors focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === "signup" && password && (
              <div className="space-y-1.5">
                <div className="flex h-1 w-full overflow-hidden rounded-full bg-[var(--surface-container-highest)]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      password.length < 8 ? "w-1/4 bg-[var(--error)]" :
                      !(/[A-Za-z]/.test(password) && /[0-9]/.test(password)) ? "w-2/4 bg-[#eab308]" :
                      /[^A-Za-z0-9]/.test(password) ? "w-full bg-[#22c55e]" : "w-3/4 bg-[#3b82f6]"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-[var(--on-surface-variant)]">
                  {password.length < 8 ? "Too short" :
                   !(/[A-Za-z]/.test(password) && /[0-9]/.test(password)) ? "Add numbers and letters" :
                   /[^A-Za-z0-9]/.test(password) ? "Strong password" : "Good password"}
                </p>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[var(--error)]"
              >
                <p>{error}</p>
                {error.includes("Email not verified") && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await sendVerificationEmail();
                        setError("Verification email sent! Please check your inbox.");
                      } catch (err: any) {
                        setError(err.message || "Failed to resend email.");
                      }
                    }}
                    className="mt-2 font-semibold underline hover:opacity-80"
                  >
                    Resend Verification Email
                  </button>
                )}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-[var(--primary)] py-3 font-bold text-[var(--on-primary)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-[var(--on-surface-variant)]">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="font-semibold text-[var(--accent)] hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>


        </div>
      </motion.div>
    </div>
  );
}
