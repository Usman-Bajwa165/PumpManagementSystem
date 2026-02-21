"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  Plus,
  Loader2,
  Search,
  Phone,
  Wallet,
  ArrowUpRight,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Supplier {
  id: string;
  name: string;
  contact: string;
  balance: number;
}

interface CreditCustomer {
  name: string;
  vehicle: string;
  amount: number;
}

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<"suppliers" | "credit">(
    "suppliers",
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [payAmount, setPayAmount] = useState("");

  const [selectedCreditCustomer, setSelectedCreditCustomer] =
    useState<CreditCustomer | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearAmount, setClearAmount] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "ONLINE"
  >("CASH");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  const { user } = useAuth();
  const router = useRouter();
  const isReadOnly = user?.role === "OPERATOR";

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/sales/credit-customers");
      setCreditCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch credit customers", err);
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
    fetchPaymentAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "suppliers") {
      fetchSuppliers();
    } else {
      fetchCreditCustomers();
    }
  }, [activeTab]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/suppliers", { name, contact });
      setShowAddModal(false);
      setName("");
      setContact("");
      fetchSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setIsSubmitting(true);
    setError("");
    try {
      await api.post(`/suppliers/${selectedSupplier.id}/pay`, {
        amount: parseFloat(payAmount),
        userId: user?.sub || "ADMIN",
        paymentMethod,
        paymentAccountId:
          paymentMethod !== "CASH" ? selectedAccountId : undefined,
      });
      setShowPayModal(false);
      fetchSuppliers();
      setPayAmount("");
      setPaymentMethod("CASH");
      setSelectedAccountId("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditCustomer) return;
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/sales/clear-credit", {
        customerName: selectedCreditCustomer.name,
        amount: parseFloat(clearAmount),
        paymentMethod,
        paymentAccountId:
          paymentMethod !== "CASH" ? selectedAccountId : undefined,
      });
      setShowClearModal(false);
      fetchCreditCustomers();
      setClearAmount("");
      setPaymentMethod("CASH");
      setSelectedAccountId("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clear credit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCreditCustomers = creditCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehicle?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Supplier Management
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Users size={16} />
              Manage vendors and payables
            </p>
          </div>

          {!isReadOnly && activeTab === "suppliers" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <Plus size={18} />
              Add Supplier
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab("suppliers")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "suppliers"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab("credit")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "credit"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            Credit Customers
          </button>
        </div>

        {/* Search & Stats */}
        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
          <Search className="text-zinc-500 ml-3" size={20} />
          <input
            type="text"
            placeholder={
              activeTab === "suppliers"
                ? "Search suppliers..."
                : "Search credit customers (name or vehicle)..."
            }
            className="bg-transparent border-none outline-none text-zinc-200 w-full placeholder:text-zinc-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
          </div>
        ) : activeTab === "suppliers" ? (
          filteredSuppliers.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No suppliers found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="group p-6 rounded-3xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:bg-zinc-900/50 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-400 group-hover:text-blue-400 transition-colors">
                        <Users size={24} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Payable Balance
                        </p>
                        <p
                          className={cn(
                            "text-xl font-bold font-mono",
                            supplier.balance > 0
                              ? "text-red-500"
                              : "text-emerald-500",
                          )}
                        >
                          Rs. {Number(supplier.balance).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 mb-1">
                      {supplier.name}
                    </h3>

                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                      <Phone size={14} />
                      {supplier.contact || "No contact info"}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setPayAmount(supplier.balance.toString());
                          setPaymentMethod("CASH");
                          setSelectedAccountId("");
                          setShowPayModal(true);
                        }}
                        className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Wallet size={16} />
                        Pay
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/reports?reportType=LEDGER&ledgerType=SUPPLIER&entityId=${supplier.id}`,
                          )
                        }
                        className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowUpRight size={16} />
                        Ledger
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredCreditCustomers.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No credit customers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreditCustomers.map((customer) => (
              <div
                key={customer.name}
                className="group p-6 rounded-3xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:bg-zinc-900/50 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 transition-colors">
                      <Users size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Credit Balance
                      </p>
                      <p
                        className={cn(
                          "text-xl font-bold font-mono",
                          customer.amount > 0
                            ? "text-orange-500"
                            : "text-emerald-500",
                        )}
                      >
                        Rs. {Number(customer.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-100 mb-1">
                    {customer.name}
                  </h3>

                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold">
                      Vehicle
                    </span>
                    {customer.vehicle || "N/A"}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCreditCustomer(customer);
                        setClearAmount(customer.amount.toString());
                        setShowClearModal(true);
                      }}
                      className="flex-1 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Wallet size={14} />
                      Clear Record
                    </button>
                    <button
                      onClick={() =>
                        router.push(
                          `/reports?reportType=LEDGER&ledgerType=CUSTOMER&entityId=${(customer as any).id}`,
                        )
                      }
                      className="flex-1 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight size={14} />
                      Ledger
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
              <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                Add New Supplier
              </h2>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Name
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-blue-600"
                    placeholder="Supplier Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Contact
                  </label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-blue-600"
                    placeholder="Phone / Email"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pay Modal */}
        {showPayModal && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                Pay Supplier
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                Processing payment for{" "}
                <span className="text-zinc-200 font-bold">
                  {selectedSupplier.name}
                </span>
              </p>

              <form onSubmit={handlePaySupplier} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                    Amount
                    <span className="text-rose-500 lowercase">
                      Balance: Rs.{" "}
                      {Number(selectedSupplier.balance).toLocaleString()}
                    </span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-blue-600 font-mono text-lg"
                    placeholder="Enter amount"
                  />
                </div>

                {(parseFloat(payAmount) || 0) >
                  Number(selectedSupplier.balance) && (
                  <p className="text-red-500 text-xs font-bold animate-pulse">
                    Error: Amount cannot exceed outstanding balance.
                  </p>
                )}

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "CASH", label: "Cash", icon: Banknote },
                      { id: "CARD", label: "Card", icon: CreditCard },
                      { id: "ONLINE", label: "Online", icon: Smartphone },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                          paymentMethod === m.id
                            ? "border-blue-600 bg-blue-600/10 text-blue-500"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700",
                        )}
                      >
                        <m.icon size={18} />
                        <span className="text-[10px] font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Select Account
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-blue-600 appearance-none"
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
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (parseFloat(payAmount) || 0) >
                        Number(selectedSupplier.balance) ||
                      (parseFloat(payAmount) || 0) <= 0 ||
                      (paymentMethod !== "CASH" && !selectedAccountId)
                    }
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Confirm Payment"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Clear Credit Modal */}
        {showClearModal && selectedCreditCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                Clear Credit Record
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                Processing payment for{" "}
                <span className="text-zinc-200 font-bold">
                  {selectedCreditCustomer.name}
                </span>
              </p>

              <form onSubmit={handleClearCredit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                    Amount
                    <span className="text-orange-500 lowercase">
                      Credit: Rs.{" "}
                      {Number(selectedCreditCustomer.amount).toLocaleString()}
                    </span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={clearAmount}
                    onChange={(e) => setClearAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-indigo-600 font-mono text-lg"
                    placeholder="Enter amount"
                  />
                </div>

                {(parseFloat(clearAmount) || 0) >
                  Number(selectedCreditCustomer.amount) && (
                  <p className="text-red-500 text-xs font-bold animate-pulse">
                    Error: Amount cannot exceed total credit balance.
                  </p>
                )}

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "CASH", label: "Cash", icon: Banknote },
                      { id: "CARD", label: "Card", icon: CreditCard },
                      { id: "ONLINE", label: "Online", icon: Smartphone },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                          paymentMethod === m.id
                            ? "border-indigo-600 bg-indigo-600/10 text-indigo-500"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700",
                        )}
                      >
                        <m.icon size={18} />
                        <span className="text-[10px] font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">
                      Select Account
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-indigo-600 appearance-none"
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
                    onClick={() => setShowClearModal(false)}
                    className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (parseFloat(clearAmount) || 0) >
                        Number(selectedCreditCustomer.amount) ||
                      (parseFloat(clearAmount) || 0) <= 0 ||
                      (paymentMethod !== "CASH" && !selectedAccountId)
                    }
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Clear Record"
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
