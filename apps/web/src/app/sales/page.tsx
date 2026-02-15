"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  CreditCard,
  Banknote,
  Plus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SalesPage() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CASH");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);

  useEffect(() => {
    const checkShift = async () => {
      try {
        const res = await api.get("/shifts/current");
        setShiftOpen(!!res.data);
      } catch (err) {
        setShiftOpen(false);
      } finally {
        setCheckingShift(false);
      }
    };
    checkShift();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      await api.post("/sales", {
        amount: Number(amount),
        paymentMethod,
        description,
      });
      setSuccess(true);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record sale");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingShift) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Record Sale
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Quickly enter cash or credit transaction.
          </p>
        </div>

        {!shiftOpen ? (
          <div className="p-8 rounded-2xl border border-yellow-600/20 bg-yellow-600/5 text-yellow-500 text-sm flex flex-col items-center gap-4 text-center">
            <AlertCircle size={32} />
            <div>
              <p className="font-bold text-lg">Shift Not Open</p>
              <p className="opacity-80">
                You must start a shift before recording sales.
              </p>
            </div>
            <a
              href="/shifts"
              className="px-6 py-2 rounded-full bg-yellow-600 text-white font-bold hover:bg-yellow-500 transition-all"
            >
              Go to Shifts
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm space-y-6"
          >
            {error && (
              <div className="p-4 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500 text-sm flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-500 text-sm flex items-center gap-3 animate-in zoom-in-95 duration-300">
                <CheckCircle2 size={18} />
                Sale recorded successfully and WhatsApp notification sent!
              </div>
            )}

            <div className="space-y-4">
              <label className="text-sm font-semibold text-zinc-400">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                    paymentMethod === "CASH"
                      ? "border-red-600 bg-red-600/10 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                  )}
                >
                  <Banknote size={24} />
                  <span className="font-bold tracking-tight">CASH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CREDIT")}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                    paymentMethod === "CREDIT"
                      ? "border-red-600 bg-red-600/10 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                  )}
                >
                  <CreditCard size={24} />
                  <span className="font-bold tracking-tight">CREDIT</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400">
                Sale Amount (Rs.)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500 pointer-events-none">
                  <Receipt size={18} />
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-zinc-100 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-zinc-800"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:border-red-600 outline-none transition-all h-24 resize-none placeholder:text-zinc-800"
                placeholder="Vehicle number, customer name, etc."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-500 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus size={24} />
              )}
              Record Transaction
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
