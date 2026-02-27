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
  Loader2,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Droplets,
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

  const formatShiftTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const period = hours >= 12 ? "Night" : "Morning";
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: formattedDate, time: formattedTime, period };
  };

  const allStats = [
    {
      name: "Today Sales",
      value: `Rs. ${summary?.todaySales?.toLocaleString() || 0}`,
      icon: TrendingUp,
      change: summary?.todaySales > 0 ? "+Active" : "No sales yet",
      trend: summary?.todaySales > 0 ? "up" : "neutral",
      roles: ["ADMIN", "MANAGER", "OPERATOR"],
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      name: "Today Profit",
      value: `Rs. ${summary?.todayProfit?.toLocaleString() || 0}`,
      icon: Wallet,
      change: summary?.todayProfit > 0 ? "Margin Earned" : "No profit yet",
      trend: summary?.todayProfit > 0 ? "up" : "neutral",
      roles: ["ADMIN", "MANAGER"],
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      name: "Credit Sales",
      value: `Rs. ${summary?.creditSales?.toLocaleString() || 0}`,
      icon: Users,
      change: "Institutional",
      trend: "neutral",
      roles: ["ADMIN", "MANAGER", "OPERATOR"],
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      name: "Active Shift",
      value: summary?.activeShift
        ? `${formatShiftTime(summary.activeShift.startedAt).date} - ${formatShiftTime(summary.activeShift.startedAt).period}`
        : "No Active Shift",
      icon: Clock,
      change: summary?.activeShift
        ? `Started at ${formatShiftTime(summary.activeShift.startedAt).time}`
        : "Station Closed",
      trend: "neutral",
      roles: ["ADMIN", "MANAGER", "OPERATOR"],
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      name: "Stock Status",
      value:
        summary?.lowStockCount > 0
          ? `${summary.lowStockCount} Tanks Low`
          : "Stock Healthy",
      icon: Fuel,
      change: summary?.lowStockCount > 0 ? "Action Required" : "All optimal",
      trend: summary?.lowStockCount > 0 ? "down" : "up",
      roles: ["ADMIN", "MANAGER", "OPERATOR"],
      color: summary?.lowStockCount > 0 ? "text-rose-500" : "text-zinc-500",
      bg: summary?.lowStockCount > 0 ? "bg-rose-500/10" : "bg-zinc-500/10",
      border:
        summary?.lowStockCount > 0
          ? "border-rose-500/20"
          : "border-zinc-500/20",
    },
  ];

  const stats = allStats.filter((stat) =>
    stat.roles.includes(user?.role || ""),
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-red-600 w-12 h-12" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">

        {/* Stats Grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${user?.role === "OPERATOR" ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}
        >
          {stats.map((stat) => (
            <div
              key={stat.name}
              className={`p-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md hover:translate-y-[-2px] transition-all duration-300 shadow-xl group cursor-default`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={22} />
                </div>
                {stat.trend !== "neutral" && (
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trend === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    {stat.trend === "up" ? "Good" : "Alert"}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">
                  {stat.name}
                </p>
                <h3 className="text-2xl font-bold text-zinc-100">
                  {stat.value}
                </h3>
                <p
                  className={`text-xs ${stat.color} font-medium flex items-center gap-1`}
                >
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Graph */}
          <div className="lg:col-span-2 p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm min-h-[450px] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="text-red-500" size={24} />
                  Revenue Trend
                </h3>
                <p className="text-sm text-zinc-500">Last 7 days performance</p>
              </div>
              <div className="px-4 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-xs font-mono text-zinc-400">
                PKR
              </div>
            </div>

            <div className="h-[300px] flex items-end justify-between gap-2 px-2 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-px bg-zinc-500 border-t border-dashed"></div>
                <div className="w-full h-px bg-zinc-500 border-t border-dashed"></div>
                <div className="w-full h-px bg-zinc-500 border-t border-dashed"></div>
                <div className="w-full h-px bg-zinc-500 border-t border-dashed"></div>
              </div>

              {summary?.trend?.map((day: any, i: number) => {
                const max = Math.max(
                  ...summary.trend.map((t: any) => t.amount),
                  1,
                );
                // Safe Date Parsing
                const dateObj = new Date(day.date);
                // Fix timezone shift by picking standard weekday
                const dayName = dateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                });

                // Dynamic scaling with min-height visibility
                const percentage = (day.amount / max) * 100;
                const visualHeight =
                  day.amount > 0 ? Math.max(percentage, 10) : 0; // Min 10% height if > 0

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-3 group relative z-10 h-full justify-end"
                  >
                    <div className="w-full max-w-[50px] relative flex items-end h-full">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-red-900/50 to-red-600 transition-all duration-500 group-hover:to-red-500 group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                        style={{
                          height: `${visualHeight}%`,
                          opacity: day.amount > 0 ? 1 : 0.1,
                        }}
                      >
                        {day.amount === 0 && (
                          <div className="w-full h-[4px] bg-zinc-800 absolute bottom-0 rounded-full" />
                        )}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-zinc-900 text-zinc-100 text-xs font-bold px-3 py-2 rounded-lg border border-zinc-700 shadow-xl whitespace-nowrap z-20">
                        Rs. {day.amount.toLocaleString()}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-b border-r border-zinc-700"></div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tank Gauges */}
          <div className="p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm min-h-[450px] shadow-xl flex flex-col">
            <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
              <Droplets className="text-blue-500" size={24} />
              Fuel Levels
            </h3>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {summary?.inventory?.map((tank: any, i: number) => (
                <div key={i} className="group">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {tank.name}
                    </span>
                    <span
                      className={
                        tank.level < 20
                          ? "text-rose-500 animate-pulse"
                          : "text-emerald-500"
                      }
                    >
                      {tank.level.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-zinc-950/50 rounded-full overflow-hidden border border-zinc-800 relative">
                    {/* Background hashes */}
                    <div className="absolute inset-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDFoMnYySDF6IiBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')]"></div>
                    <div
                      className={`h-full transition-all duration-1000 relative ${tank.level < 20 ? "bg-gradient-to-r from-rose-900 to-rose-600" : "bg-gradient-to-r from-emerald-900 to-emerald-500"}`}
                      style={{ width: `${tank.level}%` }}
                    >
                      <div className="absolute right-0 top-0 h-full w-[2px] bg-white/50 shadow-[0_0_10px_white]"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">
                    System Status
                  </h4>
                  <p className="text-xs text-zinc-500">
                    All systems functioning normally
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
