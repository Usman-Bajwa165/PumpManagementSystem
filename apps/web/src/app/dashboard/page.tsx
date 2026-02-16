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
        ? `${formatShiftTime(summary.activeShift.startedAt).date} - ${formatShiftTime(summary.activeShift.startedAt).period}`
        : "No Active Shift",
      icon: Fuel,
      change: summary?.activeShift
        ? `Started at ${formatShiftTime(summary.activeShift.startedAt).time}`
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
              7-Day Sales Trend
            </h3>
            <div className="h-full flex flex-col items-center justify-end p-8 border border-dashed border-zinc-800 rounded-xl relative">
              <div className="flex gap-4 items-end w-full justify-between px-4">
                {summary?.trend?.map((day: any, i: number) => {
                  const max = Math.max(
                    ...summary.trend.map((t: any) => t.amount),
                    1,
                  );
                  const height = `${(day.amount / max) * 100}%`;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 group relative"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[10px] px-2 py-1 rounded border border-zinc-700 pointer-events-none whitespace-nowrap z-10">
                        Rs. {day.amount.toLocaleString()}
                      </div>
                      <div
                        className="w-8 md:w-12 bg-red-600/80 hover:bg-red-500 rounded-t-lg transition-all duration-500"
                        style={{
                          height: day.amount > 0 ? height : "4px",
                          minHeight: day.amount > 0 ? "20px" : "4px",
                        }}
                      />
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold mt-8">
                Daily Revenue Stream (PKR)
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 min-h-[400px]">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Tank Gauges
            </h3>
            <div className="space-y-6">
              {summary?.inventory?.map((tank: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                    <span className="text-zinc-400">{tank.name}</span>
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
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full transition-all duration-1000 ${tank.level < 20 ? "bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.4)]" : "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]"}`}
                      style={{ width: `${tank.level}%` }}
                    />
                  </div>
                </div>
              ))}

              <hr className="border-zinc-800 my-4" />

              <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-4">
                System Alerts
              </h4>
              <div className="space-y-3">
                {summary?.activeShift ? (
                  <div className="flex items-start gap-4 p-3 rounded-lg bg-emerald-600/5 border border-emerald-600/10 transition-colors hover:bg-emerald-600/10">
                    <Fuel className="text-emerald-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-bold text-zinc-200">
                        Active Duty
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Transaction recording is live.
                      </p>
                    </div>
                  </div>
                ) : null}
                {summary?.lowStockCount > 0 && (
                  <div className="flex items-start gap-4 p-3 rounded-lg bg-rose-600/5 border border-rose-600/10 transition-colors hover:bg-rose-600/10">
                    <AlertTriangle className="text-rose-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-bold text-zinc-200">
                        Critical Stock
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {summary.lowStockCount} tanks require refill.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <CheckCircle2 className="text-zinc-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Safe Mode</p>
                    <p className="text-[10px] text-zinc-500">
                      All services operational.
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
