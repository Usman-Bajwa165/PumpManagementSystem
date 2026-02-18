"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  Fuel,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { username, password });
      const { access_token, user } = response.data as any;
      login(access_token, user);
      toast.success("Login Successful", `Welcome back, ${user.username}!`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Invalid credentials";
      setError(errorMsg);
      toast.error("Login Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 p-6 animate-in fade-in zoom-in duration-500">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-900/50 mb-6 transform transition-transform hover:scale-110 duration-500">
              <Fuel size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              Pump Portal
            </h2>
            <p className="text-zinc-500 text-sm">
              Secure access for station management
            </p>
          </div>

          <form className="p-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-red-500 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-4 pl-12 pr-4 text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-red-600 focus:bg-zinc-900 focus:ring-1 focus:ring-red-600"
                  placeholder="Username"
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 group-focus-within:text-red-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-4 pl-12 pr-4 text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-red-600 focus:bg-zinc-900 focus:ring-1 focus:ring-red-600"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 p-4 text-sm font-bold text-white transition-all hover:to-red-400 hover:shadow-lg hover:shadow-red-900/30 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </form>

          <div className="bg-zinc-950/50 p-6 text-center border-t border-zinc-800/50">
            <p className="text-xs text-zinc-600">
              Protected by Enterprise Security &copy; 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
