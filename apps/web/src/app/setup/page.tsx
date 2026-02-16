"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Settings, Plus, Loader2, Trash2 } from "lucide-react";
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
  const isReadOnly = user?.role === "OPERATOR";

  const [productForm, setProductForm] = useState({ name: "", sellingPrice: "", purchasePrice: "" });
  const [tankForm, setTankForm] = useState({ name: "", capacity: "", productId: "", currentStock: "" });
  const [nozzleForm, setNozzleForm] = useState({ name: "", tankId: "", lastReading: "" });
  const [stockWarning, setStockWarning] = useState("");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");

  const productNameRef = useRef<HTMLInputElement>(null);
  const productPriceRef = useRef<HTMLInputElement>(null);
  const tankNameRef = useRef<HTMLInputElement>(null);
  const tankProductRef = useRef<HTMLSelectElement>(null);
  const tankCapacityRef = useRef<HTMLInputElement>(null);
  const tankStockRef = useRef<HTMLInputElement>(null);
  const nozzleNameRef = useRef<HTMLInputElement>(null);
  const nozzleTankRef = useRef<HTMLSelectElement>(null);
  const nozzleReadingRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "products") {
      productNameRef.current?.focus();
    } else if (activeTab === "tanks") {
      tankNameRef.current?.focus();
    } else if (activeTab === "nozzles") {
      nozzleNameRef.current?.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    // Focus first field on initial load
    productNameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        const tabs = ["products", "tanks", "nozzles"];
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, []);

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
        sellingPrice: parseFloat(productForm.sellingPrice),
        purchasePrice: parseFloat(productForm.purchasePrice),
      });
      toast.success("Product Created", `${productForm.name} added successfully`);
      setProductForm({ name: "", sellingPrice: "", purchasePrice: "" });
      fetchData();
      productNameRef.current?.focus();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create product");
    }
  };

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    const capacity = parseFloat(tankForm.capacity);
    const stock = parseFloat(tankForm.currentStock);
    if (stock > capacity) {
      toast.warning("Stock Exceeds Capacity", `Capacity: ${capacity}L, Stock: ${stock}L. Stock cannot exceed capacity.`);
      return;
    }
    try {
      await api.post("/inventory/tanks", {
        name: tankForm.name,
        capacity,
        currentStock: stock,
        productId: tankForm.productId,
      });
      toast.success("Tank Created", `${tankForm.name} added successfully`);
      setTankForm({ name: "", capacity: "", productId: "", currentStock: "" });
      setStockWarning("");
      fetchData();
      tankNameRef.current?.focus();
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
      nozzleNameRef.current?.focus();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create nozzle");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"?`)) return;
    try {
      await api.delete(`/inventory/products/${id}`);
      toast.success("Deleted", `${name} removed`);
      fetchData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Unable to delete");
    }
  };

  const handleDeleteTank = async (id: string, name: string) => {
    if (!confirm(`Delete tank "${name}"?`)) return;
    try {
      await api.delete(`/inventory/tanks/${id}`);
      toast.success("Deleted", `${name} removed`);
      fetchData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Unable to delete");
    }
  };

  const handleDeleteNozzle = async (id: string, name: string) => {
    if (!confirm(`Delete nozzle "${name}"?`)) return;
    try {
      await api.delete(`/inventory/nozzles/${id}`);
      toast.success("Deleted", `${name} removed`);
      fetchData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Unable to delete");
    }
  };

  const handleUpdatePrice = async (id: string, name: string) => {
    try {
      await api.patch(`/inventory/products/${id}`, { 
        sellingPrice: parseFloat(editSellingPrice),
        purchasePrice: parseFloat(editPurchasePrice),
      });
      toast.success("Prices Updated", `${name} prices updated successfully`);
      setEditingProduct(null);
      setEditSellingPrice("");
      setEditPurchasePrice("");
      fetchData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Unable to update prices");
    }
  };



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
            System Setup {isReadOnly && <span className="text-sm text-zinc-500">(View Only)</span>}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
            {isReadOnly ? "View products, tanks, and nozzles configuration." : "Configure products, tanks, and nozzles. Note: Nozzle readings are managed per shift, not here."}
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
            {!isReadOnly && (
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Product</h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Product Name
                  </label>
                  <input
                    ref={productNameRef}
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        productPriceRef.current?.focus();
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Petrol, Diesel, Hi-Octane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Selling Price per Liter (Rs.)
                  </label>
                  <input
                    ref={productPriceRef}
                    type="number"
                    step="0.01"
                    required
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Purchase Price per Liter (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
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
            )}

            <div className={`p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${isReadOnly ? 'lg:col-span-2' : ''}`}>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Products</h2>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-zinc-500">No products configured yet</p>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                        {editingProduct === p.id ? (
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-zinc-500 w-16">Selling:</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editSellingPrice}
                                onChange={(e) => setEditSellingPrice(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-zinc-500 w-16">Purchase:</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editPurchasePrice}
                                onChange={(e) => setEditPurchasePrice(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdatePrice(p.id, p.name)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(null);
                                  setEditSellingPrice("");
                                  setEditPurchasePrice("");
                                }}
                                className="px-2 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500">
                            <p>Selling: Rs. {p.sellingPrice}/L</p>
                            <p>Purchase: Rs. {p.purchasePrice}/L</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!editingProduct && !isReadOnly && (
                          <button
                            onClick={() => {
                              setEditingProduct(p.id);
                              setEditSellingPrice(p.sellingPrice.toString());
                              setEditPurchasePrice(p.purchasePrice.toString());
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                        )}
                        {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors"
                          disabled={editingProduct === p.id}
                        >
                          <Trash2 size={16} />
                        </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tanks" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {!isReadOnly && (
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Tank</h2>
              <form onSubmit={handleCreateTank} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Tank Name
                  </label>
                  <input
                    ref={tankNameRef}
                    type="text"
                    required
                    value={tankForm.name}
                    onChange={(e) => setTankForm({ ...tankForm, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        tankProductRef.current?.focus();
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Tank A, Tank 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Product
                  </label>
                  <select
                    ref={tankProductRef}
                    required
                    value={tankForm.productId}
                    onChange={(e) => setTankForm({ ...tankForm, productId: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tankForm.productId) {
                        e.preventDefault();
                        tankCapacityRef.current?.focus();
                      }
                    }}
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
                    ref={tankCapacityRef}
                    type="number"
                    required
                    value={tankForm.capacity}
                    onChange={(e) => setTankForm({ ...tankForm, capacity: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        tankStockRef.current?.focus();
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Current Stock (Liters)
                  </label>
                  <input
                    ref={tankStockRef}
                    type="number"
                    required
                    value={tankForm.currentStock}
                    onChange={(e) => {
                      setTankForm({ ...tankForm, currentStock: e.target.value });
                      const capacity = parseFloat(tankForm.capacity);
                      const stock = parseFloat(e.target.value);
                      if (stock > capacity && capacity > 0) {
                        setStockWarning(`Capacity: ${capacity}L, Stock: ${stock}L, Total: ${stock}L. Stock cannot exceed capacity!`);
                      } else {
                        setStockWarning("");
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                  {stockWarning && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">{stockWarning}</p>
                  )}
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
            )}

            <div className={`p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${isReadOnly ? 'lg:col-span-2' : ''}`}>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Tanks</h2>
              <div className="space-y-2">
                {tanks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tanks configured yet</p>
                ) : (
                  tanks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{t.name}</p>
                        <p className="text-sm text-zinc-500">
                          {t.product?.name} | {t.currentStock}/{t.capacity}L
                        </p>
                      </div>
                      {!isReadOnly && (
                      <button
                        onClick={() => handleDeleteTank(t.id, t.name)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "nozzles" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {!isReadOnly && (
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Add Nozzle</h2>
              <form onSubmit={handleCreateNozzle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Nozzle Name
                  </label>
                  <input
                    ref={nozzleNameRef}
                    type="text"
                    required
                    value={nozzleForm.name}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        nozzleTankRef.current?.focus();
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g., Nozzle 1, Pump A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Tank
                  </label>
                  <select
                    ref={nozzleTankRef}
                    required
                    value={nozzleForm.tankId}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, tankId: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nozzleForm.tankId) {
                        e.preventDefault();
                        nozzleReadingRef.current?.focus();
                      }
                    }}
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
                    ref={nozzleReadingRef}
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
            )}

            <div className={`p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${isReadOnly ? 'lg:col-span-2' : ''}`}>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Existing Nozzles</h2>
              <div className="space-y-2">
                {nozzles.length === 0 ? (
                  <p className="text-sm text-zinc-500">No nozzles configured yet</p>
                ) : (
                  nozzles.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{n.name}</p>
                        <p className="text-sm text-zinc-500">
                          {n.tank?.name} | Reading: {n.lastReading}
                        </p>
                      </div>
                      {!isReadOnly && (
                      <button
                        onClick={() => handleDeleteNozzle(n.id, n.name)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
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
