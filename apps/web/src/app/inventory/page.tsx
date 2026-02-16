"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  Package,
  Droplet,
  Plus,
  History,
  AlertTriangle,
  ArrowDownCircle,
  BarChart,
  Loader2,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
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

  const fetchData = async () => {
    try {
      const res = await api.get("/inventory/tanks");
      console.log("Tanks fetched:", res.data);
      setTanks(res.data as Tank[]);
    } catch (err) {
      console.error("Failed to fetch tanks", err);
      setError("Failed to load tanks. Please check if tanks are configured.");
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
    const tank = tanks.find(t => t.id === selectedTank);
    if (tank) {
      const newTotal = Number(tank.currentStock) + Number(quantity);
      if (newTotal > tank.capacity) {
        setError(`Capacity: ${tank.capacity}L, Adding: ${quantity}L, Total: ${newTotal.toFixed(2)}L. Stock cannot exceed tank capacity!`);
        setIsSubmitting(false);
        return;
      }
    }
    try {
      await api.post("/inventory/purchase", {
        tankId: selectedTank,
        quantity: Number(quantity),
        cost: Number(cost),
        supplier,
      });
      setSuccess("Purchase recorded and stock updated!");
      setShowPurchaseModal(false);
      setCapacityWarning("");
      fetchData();
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
    const tank = tanks.find(t => t.id === selectedTank);
    if (tank && Number(dipReading) > tank.capacity) {
      setError(`Capacity: ${tank.capacity}L, Dip Reading: ${dipReading}L. Reading cannot exceed tank capacity!`);
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await api.post("/inventory/dip", {
        tankId: selectedTank,
        dipReading: Number(dipReading),
      });
      setSuccess(`Dip recorded! Variance: ${(res.data as any).variance}L`);
      setShowDipModal(false);
      setCapacityWarning("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record dip");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight italic">
              Inventory & Stock {isReadOnly && <span className="text-sm text-zinc-500">(View Only)</span>}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {isReadOnly ? "View real-time fuel levels." : "Monitor real-time fuel levels and record stock-in."}
            </p>
          </div>
          {!isReadOnly && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                setSelectedTank("");
                setDipReading("");
                setCapacityWarning("");
                setShowDipModal(true);
                setSuccess("");
                setError("");
              }}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-900 transition-all flex items-center gap-2"
            >
              <TrendingDown size={18} />
              Physical Dip
            </button>
            <button
              onClick={() => {
                setSelectedTank("");
                setQuantity("");
                setCost("");
                setSupplier("");
                setCapacityWarning("");
                setShowPurchaseModal(true);
                setSuccess("");
                setError("");
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
            >
              <Plus size={18} />
              Record Purchase
            </button>
          </div>
          )}
        </div>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-500 text-sm flex items-center gap-3 animate-in fade-in duration-500">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Tank Visualization */}
        {tanks.length === 0 ? (
          <div className="p-12 rounded-3xl border border-zinc-900 bg-zinc-900/30 text-center">
            <Package className="mx-auto text-zinc-700 mb-4" size={64} />
            <h3 className="text-xl font-bold text-zinc-300 mb-2">No Tanks Configured</h3>
            <p className="text-sm text-zinc-500">
              Please configure products and tanks in the system first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tanks.map((tank) => {
            const percentage = (tank.currentStock / tank.capacity) * 100;
            const isLow = percentage < 20;

            return (
              <div
                key={tank.id}
                className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm relative overflow-hidden group transition-all hover:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-100">
                      {tank.name}
                    </h3>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">
                      {tank.product?.name}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-zinc-950/50",
                      isLow ? "text-yellow-500" : "text-red-500",
                    )}
                  >
                    <Droplet size={20} />
                  </div>
                </div>

                {/* Visual Tank Gauge */}
                <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 mb-6 relative z-10">
                  <div
                    className={cn(
                      "h-full transition-all duration-1000",
                      isLow ? "bg-yellow-600" : "bg-red-600",
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <p className="text-3xl font-black text-zinc-100">
                      {tank.currentStock.toLocaleString()}L
                    </p>
                    <p className="text-xs text-zinc-500 font-bold mt-1 uppercase">
                      of {tank.capacity.toLocaleString()}L Total
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-xs font-black uppercase tracking-tighter",
                        isLow
                          ? "text-yellow-600 animate-pulse"
                          : "text-zinc-600",
                      )}
                    >
                      {isLow ? "Low Stock Alert" : "Stock Optimal"}
                    </p>
                  </div>
                </div>

                {/* Subtle background graphic */}
                <Package
                  className="absolute -bottom-6 -right-6 text-white/5 group-hover:text-white/10 transition-colors"
                  size={140}
                />
              </div>
            );
          })}
        </div>
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-zinc-100 mb-6 italic">
                Stock Purchase Entry
              </h2>
              <form onSubmit={handlePurchase} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Select Tank
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none"
                    value={selectedTank}
                    onChange={(e) => {
                      setSelectedTank(e.target.value);
                      const tank = tanks.find(t => t.id === e.target.value);
                      if (tank?.product?.purchasePrice) {
                        setPricePerLiter(Number(tank.product.purchasePrice));
                      }
                    }}
                  >
                    <option value="">Select Tank</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.product?.name}) - Rs. {t.product?.purchasePrice}/L
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Quantity (L)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        const tank = tanks.find(t => t.id === selectedTank);
                        if (tank && e.target.value) {
                          if (pricePerLiter > 0) {
                            setCost((Number(e.target.value) * pricePerLiter).toFixed(2));
                          }
                          const newTotal = Number(tank.currentStock) + Number(e.target.value);
                          if (newTotal > tank.capacity) {
                            setCapacityWarning(`Capacity: ${tank.capacity}L, Available: ${tank.currentStock}L, Purchasing: ${e.target.value}L, Total: ${newTotal.toFixed(2)}L. Cannot exceed capacity!`);
                          } else {
                            setCapacityWarning("");
                          }
                        } else {
                          setCapacityWarning("");
                        }
                      }}
                    />
                    {capacityWarning && (
                      <p className="text-xs text-orange-400 mt-1 font-semibold">{capacityWarning}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Total Cost (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none"
                      value={cost}
                      onChange={(e) => {
                        setCost(e.target.value);
                        const tank = tanks.find(t => t.id === selectedTank);
                        if (pricePerLiter > 0 && e.target.value && tank) {
                          const calculatedQty = Number(e.target.value) / pricePerLiter;
                          setQuantity(calculatedQty.toFixed(2));
                          const newTotal = Number(tank.currentStock) + calculatedQty;
                          if (newTotal > tank.capacity) {
                            setCapacityWarning(`Capacity: ${tank.capacity}L, Available: ${tank.currentStock}L, Purchasing: ${calculatedQty.toFixed(2)}L, Total: ${newTotal.toFixed(2)}L. Cannot exceed capacity!`);
                          } else {
                            setCapacityWarning("");
                          }
                        } else {
                          setCapacityWarning("");
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BS, Shell, PSO etc."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 font-bold hover:bg-zinc-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                    ) : (
                      "Record Stock In"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dip Modal */}
        {showDipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2 italic tracking-tight">
                Physical Stock Check
              </h2>
              <p className="text-xs text-zinc-500 mb-6 uppercase tracking-widest font-bold">
                Adjust system stock based on physical dip.
              </p>
              <form onSubmit={handleDip} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Select Tank
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none"
                    value={selectedTank}
                    onChange={(e) => setSelectedTank(e.target.value)}
                  >
                    <option value="">Select Tank</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.product?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Dip Reading (Actual Liters)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Enter current volume"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none h-16 text-2xl font-black text-center"
                    value={dipReading}
                    onChange={(e) => {
                      setDipReading(e.target.value);
                      const tank = tanks.find(t => t.id === selectedTank);
                      if (tank && Number(e.target.value) > tank.capacity) {
                        setCapacityWarning(`Capacity: ${tank.capacity}L, Reading: ${e.target.value}L. Cannot exceed capacity!`);
                      } else {
                        setCapacityWarning("");
                      }
                    }}
                  />
                  {capacityWarning && (
                    <p className="text-xs text-orange-400 mt-1 font-semibold text-center">{capacityWarning}</p>
                  )}
                </div>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowDipModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 font-bold hover:bg-zinc-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-zinc-100 text-black font-bold hover:bg-zinc-200 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-5 w-5 mx-auto text-black" />
                    ) : (
                      "Adjust Stock"
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
