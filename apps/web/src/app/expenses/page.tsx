"use client";

import React, { useState, useEffect } from "react";
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
  Edit,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  transaction?: {
    creditAccount: { code: string };
    paymentAccount?: { name: string; type: string };
  };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OPERATIONAL");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE'>('CASH');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  const { user } = useAuth();
  const isReadOnly = user?.role === "OPERATOR";

  const fetchExpenses = async () => {
    try {
      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      
      const res = await api.get("/expenses", { params });
      setExpenses(res.data);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
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
    fetchExpenses();
    fetchPaymentAccounts();
  }, [dateRange, categoryFilter]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/expenses", {
        title,
        amount: Number(amount),
        category,
        description,
        date: new Date(date),
        paymentMethod,
        paymentAccountId: paymentMethod !== 'CASH' ? selectedAccountId : undefined,
      });
      setShowAddModal(false);
      setTitle("");
      setAmount("");
      setCategory("OPERATIONAL");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod('CASH');
      setSelectedAccountId('');
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsSubmitting(true);
    setError("");
    try {
      await api.delete(`/expenses/${deletingExpense.id}`);
      setShowDeleteModal(false);
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate totals
  const totalExpense = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const cashExpense = filteredExpenses.filter(e => e.transaction?.creditAccount?.code === '10101').reduce((sum, e) => sum + Number(e.amount), 0);
  const cardExpense = filteredExpenses.filter(e => e.transaction?.creditAccount?.code === '10201' && e.transaction?.paymentAccount?.type === 'CARD').reduce((sum, e) => sum + Number(e.amount), 0);
  const onlineExpense = filteredExpenses.filter(e => e.transaction?.creditAccount?.code === '10201' && e.transaction?.paymentAccount?.type === 'ONLINE').reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Expense Tracking
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Wallet size={16} />
              Monitor operational costs
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              <Plus size={18} />
              Record Expense
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800">
          <div className="flex items-center gap-3 bg-zinc-950/50 px-4 py-2 rounded-2xl border border-zinc-800">
            <Calendar size={16} className="text-zinc-500" />
            <input
              type="date"
              className="bg-transparent text-xs text-zinc-300 outline-none w-28"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-zinc-700 font-bold">to</span>
            <input
              type="date"
              className="bg-transparent text-xs text-zinc-300 outline-none w-28"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Categories</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="SALARY">Salary</option>
            <option value="UTILITY">Utility</option>
            <option value="OTHER">Other</option>
          </select>

          {(dateRange.start || dateRange.end || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setDateRange({ start: "", end: "" });
                setCategoryFilter("ALL");
              }}
              className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Total Expenses</p>
            <p className="text-2xl font-black text-red-300 font-mono">Rs. {totalExpense.toLocaleString()}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">💵 Cash</p>
            <p className="text-xl font-black text-zinc-100 font-mono">Rs. {cashExpense.toLocaleString()}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">💳 Card</p>
            <p className="text-xl font-black text-zinc-100 font-mono">Rs. {cardExpense.toLocaleString()}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">📱 Online</p>
            <p className="text-xl font-black text-zinc-100 font-mono">Rs. {onlineExpense.toLocaleString()}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
          <Search className="text-zinc-500 ml-3" size={20} />
          <input
            type="text"
            placeholder="Search expenses..."
            className="bg-transparent border-none outline-none text-zinc-200 w-full placeholder:text-zinc-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-red-600 w-8 h-8" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
            <Wallet size={48} className="mx-auto mb-4 opacity-50" />
            <p>No expenses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="group p-6 rounded-3xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:bg-zinc-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-400">
                      <FileText size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-500 uppercase">
                      {expense.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-100 mb-2">
                    {expense.title}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                    {expense.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between border-t border-zinc-900 pt-4">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                      <Calendar size={14} />
                      {new Date(expense.date).toLocaleDateString()}
                    </div>
                    <p className="text-xl font-bold text-white font-mono">
                      Rs. {Number(expense.amount).toLocaleString()}
                    </p>
                  </div>

                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDeletingExpense(expense);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 text-xs font-bold hover:bg-red-900/20 hover:border-red-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && deletingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2 text-center">
                Delete Expense?
              </h2>
              <p className="text-zinc-400 text-sm mb-6 text-center">
                Delete <span className="text-zinc-200 font-bold">{deletingExpense.title}</span>? This will reverse all accounting entries.
              </p>

              {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingExpense(null);
                    setError("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExpense}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal - Same as before */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-400" />

              <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                Record New Expense
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Title</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600"
                    placeholder="Expense Title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">Rs.</span>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-zinc-200 outline-none focus:border-red-600 font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SALARY">Salary</option>
                    <option value="UTILITY">Utility</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600 min-h-[80px]"
                    placeholder="Details..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'CASH', label: 'Cash', icon: Banknote },
                      { id: 'CARD', label: 'Card', icon: CreditCard },
                      { id: 'ONLINE', label: 'Online', icon: Smartphone },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                          paymentMethod === m.id
                            ? "border-red-600 bg-red-600/10 text-red-500"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700",
                        )}
                      >
                        <m.icon size={18} />
                        <span className="text-[10px] font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === 'CARD' || paymentMethod === 'ONLINE') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Select Account</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600"
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

                {error && <p className="text-red-500 text-sm">{error}</p>}

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
                    disabled={isSubmitting || (paymentMethod !== 'CASH' && !selectedAccountId)}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
