"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  Package,
  Droplet,
  Plus,
  TrendingDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice?: number;
}

interface Tank {
  id: string;
  name: string;
  currentStock: number;
  capacity: number;
  product: Product;
}

export default function InventoryPage() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDipModal, setShowDipModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user } = useAuth();
  const isReadOnly = user?.role === "OPERATOR";

  // Form States
  const [selectedTank, setSelectedTank] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dipReading, setDipReading] = useState("");
  const [capacityWarning, setCapacityWarning] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState(0);

  /* State Updates */
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [paymentStatus, setPaymentStatus] = useState<
    "PAID" | "UNPAID" | "PARTIAL"
  >("UNPAID");
  const [paidAmount, setPaidAmount] = useState("");

  const fetchData = async () => {
    try {
      const [tanksRes, suppliersRes] = await Promise.all([
        api.get("/inventory/tanks"),
        api.get("/suppliers"),
      ]);
      setTanks(tanksRes.data as Tank[]);
      setSuppliers(suppliersRes.data as any[]);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validate Tank Capacity
    const tank = tanks.find((t) => t.id === selectedTank);
    if (tank) {
      const newTotal = Number(tank.currentStock) + Number(quantity);
      if (newTotal > tank.capacity) {
        setError(`Capacity Exceeded! Tank can only hold ${tank.capacity}L.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await api.post("/inventory/purchase", {
        tankId: selectedTank,
        quantity: Number(quantity),
        cost: Number(cost),
        supplierId: supplier, // Now using ID from select
        paymentStatus,
        paidAmount:
          paymentStatus === "PARTIAL" ? Number(paidAmount) : undefined,
      });
      setSuccess("Stock purchase recorded successfully!");
      setShowPurchaseModal(false);
      setCapacityWarning("");
      fetchData();
      // Reset form
      setQuantity("");
      setCost("");
      setSupplier("");
      setPaymentStatus("UNPAID");
      setPaidAmount("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await api.post("/inventory/dip", {
        tankId: selectedTank,
        dipReading: Number(dipReading),
      });
      setSuccess(
        `Dip recorded! Variance: ${(res.data as any).variance.toFixed(2)}L`,
      );
      setShowDipModal(false);
      setCapacityWarning("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record dip");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Inventory Management
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Droplet size={16} />
              Real-time stock tracking
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowDipModal(true)}
              className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-900 hover:text-white transition-all flex items-center gap-2"
            >
              <TrendingDown size={18} />
              Physical Dip
            </button>
            {!isReadOnly && (
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="px-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
              >
                <Plus size={18} />
                Purchase Stock
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-red-600 w-8 h-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            {tanks.map((tank) => (
              <div
                key={tank.id}
                className="group p-6 rounded-3xl border border-zinc-800 bg-zinc-950 hover:border-red-600/30 transition-all hover:bg-zinc-900/50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl -z-10 group-hover:bg-red-600/10 transition-colors" />

                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-400 group-hover:text-red-500 transition-colors">
                    <Package size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Current Stock
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-black font-mono",
                        Number(tank.currentStock) < tank.capacity * 0.2
                          ? "text-red-500"
                          : "text-zinc-100",
                      )}
                    >
                      {Number(tank.currentStock).toLocaleString()}{" "}
                      <span className="text-sm font-bold text-zinc-600">L</span>
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-zinc-100">
                      {tank.name}
                    </h3>
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        Number(tank.currentStock) < tank.capacity * 0.2
                          ? "bg-red-500/20 text-red-400 animate-pulse"
                          : Number(tank.currentStock) > tank.capacity * 0.8
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400",
                      )}
                    >
                      {(
                        (Number(tank.currentStock) / tank.capacity) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                  <p className="text-zinc-500 text-sm">{tank.product?.name}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden mb-3 border border-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 relative",
                      Number(tank.currentStock) < tank.capacity * 0.2
                        ? "bg-gradient-to-r from-red-900 to-red-600"
                        : Number(tank.currentStock) > tank.capacity * 0.8
                          ? "bg-gradient-to-r from-emerald-900 to-emerald-500"
                          : "bg-gradient-to-r from-amber-900 to-amber-500",
                    )}
                    style={{
                      width: `${Math.min((Number(tank.currentStock) / tank.capacity) * 100, 100)}%`,
                    }}
                  >
                    <div className="absolute right-0 top-0 h-full w-[2px] bg-white/50 shadow-[0_0_10px_white]"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-zinc-500">0L</span>
                  <span className="text-zinc-400 font-bold">
                    {Number(tank.currentStock).toLocaleString()}L /{" "}
                    {tank.capacity.toLocaleString()}L
                  </span>
                </div>
                {Number(tank.currentStock) < tank.capacity * 0.2 && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-xs text-red-400 font-medium">
                      Low Fuel Alert
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* ... Header ... */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-400" />

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-full bg-red-600/10 text-red-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">
                    Record Purchase
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    Add new stock from supplier
                  </p>
                </div>
              </div>

              <form onSubmit={handlePurchase} className="space-y-5">
                {/* Tank Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Select Tank <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 focus:bg-zinc-900/80 transition-all"
                    value={selectedTank}
                    onChange={(e) => {
                      setSelectedTank(e.target.value);
                      const tank = tanks.find((t) => t.id === e.target.value);
                      if (tank?.product?.purchasePrice) {
                        setPricePerLiter(Number(tank.product.purchasePrice));
                      }
                    }}
                  >
                    <option value="">Choose Tank...</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} • {t.product?.name} • Rs.{" "}
                        {t.product?.purchasePrice}/L
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 focus:bg-zinc-900/80 transition-all"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty & Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Quantity (L) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 transition-all font-mono"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        const tank = tanks.find((t) => t.id === selectedTank);
                        if (tank && e.target.value) {
                          if (pricePerLiter > 0) {
                            setCost(
                              (Number(e.target.value) * pricePerLiter).toFixed(
                                2,
                              ),
                            );
                          }
                          const newTotal =
                            Number(tank.currentStock) + Number(e.target.value);
                          if (newTotal > tank.capacity) {
                            setCapacityWarning("Capacity Exceeded!");
                          } else setCapacityWarning("");
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Total Cost <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                        Rs.
                      </span>
                      <input
                        type="number"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 transition-all font-mono"
                        value={cost}
                        onChange={(e) => {
                          setCost(e.target.value);
                          if (pricePerLiter > 0 && e.target.value) {
                            setQuantity(
                              (Number(e.target.value) / pricePerLiter).toFixed(
                                2,
                              ),
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {capacityWarning && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {capacityWarning}
                  </div>
                )}

                {/* Payment Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Payment Status
                    </label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 transition-all"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                    >
                      <option value="UNPAID">Unpaid (Credit)</option>
                      <option value="PAID">Paid (Cash)</option>
                      <option value="PARTIAL">Partial Payment</option>
                    </select>
                  </div>

                  {paymentStatus === "PARTIAL" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Paid Amount
                      </label>
                      <input
                        type="number"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-red-600 transition-all font-mono"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Amount Paid"
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-zinc-800 text-zinc-500 font-bold hover:bg-zinc-900 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Confirm Purchase"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dip Modal */}
        {showDipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-full bg-blue-600/10 text-blue-500">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">
                    Physical Dip
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    Calibrate system stock
                  </p>
                </div>
              </div>

              <form onSubmit={handleDip} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Target Tank
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-200 outline-none focus:border-blue-600 transition-all"
                    value={selectedTank}
                    onChange={(e) => setSelectedTank(e.target.value)}
                  >
                    <option value="">Select Tank...</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Dip Reading (Liters)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-6 text-3xl font-black text-center text-zinc-100 outline-none focus:border-blue-600 transition-all font-mono placeholder:text-zinc-800"
                    value={dipReading}
                    onChange={(e) => setDipReading(e.target.value)}
                  />
                  <p className="text-center text-xs text-zinc-600">
                    Enter the actual volume found in tank
                  </p>
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDipModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-zinc-800 text-zinc-500 font-bold hover:bg-zinc-900 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-xl bg-zinc-100 text-black font-bold hover:bg-white transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Update Stock"
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
