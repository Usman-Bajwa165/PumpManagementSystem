"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Wallet,
  Plus,
  Loader2,
  Search,
  Calendar,
  FileText,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  transaction?: {
    creditAccount: { code: string; name: string };
    debitAccount: { code: string; name: string };
    paymentAccount?: { name: string; type: string };
  };
}

type FinanceTab = "EXPENSES" | "INCOME";

export default function FinancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = (searchParams.get("tab") as FinanceTab) || "EXPENSES";
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "ONLINE"
  >("CASH");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  const { user } = useAuth();
  const isReadOnly = user?.role === "OPERATOR";

  const handleTabChange = (tab: FinanceTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === "EXPENSES" ? "/expenses" : "/income";
      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (categoryFilter !== "ALL") params.category = categoryFilter;

      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) {
      console.error(`Failed to fetch ${activeTab.toLowerCase()}`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentAccounts = async () => {
    try {
      const res = await api.get("/accounting/payment-accounts");
      setPaymentAccounts(res.data);
    } catch (err) {
      console.error("Failed to fetch payment accounts", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPaymentAccounts();
  }, [activeTab, dateRange, categoryFilter]);

  useEffect(() => {
    // Sync active tab with URL on initial load or back/forward
    const tabFromUrl = searchParams.get("tab") as FinanceTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Set default category when tab changes
    setCategory(activeTab === "EXPENSES" ? "OPERATIONAL" : "RENT");
    setCategoryFilter("ALL");
  }, [activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const endpoint = activeTab === "EXPENSES" ? "/expenses" : "/income";
      await api.post(endpoint, {
        title,
        amount: Number(amount),
        category,
        description,
        date: new Date(date),
        paymentMethod,
        paymentAccountId:
          paymentMethod !== "CASH" ? selectedAccountId : undefined,
      });
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    setError("");
    try {
      const endpoint = activeTab === "EXPENSES" ? "/expenses" : "/income";
      await api.delete(`${endpoint}/${deletingItem.id}`);
      setShowDeleteModal(false);
      setDeletingItem(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory(activeTab === "EXPENSES" ? "OPERATIONAL" : "RENT");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("CASH");
    setSelectedAccountId("");
  };

  const filteredData = data.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = filteredData.reduce(
    (acc, item) => {
      const amount = Number(item.amount);
      acc.total += amount;

      const paymentType =
        item.transaction?.paymentAccount?.type ||
        (activeTab === "EXPENSES"
          ? item.transaction?.creditAccount?.code === "10101"
            ? "CASH"
            : ""
          : item.transaction?.debitAccount?.code === "10101"
            ? "CASH"
            : "");

      if (paymentType === "CASH") acc.cash += amount;
      else if (paymentType === "CARD") acc.card += amount;
      else if (paymentType === "ONLINE") acc.online += amount;
      else acc.other += amount;

      return acc;
    },
    { total: 0, cash: 0, card: 0, online: 0, other: 0 },
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Finance Management
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Wallet size={16} />
              Manage your business cash flow
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className={cn(
                "px-5 py-3 rounded-xl text-white font-bold transition-all flex items-center gap-2 shadow-lg",
                activeTab === "EXPENSES"
                  ? "bg-red-600 hover:bg-red-500 shadow-red-900/20"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20",
              )}
            >
              <Plus size={18} />
              Record {activeTab === "EXPENSES" ? "Expense" : "Income"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-fit">
          {[
            {
              id: "EXPENSES",
              label: "Expenses",
              icon: ArrowDownCircle,
              color: "text-red-500",
            },
            {
              id: "INCOME",
              label: "Income",
              icon: ArrowUpCircle,
              color: "text-emerald-500",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as FinanceTab)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-zinc-800 text-zinc-100 shadow-xl border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <tab.icon
                size={16}
                className={cn(
                  activeTab === tab.id ? tab.color : "text-zinc-600",
                )}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-wrap items-center gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800">
              <Calendar size={16} className="text-zinc-500" />
              <input
                type="date"
                className="bg-transparent text-xs text-zinc-300 outline-none w-28"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
              <span className="text-zinc-700 font-bold">to</span>
              <input
                type="date"
                className="bg-transparent text-xs text-zinc-300 outline-none w-28"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"
            >
              <option value="ALL">All Categories</option>
              {activeTab === "EXPENSES" ? (
                <>
                  <option value="OPERATIONAL">Operational</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SALARY">Salary</option>
                  <option value="UTILITY">Utility</option>
                  <option value="OTHER">Other Expense</option>
                </>
              ) : (
                <>
                  <option value="RENT">Rent Income</option>
                  <option value="SERVICE">Service Income</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="OTHER">Other Income</option>
                </>
              )}
            </select>

            {(dateRange.start || dateRange.end || categoryFilter !== "ALL") && (
              <button
                onClick={() => {
                  setDateRange({ start: "", end: "" });
                  setCategoryFilter("ALL");
                }}
                className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="lg:col-span-4 flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
            <Search className="text-zinc-500 ml-3" size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              className="bg-transparent border-none outline-none text-zinc-200 w-full placeholder:text-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Card */}
        <div
          className={cn(
            "p-6 rounded-3xl border flex flex-col lg:flex-row items-center justify-between gap-6",
            activeTab === "EXPENSES"
              ? "bg-red-500/5 border-red-500/10"
              : "bg-emerald-500/5 border-emerald-500/10",
          )}
        >
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div
              className={cn(
                "p-4 rounded-2xl",
                activeTab === "EXPENSES"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-emerald-500/10 text-emerald-500",
              )}
            >
              <Wallet size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
                Total {activeTab === "EXPENSES" ? "Expenses" : "Income"}
              </p>
              <p
                className={cn(
                  "text-4xl font-black font-mono",
                  activeTab === "EXPENSES"
                    ? "text-red-400"
                    : "text-emerald-400",
                )}
              >
                Rs. {stats.total.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="hidden lg:block h-12 w-px bg-zinc-800" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:w-auto">
            <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Banknote size={14} />
                <span className="text-[10px] font-bold uppercase">Cash</span>
              </div>
              <p className="text-sm font-bold text-zinc-100 font-mono">
                Rs. {stats.cash.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <CreditCard size={14} />
                <span className="text-[10px] font-bold uppercase">Card</span>
              </div>
              <p className="text-sm font-bold text-zinc-100 font-mono">
                Rs. {stats.card.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Smartphone size={14} />
                <span className="text-[10px] font-bold uppercase">Online</span>
              </div>
              <p className="text-sm font-bold text-zinc-100 font-mono">
                Rs. {stats.online.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <FileText size={14} />
                <span className="text-[10px] font-bold uppercase">Items</span>
              </div>
              <p className="text-sm font-bold text-zinc-100">
                {filteredData.length}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No records found for the selected criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="group p-6 rounded-3xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:bg-zinc-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={cn(
                        "p-3 rounded-2xl border",
                        activeTab === "EXPENSES"
                          ? "bg-red-500/5 border-red-500/10 text-red-500"
                          : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500",
                      )}
                    >
                      {activeTab === "EXPENSES" ? (
                        <ArrowDownCircle size={24} />
                      ) : (
                        <ArrowUpCircle size={24} />
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-100 mb-2 truncate">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {item.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-t border-zinc-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">
                        Payment via
                      </span>
                      <span className="text-xs font-semibold text-zinc-300">
                        {item.transaction?.paymentAccount?.name ||
                          (item.transaction?.creditAccount?.code === "10101"
                            ? "Cash"
                            : "Bank")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">
                        Amount
                      </span>
                      <p
                        className={cn(
                          "text-xl font-black font-mono",
                          activeTab === "EXPENSES"
                            ? "text-red-400"
                            : "text-emerald-400",
                        )}
                      >
                        {activeTab === "EXPENSES" ? "-" : "+"} Rs.{" "}
                        {Number(item.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                    <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase">
                      <Calendar size={12} />
                      {new Date(item.date).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          setDeletingItem(item);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-900/50 transition-all"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div
                className={cn(
                  "absolute top-0 left-0 w-full h-2",
                  activeTab === "EXPENSES" ? "bg-red-600" : "bg-emerald-600",
                )}
              />

              <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                Record New {activeTab === "EXPENSES" ? "Expense" : "Income"}
              </h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Title
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500"
                    placeholder="Enter short title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                        Rs.
                      </span>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-zinc-200 outline-none focus:border-zinc-500 font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500"
                  >
                    {activeTab === "EXPENSES" ? (
                      <>
                        <option value="OPERATIONAL">Operational</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="SALARY">Salary</option>
                        <option value="UTILITY">Utility</option>
                        <option value="OTHER">Other Expense</option>
                      </>
                    ) : (
                      <>
                        <option value="RENT">Rent Income</option>
                        <option value="SERVICE">Service Income</option>
                        <option value="COMMISSION">Commission</option>
                        <option value="OTHER">Other Income</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500 min-h-[80px]"
                    placeholder="Details about this record..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "CASH", label: "Cash", icon: Banknote },
                      { id: "CARD", label: "Card", icon: CreditCard },
                      { id: "ONLINE", label: "Online", icon: Smartphone },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                          paymentMethod === m.id
                            ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700",
                        )}
                      >
                        <m.icon size={18} />
                        <span className="text-[10px] font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Select Account
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500"
                    >
                      <option value="">Choose Account</option>
                      {paymentAccounts
                        .filter((acc) => acc.type === paymentMethod)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                            {acc.accountNumber ? ` (${acc.accountNumber})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm font-bold">{error}</p>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (paymentMethod !== "CASH" && !selectedAccountId)
                    }
                    className={cn(
                      "flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50",
                      activeTab === "EXPENSES"
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-emerald-600 hover:bg-emerald-500",
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto text-white" />
                    ) : (
                      "Save Record"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2 text-center">
                Delete Record?
              </h2>
              <p className="text-zinc-400 text-sm mb-6 text-center">
                Are you sure you want to delete{" "}
                <span className="text-zinc-200 font-bold">
                  {deletingItem.title}
                </span>
                ? This will reverse all related accounting entries.
              </p>

              {error && (
                <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingItem(null);
                    setError("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
