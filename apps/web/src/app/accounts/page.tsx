"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Plus, Trash2, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"CARD" | "ONLINE">("CARD");
  const [accountNumber, setAccountNumber] = useState("");
  const toast = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/payment-accounts");
      setAccounts(res.data);
    } catch (err) {
      toast.error("Failed", "Could not load accounts");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/payment-accounts", { name, type, accountNumber: accountNumber || undefined });
      toast.success("Created", "Account added successfully");
      setShowModal(false);
      setName("");
      setAccountNumber("");
      fetchAccounts();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Could not create account");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    try {
      await api.delete(`/payment-accounts/${id}`);
      toast.success("Deleted", "Account removed");
      fetchAccounts();
    } catch (err) {
      toast.error("Failed", "Could not delete account");
    }
  };

  const cardAccounts = accounts.filter((a) => a.type === "CARD");
  const onlineAccounts = accounts.filter((a) => a.type === "ONLINE");

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payment Accounts</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">Manage bank and online payment accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Account
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <CreditCard size={20} />
              <h2 className="font-bold">Card Accounts</h2>
            </div>
            {cardAccounts.length === 0 ? (
              <p className="text-sm text-zinc-500">No card accounts</p>
            ) : (
              <div className="space-y-2">
                {cardAccounts.map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{acc.name}</p>
                      {acc.accountNumber && <p className="text-sm text-zinc-500">{acc.accountNumber}</p>}
                    </div>
                    <button onClick={() => handleDelete(acc.id)} className="text-red-600 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Smartphone size={20} />
              <h2 className="font-bold">Online Accounts</h2>
            </div>
            {onlineAccounts.length === 0 ? (
              <p className="text-sm text-zinc-500">No online accounts</p>
            ) : (
              <div className="space-y-2">
                {onlineAccounts.map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{acc.name}</p>
                      {acc.accountNumber && <p className="text-sm text-zinc-500">{acc.accountNumber}</p>}
                    </div>
                    <button onClick={() => handleDelete(acc.id)} className="text-red-600 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Add Payment Account</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "CARD", icon: CreditCard, label: "Card" },
                    { value: "ONLINE", icon: Smartphone, label: "Online" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value as any)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        type === t.value
                          ? "border-red-600 bg-red-600/10 text-red-600"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                      }`}
                    >
                      <t.icon size={18} />
                      <span className="font-bold text-sm">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">Account Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                  placeholder="e.g., HBL Business Account"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">Account Number (Optional)</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                  placeholder="e.g., 1234567890"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
