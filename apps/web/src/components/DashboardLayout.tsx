"use client";

import React, { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
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
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 p-4 flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-100">{user.username}</p>
            <p className="text-[10px] text-zinc-500 uppercase">{user.role}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
