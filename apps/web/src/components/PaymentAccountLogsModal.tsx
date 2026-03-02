import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import api from "@/lib/api";

interface PaymentAccountLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
}

export default function PaymentAccountLogsModal({
  isOpen,
  onClose,
  accounts,
}: PaymentAccountLogsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSubType, setSelectedSubType] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [data, setData] = useState<{ logs: any[]; summary: any }>({
    logs: [],
    summary: {
      currentBalance: 0,
      salesBalance: 0,
      expenses: 0,
      income: 0,
      totalTransactions: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, selectedAccountId, selectedType, selectedSubType, dateRange]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedAccountId !== "all") params.accountId = selectedAccountId;
      if (selectedType !== "all") params.type = selectedType;
      if (selectedSubType !== "all") params.subType = selectedSubType;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const res = await api.get("/payment-accounts/logs", { params });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Payment Account Logs
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Detailed view of all transactions and adjustments
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex gap-4 bg-white dark:bg-zinc-900 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Filter by Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 transition-all font-medium"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Filter by Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 transition-all font-medium"
            >
              <option value="all">All Logs </option>
              <option value="TRANSACTION">Transactions Only</option>
              <option value="ADJUSTMENT">Adjustments Only</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Income / Expense
            </label>
            <select
              value={selectedSubType}
              onChange={(e) => setSelectedSubType(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 transition-all font-medium"
            >
              <option value="all">All Types</option>
              <option value="INCOME">Income (Incoming)</option>
              <option value="EXPENSE">Expense (Outgoing)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 transition-all font-medium cursor-pointer"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 transition-all font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 bg-zinc-50/50 dark:bg-zinc-950/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-red-600" size={32} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Wallet size={14} /> Current Balance
                  </span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Rs. {data.summary.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <DollarSign size={14} /> Sales Balance
                  </span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-500">
                    Rs. {data.summary.salesBalance.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} /> Other Income
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                    Rs. {data.summary.income.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <TrendingDown size={14} /> Expenses
                  </span>
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-500">
                    Rs. {data.summary.expenses.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Wallet size={14} /> Total
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                    Rs. {data.summary.totalTransactions.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 overflow-hidden max-h-[50vh]">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          Date & Time
                        </th>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          Account
                        </th>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          Type
                        </th>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                          By
                        </th>
                        <th className="p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right whitespace-nowrap">
                          Amount (Rs.)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {data.logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-zinc-500"
                          >
                            No logs found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        data.logs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-sm">
                              {new Date(log.date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                              ,{" "}
                              {new Date(log.date).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </td>
                            <td className="p-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap text-sm">
                              {log.accountName ? (
                                log.accountNumber ? (
                                  `${log.accountName} - ${log.accountNumber}`
                                ) : (
                                  log.accountName
                                )
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  log.type === "Adjustment"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                                }`}
                              >
                                {log.type}
                              </span>
                            </td>
                            <td
                              className="p-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-md"
                              title={log.description}
                            >
                              {log.description}
                            </td>
                            <td className="p-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs">
                                {log.by}
                              </span>
                            </td>
                            <td
                              className={`p-3 text-right font-bold whitespace-nowrap text-sm ${
                                log.isIncoming
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {log.isIncoming ? (
                                  <ArrowUpRight size={16} />
                                ) : (
                                  <ArrowDownRight size={16} />
                                )}
                                {log.amount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
