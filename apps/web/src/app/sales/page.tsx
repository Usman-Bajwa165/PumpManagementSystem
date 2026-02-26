"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  CreditCard,
  Banknote,
  Plus,
  AlertCircle,
  Loader2,
  Smartphone,
  Globe,
  Fuel,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";

export default function SalesPage() {
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [selectedNozzle, setSelectedNozzle] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "ONLINE" | "CREDIT"
  >("CASH");
  const [customerName, setCustomerName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);
  const [pricePerLiter, setPricePerLiter] = useState(0);
  const [availableStock, setAvailableStock] = useState(0);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [isCreditPayment, setIsCreditPayment] = useState(false);
  const [creditCustomers, setCreditCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [maxPayable, setMaxPayable] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [regularCustomerSearch, setRegularCustomerSearch] = useState("");
  const [showRegularCustomerDropdown, setShowRegularCustomerDropdown] = useState(false);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const [regularSelectedDropdownIndex, setRegularSelectedDropdownIndex] = useState(-1);
  const toast = useToast();

  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const nozzleRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const paymentMethodRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const accountRef = useRef<HTMLSelectElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const vehicleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
        setShowRegularCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [isCreditPayment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        setIsCreditPayment((prev) => !prev);
        setTimeout(() => firstFieldRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const checkShift = async () => {
      try {
        const [shiftRes, nozzlesRes, accountsRes, creditRes] =
          await Promise.all([
            api.get("/shifts/current"),
            api.get("/inventory/nozzles"),
            api.get("/payment-accounts"),
            api.get("/sales/credit-customers"),
          ]);
        setShiftOpen(!!shiftRes.data);
        setNozzles(nozzlesRes.data);
        setPaymentAccounts(accountsRes.data);
        setCreditCustomers(creditRes.data);
      } catch (err) {
        setShiftOpen(false);
      } finally {
        setCheckingShift(false);
      }
    };
    checkShift();
  }, []);

  useEffect(() => {
    if (selectedNozzle) {
      const nozzle = nozzles.find((n) => n.id === selectedNozzle);
      if (nozzle?.tank?.product?.sellingPrice) {
        setPricePerLiter(Number(nozzle.tank.product.sellingPrice));
        setAvailableStock(Number(nozzle.tank.currentStock));
      }
    }
  }, [selectedNozzle, nozzles]);

  useEffect(() => {
    const qty = Number(quantity);
    if (qty > 0 && availableStock > 0) {
      setShowStockWarning(qty > availableStock);
    } else {
      setShowStockWarning(false);
    }
  }, [quantity, availableStock]);

  useEffect(() => {
    if (amount && pricePerLiter > 0 && !quantity && !isCreditPayment) {
      const calculatedQuantity = (Number(amount) / pricePerLiter).toFixed(2);
      setQuantity(calculatedQuantity);
    }
  }, [amount, pricePerLiter, isCreditPayment]);

  useEffect(() => {
    if (quantity && pricePerLiter > 0 && !amount) {
      const calculatedAmount = (Number(quantity) * pricePerLiter).toFixed(2);
      setAmount(calculatedAmount);
    }
  }, [quantity, pricePerLiter]);

  useEffect(() => {
    if (selectedCustomer) {
      const customer = creditCustomers.find((c) => c.name === selectedCustomer);
      if (customer) {
        setMaxPayable(customer.amount);
        setAmount(customer.amount.toFixed(2));
      }
    } else {
      setMaxPayable(0);
    }
  }, [selectedCustomer, creditCustomers]);

  useEffect(() => {
    if (vehicleNumber && paymentMethod === "CREDIT") {
      const match = creditCustomers.find((c) => c.vehicle === vehicleNumber);
      if (match && !customerName) {
        setCustomerName(match.name);
      }
    }
  }, [vehicleNumber, paymentMethod, creditCustomers, customerName]);

  const handleUseAvailable = () => {
    setQuantity(availableStock.toFixed(2));
    setAmount((availableStock * pricePerLiter).toFixed(2));
    setShowStockWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreditPayment) {
      if (!selectedCustomer) {
        toast.warning("Customer Required", "Please select a customer");
        return;
      }
      if (Number(amount) > maxPayable) {
        toast.warning("Amount Exceeds", `Maximum payable is Rs. ${maxPayable}`);
        return;
      }
      setIsLoading(true);
      try {
        await api.post("/sales/clear-credit", {
          customerName: selectedCustomer,
          amount: Number(amount),
          paymentMethod,
          paymentAccountId: selectedAccount || undefined,
        });
        toast.success("Credit Cleared", "Payment recorded successfully!");
        setAmount("");
        setSelectedCustomer("");
        setSelectedAccount("");
        setIsCreditPayment(false);
        const creditRes = await api.get("/sales/credit-customers");
        setCreditCustomers(creditRes.data);
      } catch (err: any) {
        toast.error(
          "Failed",
          err.response?.data?.message || "Failed to clear credit",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedNozzle) {
      toast.warning("Nozzle Required", "Please select a nozzle");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.warning("Amount Required", "Please enter a valid amount");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      toast.warning("Quantity Required", "Please enter a valid quantity");
      return;
    }

    if (paymentMethod === "CREDIT" && (!customerName || !vehicleNumber || !customerContact)) {
      toast.warning(
        "Details Required",
        "Customer name, vehicle number, and contact required for credit",
      );
      return;
    }

    if (
      (paymentMethod === "CARD" || paymentMethod === "ONLINE") &&
      !customerName
    ) {
      toast.warning(
        "Name Required",
        "Sender name is required for card/online payment",
      );
      return;
    }

    if (
      (paymentMethod === "CARD" || paymentMethod === "ONLINE") &&
      !selectedAccount
    ) {
      toast.warning("Account Required", "Please select payment account");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/sales", {
        nozzleId: selectedNozzle,
        amount: Number(amount),
        quantity: Number(quantity),
        paymentMethod,
        paymentAccountId: selectedAccount || undefined,
        customerName: customerName || undefined,
        vehicleNumber: vehicleNumber || undefined,
        customerContact: customerContact || undefined,
        customerEmail: customerEmail || undefined,
        description,
      });
      toast.success("Sale Recorded", "Transaction completed successfully!");
      const [nozzlesRes, creditRes] = await Promise.all([
        api.get("/inventory/nozzles"),
        api.get("/sales/credit-customers"),
      ]);
      setNozzles(nozzlesRes.data);
      setCreditCustomers(creditRes.data);
      setAmount("");
      setQuantity("");
      setCustomerName("");
      setVehicleNumber("");
      setCustomerContact("");
      setCustomerEmail("");
      setSelectedAccount("");
      setDescription("");
      setSelectedNozzle("");
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    } catch (err: any) {
      toast.error(
        "Failed",
        err.response?.data?.message || "Failed to record sale",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingShift) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-red-600 w-12 h-12" />
        </div>
      </DashboardLayout>
    );
  }

  const selectedNozzleData = nozzles.find((n) => n.id === selectedNozzle);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Record Sale
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Receipt size={16} />
              New Transaction Entry
            </p>
          </div>
          {shiftOpen && (
            <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Shift Active
            </div>
          )}
        </div>

        {!shiftOpen ? (
          <div className="p-12 rounded-3xl border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-500 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="p-4 rounded-full bg-amber-500/10">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="font-bold text-2xl text-amber-400">
                Shift Not Started
              </h2>
              <p className="opacity-80 max-w-md mx-auto">
                You must start a new shift before you can begin recording sales
                transactions.
              </p>
            </div>
            <a
              href="/shifts"
              className="px-8 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
            >
              Start Shift Now
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-2xl space-y-8"
          >
            {/* Header / Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-200">
                  Transaction Details
                </h3>
                <p className="text-xs text-zinc-500">
                  Enter sale information below
                </p>
              </div>
              <div className="flex items-center gap-3 bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreditPayment(false);
                    setAmount("");
                    setSelectedCustomer("");
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!isCreditPayment ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Regular Sale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreditPayment(true);
                    setAmount("");
                    setSelectedCustomer("");
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isCreditPayment ? "bg-red-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Clear Credit
                </button>
              </div>
            </div>

            {isCreditPayment ? (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Select Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative customer-dropdown">
                    <input
                      ref={firstFieldRef as any}
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        setSelectedDropdownIndex(-1);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onKeyDown={(e) => {
                        if (!showCustomerDropdown) return;
                        const filteredCustomers = customerSearch
                          ? creditCustomers.filter((c) =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase())
                            )
                          : creditCustomers;
                        
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedDropdownIndex((prev) =>
                            prev < filteredCustomers.length - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedDropdownIndex((prev) => (prev > -1 ? prev - 1 : -1));
                        } else if (e.key === "Enter" && selectedDropdownIndex >= 0) {
                          e.preventDefault();
                          const selected = filteredCustomers[selectedDropdownIndex];
                          setSelectedCustomer(selected.name);
                          setCustomerSearch(selected.name);
                          setShowCustomerDropdown(false);
                          setSelectedDropdownIndex(-1);
                          amountRef.current?.focus();
                        }
                      }}
                      placeholder="Search customer..."
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600"
                    />
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
                        {(customerSearch
                          ? creditCustomers.filter((c) =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase())
                            )
                          : creditCustomers
                        ).map((c, idx) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c.name);
                              setCustomerSearch(c.name);
                              setShowCustomerDropdown(false);
                              setSelectedDropdownIndex(-1);
                              amountRef.current?.focus();
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-zinc-800 text-zinc-300 text-sm border-b border-zinc-800 last:border-0",
                              selectedDropdownIndex === idx && "bg-zinc-800"
                            )}
                          >
                            {c.name} - Remaining: Rs. {c.amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Payment Amount (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                      Rs.
                    </span>
                    <input
                      ref={amountRef}
                      required
                      type="number"
                      step="any"
                      max={maxPayable}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitRef.current?.click();
                        }
                      }}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-xl font-bold text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-700"
                      placeholder="0.00"
                      disabled={!selectedCustomer}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "CASH", icon: Banknote, label: "Cash" },
                      { value: "CARD", icon: CreditCard, label: "Card" },
                      { value: "ONLINE", icon: Smartphone, label: "Online" },
                    ].map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                          paymentMethod === method.value
                            ? "border-red-600 bg-red-600 text-white shadow-lg"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800",
                        )}
                      >
                        <method.icon size={20} />
                        <span className="font-bold text-[10px] uppercase tracking-wider">
                          {method.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Select Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600 appearance-none"
                    >
                      <option value="">Choose Payout Account</option>
                      {paymentAccounts
                        .filter((acc) => acc.type === paymentMethod)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}{" "}
                            {acc.accountNumber ? `(${acc.accountNumber})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-left duration-300">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Select Nozzle <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Fuel
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                      size={18}
                    />
                    <select
                      ref={(el) => {
                        nozzleRef.current = el;
                        if (!isCreditPayment)
                          (firstFieldRef as any).current = el;
                      }}
                      required
                      value={selectedNozzle}
                      onChange={(e) => setSelectedNozzle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && selectedNozzle) {
                          e.preventDefault();
                          amountRef.current?.focus();
                        }
                      }}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600 appearance-none"
                    >
                      <option value="">Choose Dispensing Nozzle</option>
                      {nozzles.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} — {n.tank?.product?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedNozzleData && (
                    <div className="mt-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-wrap gap-4 text-sm animate-in fade-in slide-in-from-top-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-blue-400 font-bold">
                          Product
                        </span>
                        <span className="text-blue-100 font-medium">
                          {selectedNozzleData.tank?.product?.name}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-blue-500/20"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-blue-400 font-bold">
                          Price
                        </span>
                        <span className="text-blue-100 font-medium">
                          Rs. {pricePerLiter}/L
                        </span>
                      </div>
                      <div className="w-px h-8 bg-blue-500/20"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-blue-400 font-bold">
                          Stock
                        </span>
                        <span className="text-blue-100 font-medium">
                          {availableStock.toFixed(2)} L
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Amount (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={amountRef}
                      required
                      type="number"
                      step="any"
                      min="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setQuantity("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          quantityRef.current?.focus();
                        }
                      }}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-xl font-bold text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-700"
                      placeholder="0.00"
                      disabled={!selectedNozzle}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Quantity (L) <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={quantityRef}
                      required
                      type="number"
                      step="any"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setAmount("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          paymentMethodRefs.current[0]?.focus();
                        }
                      }}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-xl font-bold text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-700"
                      placeholder="0.00"
                      disabled={!selectedNozzle}
                    />
                  </div>
                </div>

                {showStockWarning && availableStock > 0 && (
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-pulse">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className="text-orange-500 flex-shrink-0 mt-0.5"
                        size={20}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-400">
                          Insufficient Stock
                        </p>
                        <p className="text-sm text-orange-500/80 mt-1">
                          Only {availableStock.toFixed(2)}L available (Rs.{" "}
                          {(availableStock * pricePerLiter).toFixed(2)})
                        </p>
                        <button
                          type="button"
                          onClick={handleUseAvailable}
                          className="mt-3 px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition-all shadow-lg"
                        >
                          Use Available Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Payment Method
                  </label>
                  <div
                    className="grid grid-cols-4 gap-3"
                    onKeyDown={(e) => {
                      const methods = ["CASH", "CARD", "ONLINE", "CREDIT"];
                      const currentIndex = methods.indexOf(paymentMethod);

                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % methods.length;
                        setPaymentMethod(methods[nextIndex] as any);
                        paymentMethodRefs.current[nextIndex]?.focus();
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        const prevIndex =
                          (currentIndex - 1 + methods.length) % methods.length;
                        setPaymentMethod(methods[prevIndex] as any);
                        paymentMethodRefs.current[prevIndex]?.focus();
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (
                          paymentMethod === "CARD" ||
                          paymentMethod === "ONLINE"
                        ) {
                          accountRef.current?.focus();
                        } else if (paymentMethod === "CREDIT") {
                          customerNameRef.current?.focus();
                        } else {
                          descriptionRef.current?.focus();
                        }
                      }
                    }}
                  >
                    {[
                      { value: "CASH", icon: Banknote, label: "Cash" },
                      { value: "CARD", icon: CreditCard, label: "Card" },
                      { value: "ONLINE", icon: Smartphone, label: "Online" },
                      { value: "CREDIT", icon: Globe, label: "Credit" },
                    ].map((method, index) => (
                      <button
                        key={method.value}
                        ref={(el) => {
                          if (el) paymentMethodRefs.current[index] = el;
                        }}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                          paymentMethod === method.value
                            ? "border-red-600 bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transform scale-105"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-300",
                        )}
                      >
                        <method.icon size={20} />
                        <span className="font-bold text-[10px] uppercase tracking-wider">
                          {method.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Select Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={accountRef}
                      required
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && selectedAccount) {
                          e.preventDefault();
                          customerNameRef.current?.focus();
                        }
                      }}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600 appearance-none"
                    >
                      <option value="">Choose Payment Account</option>
                      {paymentAccounts
                        .filter((acc) => acc.type === paymentMethod)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}{" "}
                            {acc.accountNumber ? `(${acc.accountNumber})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {(paymentMethod === "CARD" ||
                  paymentMethod === "ONLINE" ||
                  paymentMethod === "CREDIT") && (
                  <div className="space-y-4 p-5 rounded-2xl bg-zinc-950/30 border border-zinc-800/50 animate-in fade-in slide-in-from-top-2">
                    {paymentMethod === "CREDIT" && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Existing Customer{" "}
                          <span className="text-zinc-700">(Optional)</span>
                        </label>
                        <div className="relative customer-dropdown">
                          <input
                            type="text"
                            value={regularCustomerSearch}
                            onChange={(e) => {
                              setRegularCustomerSearch(e.target.value);
                              setShowRegularCustomerDropdown(true);
                              setRegularSelectedDropdownIndex(-1);
                            }}
                            onFocus={() => setShowRegularCustomerDropdown(true)}
                            onKeyDown={(e) => {
                              if (!showRegularCustomerDropdown) return;
                              const filteredCustomers = regularCustomerSearch
                                ? creditCustomers.filter((c) =>
                                    c.name.toLowerCase().includes(regularCustomerSearch.toLowerCase())
                                  )
                                : creditCustomers;
                              const showNewCustomer = !regularCustomerSearch;
                              const totalOptions = showNewCustomer ? filteredCustomers.length + 1 : filteredCustomers.length;
                              
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setRegularSelectedDropdownIndex((prev) =>
                                  prev < totalOptions - 1 ? prev + 1 : prev
                                );
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setRegularSelectedDropdownIndex((prev) => (prev > 0 ? prev - 1 : 0));
                              } else if (e.key === "Enter" && regularSelectedDropdownIndex >= 0) {
                                e.preventDefault();
                                if (showNewCustomer && regularSelectedDropdownIndex === 0) {
                                  // New Customer selected
                                  setRegularCustomerSearch("New Customer");
                                  setShowRegularCustomerDropdown(false);
                                  setCustomerName("New Customer");
                                  setVehicleNumber("");
                                  setCustomerContact("");
                                  setCustomerEmail("");
                                  setRegularSelectedDropdownIndex(-1);
                                } else {
                                  const idx = showNewCustomer ? regularSelectedDropdownIndex - 1 : regularSelectedDropdownIndex;
                                  const selected = filteredCustomers[idx];
                                  setRegularCustomerSearch(selected.name);
                                  setShowRegularCustomerDropdown(false);
                                  setCustomerName("");
                                  setVehicleNumber("");
                                  setCustomerContact("");
                                  setCustomerEmail("");
                                  if (selected) {
                                    setCustomerName(selected.name);
                                    if (selected.vehicle) setVehicleNumber(selected.vehicle);
                                    if (selected.contact) setCustomerContact(selected.contact);
                                    if (selected.email) setCustomerEmail(selected.email);
                                  }
                                  setRegularSelectedDropdownIndex(-1);
                                }
                              }
                            }}
                            placeholder="Search or type new customer..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 focus:border-red-600 outline-none transition-all"
                          />
                          {showRegularCustomerDropdown && (
                            <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
                              {!regularCustomerSearch && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRegularCustomerSearch("New Customer");
                                    setShowRegularCustomerDropdown(false);
                                    setCustomerName("New Customer");
                                    setVehicleNumber("");
                                    setCustomerContact("");
                                    setCustomerEmail("");
                                    setRegularSelectedDropdownIndex(-1);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 hover:bg-zinc-800 text-emerald-400 text-sm border-b border-zinc-800 font-bold",
                                    regularSelectedDropdownIndex === 0 && "bg-zinc-800"
                                  )}
                                >
                                  + New Customer
                                </button>
                              )}
                              {(regularCustomerSearch
                                ? creditCustomers.filter((c) =>
                                    c.name.toLowerCase().includes(regularCustomerSearch.toLowerCase())
                                  )
                                : creditCustomers
                              ).map((c, idx) => (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => {
                                    setRegularCustomerSearch(c.name);
                                    setShowRegularCustomerDropdown(false);
                                    setCustomerName(c.name);
                                    if (c.vehicle) setVehicleNumber(c.vehicle);
                                    if (c.contact) setCustomerContact(c.contact);
                                    if (c.email) setCustomerEmail(c.email);
                                    setRegularSelectedDropdownIndex(-1);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 hover:bg-zinc-800 text-zinc-300 text-sm border-b border-zinc-800 last:border-0",
                                    regularSelectedDropdownIndex === (regularCustomerSearch ? idx : idx + 1) && "bg-zinc-800"
                                  )}
                                >
                                  {c.name} {c.vehicle ? `(${c.vehicle})` : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {paymentMethod === "CREDIT"
                          ? "Customer Name"
                          : "Sender Name"}{" "}
                        {(paymentMethod === "CREDIT" ||
                          paymentMethod === "CARD" ||
                          paymentMethod === "ONLINE") && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <input
                        ref={customerNameRef}
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            vehicleRef.current?.focus();
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-700"
                        placeholder={
                          paymentMethod === "CREDIT"
                            ? "Enter customer name"
                            : "Enter sender name"
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Vehicle Number{" "}
                        {paymentMethod === "CREDIT" && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <input
                        ref={vehicleRef}
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (paymentMethod === "CREDIT") {
                              document.getElementById("customerContact")?.focus();
                            } else {
                              descriptionRef.current?.focus();
                            }
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-700"
                        placeholder="e.g., ABC-123"
                      />
                    </div>
                    {paymentMethod === "CREDIT" && (
                      <>
                        <div className="space-y-3">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Contact Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="customerContact"
                            type="text"
                            value={customerContact}
                            onChange={(e) => setCustomerContact(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                document.getElementById("customerEmail")?.focus();
                              }
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-700"
                            placeholder="e.g., +92 300 1234567"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Email <span className="text-zinc-700">(Optional)</span>
                          </label>
                          <input
                            id="customerEmail"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                descriptionRef.current?.focus();
                              }
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-700"
                            placeholder="customer@example.com"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Description{" "}
                    <span className="text-zinc-700">(Optional)</span>
                  </label>
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitRef.current?.click();
                      }
                    }}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:border-red-600 outline-none h-24 resize-none placeholder:text-zinc-700"
                    placeholder="Vehicle number, customer name, notes..."
                  />
                </div>
              </div>
            )}

            <button
              ref={submitRef}
              type="submit"
              disabled={isLoading || (!isCreditPayment && !selectedNozzle)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg hover:to-red-400 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale shadow-lg shadow-red-900/20"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus size={24} />
              )}
              {isCreditPayment ? "Clear Credit Balance" : "Record Transaction"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
