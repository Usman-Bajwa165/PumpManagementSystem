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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "ONLINE" | "CREDIT">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
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
    firstFieldRef.current?.focus();
  }, [isCreditPayment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        setIsCreditPayment(prev => !prev);
        setTimeout(() => firstFieldRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const checkShift = async () => {
      try {
        const [shiftRes, nozzlesRes, accountsRes, creditRes] = await Promise.all([
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
      if (nozzle?.tank?.product?.price) {
        setPricePerLiter(Number(nozzle.tank.product.price));
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
        });
        toast.success("Credit Cleared", "Payment recorded successfully!");
        setAmount("");
        setSelectedCustomer("");
        setIsCreditPayment(false);
        const creditRes = await api.get("/sales/credit-customers");
        setCreditCustomers(creditRes.data);
      } catch (err: any) {
        toast.error("Failed", err.response?.data?.message || "Failed to clear credit");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedNozzle) {
      toast.warning("Nozzle Required", "Please select a nozzle");
      return;
    }

    if (paymentMethod === "CREDIT" && (!customerName || !vehicleNumber)) {
      toast.warning("Details Required", "Customer name and vehicle number required for credit");
      return;
    }

    if (paymentMethod === "ONLINE" && !customerName) {
      toast.warning("Name Required", "Sender name required for online transfer");
      return;
    }

    if ((paymentMethod === "CARD" || paymentMethod === "ONLINE") && !selectedAccount) {
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
      setSelectedAccount("");
      setDescription("");
      setSelectedNozzle("");
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Failed to record sale");
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

  const selectedNozzleData = nozzles.find((n) => n.id === selectedNozzle);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Record Sale
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
            Select nozzle and enter amount or quantity
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
            className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 backdrop-blur-sm space-y-6"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="creditPayment"
                checked={isCreditPayment}
                onChange={(e) => {
                  setIsCreditPayment(e.target.checked);
                  setSelectedCustomer("");
                  setAmount("");
                }}
                className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-red-600 focus:ring-red-600"
              />
              <label htmlFor="creditPayment" className="text-sm font-semibold text-zinc-700 dark:text-zinc-400 cursor-pointer">
                Clear Customer Credit
              </label>
            </div>

            {isCreditPayment ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                    Select Customer *
                  </label>
                  <select
                    ref={firstFieldRef}
                    required
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedCustomer) {
                        e.preventDefault();
                        amountRef.current?.focus();
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                  >
                    <option value="">Choose Customer</option>
                    {creditCustomers.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} - Rs. {c.amount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                    Payment Amount (Rs.) *
                  </label>
                  <input
                    ref={amountRef}
                    required
                    type="number"
                    step="any"
                    max={maxPayable}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitRef.current?.click();
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                    placeholder="0.00"
                    disabled={!selectedCustomer}
                  />
                  {selectedCustomer && (
                    <p className="text-xs text-zinc-500">Maximum: Rs. {maxPayable.toFixed(2)}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                    Select Nozzle
                  </label>
                  <select
                    ref={(el) => {
                      nozzleRef.current = el;
                      if (!isCreditPayment) (firstFieldRef as any).current = el;
                    }}
                    required
                    value={selectedNozzle}
                    onChange={(e) => setSelectedNozzle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedNozzle) {
                        e.preventDefault();
                        amountRef.current?.focus();
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                  >
                    <option value="">Choose Nozzle</option>
                    {nozzles.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} - {n.tank?.product?.name} (Rs. {n.tank?.product?.price}/L)
                      </option>
                    ))}
                  </select>
                  {selectedNozzleData && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 text-sm">
                      <p className="text-blue-700 dark:text-blue-400">
                        <strong>Tank:</strong> {selectedNozzleData.tank?.name} | 
                        <strong> Product:</strong> {selectedNozzleData.tank?.product?.name} | 
                        <strong> Price:</strong> Rs. {pricePerLiter}/L |
                        <strong> Available:</strong> {availableStock.toFixed(2)}L
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                      Amount (Rs.)
                    </label>
                    <input
                      ref={amountRef}
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setQuantity("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          quantityRef.current?.focus();
                        }
                      }}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                      placeholder="0.00"
                      disabled={!selectedNozzle}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                      Quantity (L)
                    </label>
                    <input
                      ref={quantityRef}
                      type="number"
                      step="any"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setAmount("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          paymentMethodRefs.current[0]?.focus();
                        }
                      }}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                      placeholder="0.00"
                      disabled={!selectedNozzle}
                    />
                  </div>
                </div>

                {showStockWarning && availableStock > 0 && (
                  <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                          Insufficient Stock
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                          Only {availableStock.toFixed(2)}L available (Rs. {(availableStock * pricePerLiter).toFixed(2)})
                        </p>
                        <button
                          type="button"
                          onClick={handleUseAvailable}
                          className="mt-3 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-all"
                        >
                          Use Available Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                    Payment Method
                  </label>
                  <div 
                    className="grid grid-cols-4 gap-3"
                    onKeyDown={(e) => {
                      const methods = ['CASH', 'CARD', 'ONLINE', 'CREDIT'];
                      const currentIndex = methods.indexOf(paymentMethod);
                      
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % methods.length;
                        setPaymentMethod(methods[nextIndex] as any);
                        paymentMethodRefs.current[nextIndex]?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + methods.length) % methods.length;
                        setPaymentMethod(methods[prevIndex] as any);
                        paymentMethodRefs.current[prevIndex]?.focus();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') {
                          accountRef.current?.focus();
                        } else if (paymentMethod === 'CREDIT') {
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
                        ref={(el) => (paymentMethodRefs.current[index] = el)}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                          paymentMethod === method.value
                            ? "border-red-600 bg-red-600/10 text-red-600"
                            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700",
                        )}
                      >
                        <method.icon size={20} />
                        <span className="font-bold text-xs">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE") && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                      Select Account *
                    </label>
                    <select
                      ref={accountRef}
                      required
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && selectedAccount) {
                          e.preventDefault();
                          if (paymentMethod === 'ONLINE') {
                            customerNameRef.current?.focus();
                          } else {
                            descriptionRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                    >
                      <option value="">Choose Account</option>
                      {paymentAccounts
                        .filter((acc) => acc.type === paymentMethod)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} {acc.accountNumber ? `(${acc.accountNumber})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {(paymentMethod === "CARD" || paymentMethod === "ONLINE" || paymentMethod === "CREDIT") && (
                  <div className="space-y-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900">
                    {paymentMethod === "CREDIT" && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                          Existing Customer (Optional)
                        </label>
                        <select
                          value={customerName}
                          onChange={(e) => {
                            const selected = creditCustomers.find((c) => c.name === e.target.value);
                            setCustomerName(e.target.value);
                            if (selected?.vehicle) setVehicleNumber(selected.vehicle);
                          }}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                        >
                          <option value="">New Customer</option>
                          {creditCustomers.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} {c.vehicle ? `(${c.vehicle})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                        {paymentMethod === "CREDIT" ? "Customer Name *" : "Sender Name"} {paymentMethod === "CARD" ? "(Optional)" : paymentMethod === "ONLINE" ? "*" : ""}
                      </label>
                      <input
                        ref={customerNameRef}
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            vehicleRef.current?.focus();
                          }
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                        placeholder={paymentMethod === "CREDIT" ? "Enter customer name" : "Enter sender name"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                        Vehicle Number {paymentMethod === "CREDIT" ? "*" : "(Optional)"}
                      </label>
                      <input
                        ref={vehicleRef}
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            descriptionRef.current?.focus();
                          }
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none"
                        placeholder="e.g., ABC-123"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">
                    Description (Optional)
                  </label>
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitRef.current?.click();
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none h-20 resize-none"
                    placeholder="Vehicle number, customer name, etc."
                  />
                </div>
              </>
            )}

            <button
              ref={submitRef}
              type="submit"
              disabled={isLoading || (!isCreditPayment && !selectedNozzle)}
              className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-500 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus size={24} />
              )}
              {isCreditPayment ? "Clear Credit" : "Record Sale"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
