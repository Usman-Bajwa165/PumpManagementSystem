"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  TrendingUp,
  Fuel,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get("/reports/dashboard-summary");
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard summary", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const stats = [
    {
      name: "Today Sales",
      value: `Rs. ${summary?.todaySales?.toLocaleString() || 0}`,
      icon: TrendingUp,
      change: summary?.todaySales > 0 ? "+Active" : "No sales yet",
      trend: summary?.todaySales > 0 ? "up" : "neutral",
    },
    {
      name: "Active Shift",
      value: summary?.activeShift
        ? `Shift #${summary.activeShift.id.slice(-4)}`
        : "No Active Shift",
      icon: Fuel,
      change: summary?.activeShift
        ? `Started at ${new Date(summary.activeShift.startedAt).toLocaleTimeString()}`
        : "Station Closed",
      trend: "neutral",
    },
    {
      name: "Credit Sales",
      value: `Rs. ${summary?.creditSales?.toLocaleString() || 0}`,
      icon: Users,
      change: "Institutional",
      trend: "neutral",
    },
    {
      name: "Stock Alerts",
      value:
        summary?.lowStockCount > 0
          ? `${summary.lowStockCount} Tanks Low`
          : "Stock Healthy",
      icon: AlertTriangle,
      change: summary?.lowStockCount > 0 ? "Action Required" : "All optimal",
      trend: summary?.lowStockCount > 0 ? "down" : "up",
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Here is what is happening at your station today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm transition-all hover:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-red-600/10 text-red-500">
                  <stat.icon size={20} />
                </div>
                {stat.trend !== "neutral" && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${stat.trend === "up" ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {stat.trend === "up" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    {stat.change}
                  </div>
                )}
                {stat.trend === "neutral" && (
                  <div className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                    <Clock size={12} />
                    {stat.change}
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-500 font-medium">{stat.name}</p>
              <h3 className="text-2xl font-bold text-zinc-100 mt-1">
                {stat.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Analytics & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 min-h-[400px]">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Sales Distribution
            </h3>
            <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-xl">
              <div className="flex gap-8 items-end h-40 mb-8">
                <div
                  className="w-12 bg-red-600 rounded-t-lg"
                  style={{ height: summary?.todaySales > 0 ? "70%" : "5%" }}
                />
                <div
                  className="w-12 bg-zinc-800 rounded-t-lg"
                  style={{ height: "40%" }}
                />
                <div
                  className="w-12 bg-emerald-600 rounded-t-lg"
                  style={{ height: "90%" }}
                />
              </div>
              <p className="text-zinc-600 text-sm">
                Real-time analytics processing for {user?.username}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 min-h-[400px]">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              System Events
            </h3>
            <div className="space-y-4">
              {summary?.activeShift ? (
                <div className="p-4 rounded-xl bg-emerald-600/5 border border-emerald-600/10 flex gap-4">
                  <Fuel className="text-emerald-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      Shift Started
                    </p>
                    <p className="text-xs text-zinc-500">
                      New shift initiated by operator.
                    </p>
                  </div>
                </div>
              ) : null}
              {summary?.lowStockCount > 0 ? (
                <div className="p-4 rounded-xl bg-red-600/5 border border-red-600/10 flex gap-4">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      Low Stock Alert
                    </p>
                    <p className="text-xs text-zinc-500">
                      {summary.lowStockCount} tanks require monitoring.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-600/5 border border-emerald-600/10 flex gap-4">
                  <CheckCircle2
                    className="text-emerald-600 shrink-0"
                    size={20}
                  />
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      Stock Optimal
                    </p>
                    <p className="text-xs text-zinc-500">
                      All tanks at healthy levels.
                    </p>
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex gap-4">
                <Users className="text-zinc-500 shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold text-zinc-200">
                    Manager Online
                  </p>
                  <p className="text-xs text-zinc-500">
                    Authenticated access session active.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
