"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  _count?: {
    debitTx: number;
    creditTx: number;
  };
}

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ASSET" as AccountType,
    balance: 0,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounting/accounts");
      setAccounts(res.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.put(`/accounting/accounts/${editingAccount.id}`, {
          name: formData.name,
          type: formData.type,
        });
      } else {
        await api.post("/accounting/accounts", formData);
      }
      setShowModal(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      alert(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string, code: string, name: string) => {
    if (!confirm(`Delete account ${code} - ${name}?`)) return;
    try {
      await api.delete(`/accounting/accounts/${id}`);
      fetchAccounts();
    } catch (error: any) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const handleResetBalance = async (id: string, code: string, name: string) => {
    if (!confirm(`Reset balance for ${code} - ${name} to zero?`)) return;
    try {
      await api.post(`/accounting/accounts/${id}/reset-balance`);
      fetchAccounts();
    } catch (error: any) {
      alert(error.response?.data?.message || "Reset failed");
    }
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      balance: account.balance,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({ code: "", name: "", type: "ASSET", balance: 0 });
  };

  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      if (!acc[account.type]) acc[account.type] = [];
      acc[account.type].push(account);
      return acc;
    },
    {} as Record<AccountType, Account[]>,
  );

  const typeColors = {
    ASSET: "bg-blue-500",
    LIABILITY: "bg-orange-500",
    EQUITY: "bg-purple-500",
    INCOME: "bg-emerald-500",
    EXPENSE: "bg-rose-500",
  };

  const codeRanges = {
    ASSET: "10000-19999",
    LIABILITY: "20000-29999",
    EQUITY: "30000-39999",
    INCOME: "40000-49999",
    EXPENSE: "50000-59999",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Chart of Accounts
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              Manage your accounting structure - {accounts.length} accounts
            </p>
          </div>
          {user?.role === "ADMIN" && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold transition-colors"
            >
              + Add Account
            </button>
          )}
        </div>

        {/* Accounts by Type */}
        {(
          ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as AccountType[]
        ).map((type) => {
          const typeAccounts = groupedAccounts[type] || [];
          if (typeAccounts.length === 0) return null;

          return (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn("w-1.5 h-8 rounded-full", typeColors[type])}
                />
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  {type}S
                </h2>
                <span className="text-sm text-zinc-600">
                  ({typeAccounts.length} accounts) • Code Range:{" "}
                  {codeRanges[type]}
                </span>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/95 uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4">Account Name</th>
                      <th className="px-6 py-4 text-right">Balance</th>
                      <th className="px-6 py-4 text-center">Transactions</th>
                      {user?.role === "ADMIN" && (
                        <th className="px-6 py-4 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {typeAccounts.map((account) => {
                      const txCount =
                        (account._count?.debitTx || 0) +
                        (account._count?.creditTx || 0);
                      return (
                        <tr
                          key={account.id}
                          className="hover:bg-zinc-100/[0.03] transition-all"
                        >
                          <td className="px-6 py-4 font-mono text-zinc-500 font-bold">
                            {account.code}
                          </td>
                          <td className="px-6 py-4 text-zinc-100 font-bold">
                            {account.name}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-zinc-300">
                            Rs. {account.balance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold">
                              {txCount}
                            </span>
                          </td>
                          {user?.role === "ADMIN" && (
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => openEditModal(account)}
                                className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold transition-colors"
                              >
                                Edit
                              </button>
                              {txCount === 0 && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleResetBalance(
                                        account.id,
                                        account.code,
                                        account.name,
                                      )
                                    }
                                    className="px-3 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        account.id,
                                        account.code,
                                        account.name,
                                      )
                                    }
                                    className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full border border-zinc-800">
            <h2 className="text-2xl font-black mb-6">
              {editingAccount ? "Edit Account" : "Add New Account"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingAccount && (
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">
                    Account Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., 10501"
                    pattern="\d{5}"
                    required
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    Must be 5 digits matching type range
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Petty Cash"
                  required
                  minLength={3}
                  maxLength={100}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as AccountType,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="ASSET">ASSET (10000-19999)</option>
                  <option value="LIABILITY">LIABILITY (20000-29999)</option>
                  <option value="EQUITY">EQUITY (30000-39999)</option>
                  <option value="INCOME">INCOME (40000-49999)</option>
                  <option value="EXPENSE">EXPENSE (50000-59999)</option>
                </select>
              </div>

              {!editingAccount && (
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        balance: parseFloat(e.target.value) || 0,
                      })
                    }
                    step="0.01"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors"
                >
                  {editingAccount ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
