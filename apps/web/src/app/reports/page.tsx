"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Activity,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"PL" | "BS" | "LEDGER">("PL");
  const [plData, setPlData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPL = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/reports/profit-loss");
      setPlData(res.data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBS = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/reports/balance-sheet");
      setBsData(res.data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === "PL") fetchPL();
    if (reportType === "BS") fetchBS();
  }, [reportType]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight italic">
              Financial Intelligence
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Generate real-time P&L, Balance Sheets, and Account Ledgers.
            </p>
          </div>
          <div className="flex bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => setReportType("PL")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                reportType === "PL"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              Profit & Loss
            </button>
            <button
              onClick={() => setReportType("BS")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                reportType === "BS"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              Balance Sheet
            </button>
            <button
              disabled
              className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-700 cursor-not-allowed"
            >
              Ledgers
            </button>
          </div>
        </div>

        {/* Report Content */}
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="animate-spin text-red-600" />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {reportType === "PL" && plData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Summary Card */}
                <div className="md:col-span-2 p-8 rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl flex items-center justify-between overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Net Financial Performance
                    </p>
                    <h2
                      className={cn(
                        "text-5xl font-black italic italic",
                        plData.netProfit >= 0
                          ? "text-emerald-500"
                          : "text-rose-500",
                      )}
                    >
                      Rs. {plData.netProfit.toLocaleString()}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-4 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live calculation based on current transactions
                    </p>
                  </div>
                </div>

                {/* Income Section */}
                <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-500">
                      <TrendingUp size={18} />
                    </div>
                    Revenue Stream
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(plData.income).map(
                      ([name, amount]: any) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900"
                        >
                          <span className="text-zinc-400 font-medium">
                            {name}
                          </span>
                          <span className="text-zinc-100 font-bold">
                            Rs. {amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                    <div className="pt-4 border-t border-zinc-800 flex justify-between px-2">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                        Total Revenue
                      </span>
                      <span className="text-emerald-500 font-black">
                        Rs. {plData.totalIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expense Section */}
                <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-rose-600/10 text-rose-500">
                      <TrendingDown size={18} />
                    </div>
                    Operational Expenses
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(plData.expenses).map(
                      ([name, amount]: any) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900"
                        >
                          <span className="text-zinc-400 font-medium">
                            {name}
                          </span>
                          <span className="text-zinc-100 font-bold">
                            Rs. {amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                    <div className="pt-4 border-t border-zinc-800 flex justify-between px-2">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                        Total Expenses
                      </span>
                      <span className="text-rose-500 font-black">
                        Rs. {plData.totalExpenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === "BS" && bsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Assets Section */}
                <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
                  <h3 className="text-lg font-bold text-zinc-100 mb-6">
                    Current & Fixed Assets
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(bsData.assets).map(
                      ([name, amount]: any) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900"
                        >
                          <span className="text-zinc-400 font-medium">
                            {name}
                          </span>
                          <span className="text-zinc-100 font-bold tracking-tight">
                            Rs. {amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                    <div className="pt-6 border-t border-zinc-800 flex justify-between px-2">
                      <span className="text-zinc-500 font-black uppercase text-[12px]">
                        Total Worth
                      </span>
                      <span className="text-red-500 font-black text-xl italic italic">
                        Rs. {bsData.totalAssets.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity Section */}
                <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
                  <h3 className="text-lg font-bold text-zinc-100 mb-6 font-bold">
                    Liabilities & Equity
                  </h3>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">
                        Liabilities
                      </p>
                      {Object.entries(bsData.liabilities).map(
                        ([name, amount]: any) => (
                          <div
                            key={name}
                            className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900"
                          >
                            <span className="text-zinc-400 font-medium">
                              {name}
                            </span>
                            <span className="text-zinc-100 font-bold tracking-tight">
                              Rs. {amount.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">
                        Equity
                      </p>
                      {Object.entries(bsData.equity).map(
                        ([name, amount]: any) => (
                          <div
                            key={name}
                            className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900"
                          >
                            <span className="text-zinc-400 font-medium">
                              {name}
                            </span>
                            <span className="text-zinc-100 font-bold tracking-tight">
                              Rs. {amount.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="pt-6 border-t border-zinc-800 flex justify-between px-2">
                      <span className="text-zinc-500 font-black uppercase text-[12px]">
                        Total Claims
                      </span>
                      <span className="text-red-500 font-black text-xl italic italic">
                        Rs. {bsData.totalLiabilitiesAndEquity.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Helper for TrendingUp replacement if not available
function MyTrendingUp({ size }: { size: number }) {
  return <ArrowUpRight size={size} />;
}
