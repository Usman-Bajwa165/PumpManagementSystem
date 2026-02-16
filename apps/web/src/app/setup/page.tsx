"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Settings, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const toast = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [productForm, setProductForm] = useState({ name: "", price: "" });
  const [tankForm, setTankForm] = useState({ name: "", capacity: "", productId: "", currentStock: "" });
  const [nozzleForm, setNozzleForm] = useState({ name: "", tankId: "", lastReading: "" });

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.role !== "MANAGER") {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [productsRes, tanksRes, nozzlesRes] = await Promise.all([
        api.get("/inventory/products"),
        api.get("/inventory/tanks"),
        api.get("/inventory/nozzles"),
      ]);
      setProducts(productsRes.data);
      setTanks(tanksRes.data);
      setNozzles(nozzlesRes.data);
    } catch (err) {
      toast.error("Failed to Load", "Unable to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/inventory/products", {
        name: productForm.name,
        price: parseFloat(productForm.price),
      });
      toast.success("Product Created", `${productForm.name} added successfully`);
      setProductForm({ name: "", price: "" });
      fetchData();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create product");
    }
  };

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/inventory/tanks", {
        name: tankForm.name,
        capacity: parseFloat(tankForm.capacity),
        currentStock: parseFloat(tankForm.currentStock),
        productId: tankForm.productId,
      });
      toast.success("Tank Created", `${tankForm.name} added successfully`);
      setTankForm({ name: "", capacity: "", productId: "", currentStock: "" });
      fetchData();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create tank");
    }
  };

  const handleCreateNozzle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/inventory/nozzles", {
        name: nozzleForm.name,
        tankId: nozzleForm.tankId,
        lastReading: parseFloat(nozzleForm.lastReading),
      });
      toast.success("Nozzle Created", `${nozzleForm.name} added successfully`);
      setNozzleForm({ name: "", tankId: "", lastReading: "" });
      fetchData();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create nozzle");
    }
  };

  if (user?.role !== "ADMIN" && user?.role !== "MANAGER") {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-red-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight italic flex items-center gap-3">
            <Settings className="text-blue-500" />
            System Setup
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
            Configure products, tanks, and nozzles
          </p>
        </div>

        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          {["products", "tanks", "nozzles"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold capitalize transition-colors ${
                activeTab === tab
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Product</h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Petrol, Diesel, Hi-Octane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Price per Liter (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Product
                </button>
              </form>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Products</h2>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-zinc-500">No products configured yet</p>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                      <p className="text-sm text-zinc-500">Rs. {p.price}/L</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tanks" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Tank</h2>
              <form onSubmit={handleCreateTank} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Tank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tankForm.name}
                    onChange={(e) => setTankForm({ ...tankForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Tank A, Tank 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Product
                  </label>
                  <select
                    required
                    value={tankForm.productId}
                    onChange={(e) => setTankForm({ ...tankForm, productId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Capacity (Liters)
                  </label>
                  <input
                    type="number"
                    required
                    value={tankForm.capacity}
                    onChange={(e) => setTankForm({ ...tankForm, capacity: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Current Stock (Liters)
                  </label>
                  <input
                    type="number"
                    required
                    value={tankForm.currentStock}
                    onChange={(e) => setTankForm({ ...tankForm, currentStock: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Tank
                </button>
              </form>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Tanks</h2>
              <div className="space-y-2">
                {tanks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tanks configured yet</p>
                ) : (
                  tanks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{t.name}</p>
                      <p className="text-sm text-zinc-500">
                        {t.product?.name} | {t.currentStock}/{t.capacity}L
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "nozzles" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Nozzle</h2>
              <form onSubmit={handleCreateNozzle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Nozzle Name
                  </label>
                  <input
                    type="text"
                    required
                    value={nozzleForm.name}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Nozzle 1, Pump A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Tank
                  </label>
                  <select
                    required
                    value={nozzleForm.tankId}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, tankId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Select Tank</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.product?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Initial Reading
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nozzleForm.lastReading}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, lastReading: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Nozzle
                </button>
              </form>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Nozzles</h2>
              <div className="space-y-2">
                {nozzles.length === 0 ? (
                  <p className="text-sm text-zinc-500">No nozzles configured yet</p>
                ) : (
                  nozzles.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{n.name}</p>
                      <p className="text-sm text-zinc-500">
                        {n.tank?.name} | Reading: {n.lastReading}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
