"use client";

import React, { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DateTime from "@/components/DateTime";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { Sun, Moon } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600/20 border-t-red-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-900 px-8 py-4 transition-colors">
          <div className="flex items-center justify-end gap-4">
            <DateTime />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="text-amber-500" size={18} />
              ) : (
                <Moon className="text-blue-600" size={18} />
              )}
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
