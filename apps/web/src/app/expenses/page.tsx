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
  DollarSign,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OPERATIONAL");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { user } = useAuth();
  const isReadOnly = user?.role === "OPERATOR";

  const fetchExpenses = async () => {
    try {
      const res = await api.get("/expenses");
      setExpenses(res.data);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
      });
      setShowAddModal(false);
      // Reset form
      setTitle("");
      setAmount("");
      setCategory("OPERATIONAL");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);

      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-4">
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
            <p>No expenses recorded.</p>
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
                  <p className="text-zinc-500 text-sm mb-6 line-clamp-2">
                    {expense.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-end justify-between border-t border-zinc-900 pt-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                    <Calendar size={14} />
                    {new Date(expense.date).toLocaleDateString()}
                  </div>
                  <p className="text-xl font-bold text-white font-mono">
                    Rs. {Number(expense.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-400" />

              <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                Record New Expense
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Title
                  </label>
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
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-zinc-200 outline-none focus:border-red-600 font-mono"
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
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600"
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
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-red-600 min-h-[100px]"
                    placeholder="Details..."
                  />
                </div>

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
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-900/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Save Expense"
                    )}
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
