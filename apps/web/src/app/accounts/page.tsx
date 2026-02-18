"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Plus,
  Trash2,
  CreditCard,
  Smartphone,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setName("");
    setAccountNumber("");
    setType("CARD");
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setName(account.name);
    setAccountNumber(account.accountNumber || "");
    setType(account.type);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      toast.error("Required", "Account Number is mandatory");
      return;
    }

    try {
      if (editingId) {
        await api.patch(`/payment-accounts/${editingId}`, {
          name,
          type,
          accountNumber,
        });
        toast.success("Updated", "Account updated successfully");
      } else {
        await api.post("/payment-accounts", { name, type, accountNumber });
        toast.success("Created", "Account added successfully");
      }
      fetchAccounts();
      resetForm();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Operation failed");
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
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              Payment Accounts
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              Manage your point-of-sale and digital payment endpoints
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-900/20 active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-100 pb-2 border-b border-zinc-800">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <CreditCard size={20} className="text-red-500" />
              </div>
              <h2 className="font-bold text-lg">Card Terminals</h2>
            </div>

            {cardAccounts.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-zinc-800 text-center">
                <p className="text-zinc-500 text-sm">
                  No card terminals configure
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cardAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="group p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all hover:border-zinc-700 flex items-center justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-zinc-200">{acc.name}</p>
                      <p className="text-xs font-mono text-zinc-500 bg-zinc-950/50 px-2 py-1 rounded w-fit">
                        {acc.accountNumber}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-950/30 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Online Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-100 pb-2 border-b border-zinc-800">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <Smartphone size={20} className="text-emerald-500" />
              </div>
              <h2 className="font-bold text-lg">Digital Wallets & Online</h2>
            </div>

            {onlineAccounts.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-zinc-800 text-center">
                <p className="text-zinc-500 text-sm">
                  No online accounts configured
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {onlineAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="group p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all hover:border-zinc-700 flex items-center justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-zinc-200">{acc.name}</p>
                      <p className="text-xs font-mono text-zinc-500 bg-zinc-950/50 px-2 py-1 rounded w-fit">
                        {acc.accountNumber}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-950/30 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-100">
                {editingId ? "Edit Account" : "Add Payment Account"}
              </h2>
              <button
                onClick={resetForm}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "CARD", icon: CreditCard, label: "Card Terminal" },
                    {
                      value: "ONLINE",
                      icon: Smartphone,
                      label: "Digital Wallet",
                    },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        type === t.value
                          ? "border-red-600 bg-red-600/10 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                          : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <t.icon size={24} />
                      <span className="font-bold text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Account Name *
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-zinc-700"
                    placeholder={
                      type === "CARD"
                        ? "e.g., HBL POS - Pump 1"
                        : "e.g., JazzCash Business"
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {type === "CARD"
                    ? "TID / Terminal ID *"
                    : "Account Number / IBAN *"}
                </label>
                <input
                  required
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-zinc-700 font-mono"
                  placeholder={
                    type === "CARD" ? "e.g., 8829102" : "e.g., 03001234567"
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingId ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
