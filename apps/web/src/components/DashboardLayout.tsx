"use client";

import React, { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DateTime from "@/components/DateTime";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter, usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-generate title from pathname if not provided
  const pageTitle = title || pathname?.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';

  // Update document title
  useEffect(() => {
    document.title = `PPMS - ${pageTitle}`;
  }, [pageTitle]);

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
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-900 px-8 py-4 transition-colors">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 tracking-tight">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-4">
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
        </div>
        
        {/* Content - Full height with internal scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
