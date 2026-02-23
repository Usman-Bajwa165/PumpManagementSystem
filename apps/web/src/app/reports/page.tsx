"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Activity,
  Loader2,
  TrendingUp,
  TrendingDown,
  PieChart,
  Scale,
  ShoppingCart,
  Truck,
  BookOpen,
  FileText,
  Search,
  Calendar,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSearchParams, useRouter } from "next/navigation";

type ReportType = "PL" | "BS" | "SALES" | "PURCHASE" | "LEDGER" | "TRIAL";
type SalesViewMode =
  | "DAILY_SUMMARY"
  | "SHIFT_WISE"
  | "NOZZLE_WISE"
  | "NOZZLE_READINGS"
  | "DETAILED_SALES";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reportType, setReportType] = useState<ReportType>(
    (searchParams.get("reportType") as ReportType) || "PL",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Initialize dateRange from URL or default to last 30 days
  const [dateRange, setDateRange] = useState({
    start:
      searchParams.get("startDate") ||
      new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .split("T")[0],
    end: searchParams.get("endDate") || new Date().toISOString().split("T")[0],
  });

  const formatDate = (date: any) => {
    if (!date) return "---";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: any) => {
    if (!date) return "---";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const formatDateTime = (date: any) => {
    if (!date) return "---";
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const formatShiftName = (shift: any) => {
    if (!shift || !shift.startTime) return "Unknown";
    const date = new Date(shift.startTime);
    const hours = date.getHours();
    const period = hours < 12 ? "M" : "N";
    return `${formatDate(date)} ${period}`;
  };

  // Sales Specific States
  const [salesViewMode, setSalesViewMode] = useState<SalesViewMode>(
    (searchParams.get("salesViewMode") as SalesViewMode) || "DAILY_SUMMARY",
  );
  const [selectedShiftId, setSelectedShiftId] = useState(
    searchParams.get("shiftId") || "",
  );
  const [selectedNozzleId, setSelectedNozzleId] = useState(
    searchParams.get("nozzleId") || "",
  );
  const [selectedProductId, setSelectedProductId] = useState(
    searchParams.get("productId") || "",
  );
  const [selectedPaymentType, setSelectedPaymentType] = useState(
    searchParams.get("paymentType") || "ALL",
  );

  // Purchase Specific States
  const [purchaseSupplierId, setPurchaseSupplierId] = useState(
    searchParams.get("supplierId") || "",
  );
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState(
    searchParams.get("paymentStatus") || "ALL",
  );
  const [purchaseProductId, setPurchaseProductId] = useState(
    searchParams.get("purchaseProductId") || "",
  );

  // Ledger Specific States
  const [ledgerType, setLedgerType] = useState<"SUPPLIER" | "CUSTOMER">(
    (searchParams.get("ledgerType") as "SUPPLIER" | "CUSTOMER") || "SUPPLIER",
  );
  const [selectedEntityId, setSelectedEntityId] = useState(
    searchParams.get("entityId") || "",
  );
  const [showLogs, setShowLogs] = useState(
    searchParams.get("showLogs") === "true",
  );
  const [selectedMonth, setSelectedMonth] = useState(
    searchParams.get("month") || new Date().toISOString().slice(0, 7),
  );

  interface Shift {
    id: string;
    startTime: string;
    opener?: {
      username: string;
    };
  }
  interface Nozzle {
    id: string;
    name: string;
  }
  interface Product {
    id: string;
    name: string;
  }
  interface Supplier {
    id: string;
    name: string;
  }
  interface Customer {
    id: string;
    name: string;
  }

  // Metadata for filters
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // URL Synchronization
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("reportType", reportType);
    params.set("startDate", dateRange.start);
    params.set("endDate", dateRange.end);

    if (reportType === "SALES") {
      params.set("salesViewMode", salesViewMode);
      if (selectedShiftId) params.set("shiftId", selectedShiftId);
      if (selectedNozzleId) params.set("nozzleId", selectedNozzleId);
      if (selectedProductId) params.set("productId", selectedProductId);
      params.set("paymentType", selectedPaymentType);
    } else if (reportType === "PURCHASE") {
      if (purchaseSupplierId) params.set("supplierId", purchaseSupplierId);
      params.set("paymentStatus", purchasePaymentStatus);
      if (purchaseProductId) params.set("purchaseProductId", purchaseProductId);
    } else if (reportType === "LEDGER") {
      params.set("ledgerType", ledgerType);
      if (selectedEntityId) params.set("entityId", selectedEntityId);
      params.set("showLogs", showLogs.toString());
      if (selectedMonth) params.set("month", selectedMonth);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [
    reportType,
    dateRange,
    salesViewMode,
    selectedShiftId,
    selectedNozzleId,
    selectedProductId,
    selectedPaymentType,
    purchaseSupplierId,
    purchasePaymentStatus,
    purchaseProductId,
    ledgerType,
    selectedEntityId,
    showLogs,
    selectedMonth,
    router,
  ]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let endpoint = "";
      const params: any = {};

      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (selectedMonth) params.month = selectedMonth;

      switch (reportType) {
        case "PL":
          endpoint = "/reports/profit-loss";
          break;
        case "BS":
          endpoint = "/reports/balance-sheet";
          break;
        case "SALES":
          endpoint = "/reports/sales";
          params.viewMode = salesViewMode;
          if (selectedShiftId) params.shiftId = selectedShiftId;
          if (selectedNozzleId) params.nozzleId = selectedNozzleId;
          if (selectedProductId) params.productId = selectedProductId;
          if (selectedPaymentType !== "ALL")
            params.paymentType = selectedPaymentType;
          break;
        case "PURCHASE":
          endpoint = "/reports/purchase";
          if (purchaseSupplierId) params.supplierId = purchaseSupplierId;
          if (purchasePaymentStatus !== "ALL")
            params.paymentStatus = purchasePaymentStatus;
          if (purchaseProductId) params.productId = purchaseProductId;
          break;
        case "TRIAL":
          endpoint = "/reports/trial-balance";
          break;
        case "LEDGER":
          if (!selectedEntityId) {
            setData(null);
            setIsLoading(false);
            return;
          }
          endpoint =
            ledgerType === "SUPPLIER"
              ? `/reports/ledger/supplier/${selectedEntityId}`
              : `/reports/ledger/customer/${selectedEntityId}`;
          if (selectedEntityId === "ALL") {
            setShowLogs(false);
          } else {
            setShowLogs(true);
          }
          break;
      }

      const res = await api.get(endpoint, { params });
      console.log("Report data:", res.data);
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    reportType,
    dateRange,
    salesViewMode,
    selectedShiftId,
    selectedNozzleId,
    selectedProductId,
    selectedPaymentType,
    purchaseSupplierId,
    purchasePaymentStatus,
    purchaseProductId,
    ledgerType,
    selectedEntityId,
  ]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [shiftsRes, nozzlesRes, productsRes, suppliersRes, customersRes] =
        await Promise.all([
          api.get("/shifts"),
          api.get("/inventory/nozzles"),
          api.get("/inventory/products"),
          api.get("/suppliers"),
          api.get("/credit-customers"),
        ]);
      setShifts(shiftsRes.data);
      setNozzles(nozzlesRes.data);
      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      // Only show customers with credit history
      setCustomers(customersRes.data.filter((c: any) => c.id));
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [
    reportType,
    dateRange,
    salesViewMode,
    selectedShiftId,
    selectedNozzleId,
    selectedProductId,
    selectedPaymentType,
    purchaseSupplierId,
    purchasePaymentStatus,
    purchaseProductId,
    ledgerType,
    selectedEntityId,
    selectedMonth,
    fetchReport,
  ]);

  const tabs: { id: ReportType; label: string; icon: any }[] = [
    { id: "PL", label: "Profit & Loss", icon: PieChart },
    { id: "BS", label: "Balance Sheet", icon: Scale },
    { id: "SALES", label: "Sales Report", icon: ShoppingCart },
    { id: "PURCHASE", label: "Purchase Report", icon: Truck },
    { id: "LEDGER", label: "Ledgers", icon: BookOpen },
    { id: "TRIAL", label: "Trial Balance", icon: FileText },
  ];

  const handleDownloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const title = tabs.find((t) => t.id === reportType)?.label || "Report";
    const date = new Date().toISOString().split('T')[0];
    const filename = `${title.replace(/\s+/g, '_')}_${date}.pdf`;

    // Professional Header with styling
    doc.setFillColor(24, 24, 27); // Zinc-950
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("PETROL PUMP MANAGEMENT SYSTEM", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(239, 68, 68); // Red-500
    doc.text(title.toUpperCase(), 105, 28, { align: "center" });

    const now = new Date();
    const formattedNow = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    doc.setTextColor(113, 113, 122); // Zinc-400
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${formattedNow}`, 196, 35, { align: "right" });
    doc.text(
      `Period: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
      14,
      35,
    );

    let tableData: any[] = [];
    let columns: string[] = [];

    if (reportType === "SALES") {
      const records = Array.isArray(data) ? data : data.records || [];
      if (salesViewMode === "DAILY_SUMMARY") {
        columns = [
          "Date",
          "Qty Sold",
          "Cash Sales",
          "Card Sales",
          "Online Sales",
          "Credit Sales",
          "Total Sale",
        ];
        tableData = records.map((r: any) => [
          formatDate(r.date),
          `${(r.quantitySold || 0).toFixed(2)} L`,
          `Rs. ${(r.cashSales || 0).toLocaleString()}`,
          `Rs. ${(r.cardSales || 0).toLocaleString()}`,
          `Rs. ${(r.onlineSales || 0).toLocaleString()}`,
          `Rs. ${(r.creditSales || 0).toLocaleString()}`,
          `Rs. ${(r.totalSales || 0).toLocaleString()}`,
        ]);
      } else if (salesViewMode === "DETAILED_SALES") {
        columns = [
          "Date/Time",
          "Customer",
          "Product",
          "Qty",
          "Amount",
          "Method",
          "Operator",
        ];
        tableData = records.map((r: any) => [
          formatDateTime(r.date),
          r.name || "---",
          r.fuel || r.product || "---",
          `${(r.quantity || 0).toFixed(2)} L`,
          `Rs. ${(r.amount || 0).toLocaleString()}`,
          r.method || "---",
          r.paidTo || "---",
        ]);
      } else {
        columns = ["Nozzle/Operator", "Product", "Qty Sold", "Total Amount"];
        tableData = records.map((r: any) => [
          r.nozzle || r.operator || "---",
          r.product || "---",
          `${(r.sale || r.quantitySold || r.sold || 0).toFixed(2)} L`,
          `Rs. ${(r.totalSale || r.totalSales || r.amount || 0).toLocaleString()}`,
        ]);
      }
    } else if (reportType === "PURCHASE") {
      columns = [
        "Date",
        "Supplier",
        "Product",
        "Quantity",
        "Total Cost",
        "Status",
      ];
      tableData = data.map((p: any) => [
        formatDate(p.date),
        p.supplier || "---",
        p.product || "---",
        `${(p.quantity || 0).toLocaleString()} L`,
        `Rs. ${(p.totalCost || 0).toLocaleString()}`,
        p.paymentStatus || "---",
      ]);
    } else if (reportType === "LEDGER") {
      columns = ["Date", "Description", "Debit", "Credit", "Running Balance"];
      tableData = data.ledger.map((r: any) => [
        formatDate(r.date),
        r.description || "---",
        r.debit > 0 ? `Rs. ${r.debit.toLocaleString()}` : "-",
        r.credit > 0 ? `Rs. ${r.credit.toLocaleString()}` : "-",
        `Rs. ${(r.runningBalance || r.balance || 0).toLocaleString()}`,
      ]);
    } else if (reportType === "PL") {
      columns = ["Description", "Amount (Rs.)"];
      tableData = [
        ["Total Income", `Rs. ${(data.income || 0).toLocaleString()}`],
        ["Total Expenses", `Rs. ${(data.expense || 0).toLocaleString()}`],
        ["Net Profit / Loss", `Rs. ${(data.netProfit || 0).toLocaleString()}`],
      ];
    } else if (reportType === "BS") {
      columns = ["Category", "Total (Rs.)"];
      tableData = [
        ["Total Assets", `Rs. ${(data.totalAssets || 0).toLocaleString()}`],
        [
          "Total Liabilities & Equity",
          `Rs. ${(data.totalLiabilitiesAndEquity || 0).toLocaleString()}`,
        ],
      ];
    } else if (reportType === "TRIAL") {
      columns = ["Code", "Account Name", "Debit (DR)", "Credit (CR)"];
      tableData = data.accounts.map((acc: any) => [
        acc.code,
        acc.name,
        acc.debit > 0 ? `Rs. ${acc.debit.toLocaleString()}` : "-",
        acc.credit > 0 ? `Rs. ${acc.credit.toLocaleString()}` : "-",
      ]);
      tableData.push([
        "",
        "TOTALS",
        `Rs. ${(data.totalDebit || 0).toLocaleString()}`,
        `Rs. ${(data.totalCredit || 0).toLocaleString()}`,
      ]);
    }

    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 4, font: "helvetica" },
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 45 },
      didDrawPage: (_data) => {
        // Footer on each page
        const str = "PPMS Secure Report | Page " + doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(str, 105, 285, { align: "center" });
      },
    });

    doc.save(filename);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
            Financial Reports
          </h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            <Activity size={16} />
            Comprehensive financial analysis and history
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setReportType(tab.id);
                setData(null);
              }}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border",
                reportType === tab.id
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "bg-zinc-950/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300",
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls (Advanced Filter Bar) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800 backdrop-blur-sm">
            {/* Date Filters */}
            <div className="flex items-center gap-3 bg-zinc-950/50 px-4 py-2 rounded-2xl border border-zinc-800">
              <Calendar size={16} className="text-zinc-500" />
              <input
                type="date"
                className="bg-transparent text-xs text-zinc-300 outline-none w-28"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
              <span className="text-zinc-700 font-bold">to</span>
              <input
                type="date"
                className="bg-transparent text-xs text-zinc-300 outline-none w-28"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              {[
                { label: "Today", days: 0 },
                { label: "7D", days: 7 },
                { label: "30D", days: 30 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => {
                    const now = new Date();
                    if (q.days === 0) {
                      const today = now.toISOString().split("T")[0];
                      setDateRange({ start: today, end: today });
                    } else {
                      const end = now.toISOString().split("T")[0];
                      const start = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate() - q.days,
                      )
                        .toISOString()
                        .split("T")[0];
                      setDateRange({ start, end });
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-zinc-800 mx-2" />

            {/* Sales Specific Filters */}
            {reportType === "SALES" && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                  value={salesViewMode}
                  onChange={(e) =>
                    setSalesViewMode(e.target.value as SalesViewMode)
                  }
                >
                  <option value="DAILY_SUMMARY">Daily Summary</option>
                  <option value="SHIFT_WISE">Shift Wise</option>
                  <option value="NOZZLE_WISE">Nozzle Wise</option>
                  <option value="NOZZLE_READINGS">Nozzle Readings</option>
                  <option value="DETAILED_SALES">Detailed Sales</option>
                </select>

                {/* Show shift filter for all except DAILY_SUMMARY */}
                {salesViewMode !== "DAILY_SUMMARY" && (
                  <select
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all min-w-[200px]"
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                  >
                    <option value="">All Shifts</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatShiftName(s)} ({s.opener?.username || "Admin"})
                      </option>
                    ))}
                  </select>
                )}

                {/* Show nozzle/product/payment filters only for DETAILED_SALES */}
                {salesViewMode === "DETAILED_SALES" && (
                  <>
                    <select
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                      value={selectedNozzleId}
                      onChange={(e) => setSelectedNozzleId(e.target.value)}
                    >
                      <option value="">All Nozzles</option>
                      {nozzles.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">All Products</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                      value={selectedPaymentType}
                      onChange={(e) => setSelectedPaymentType(e.target.value)}
                    >
                      <option value="ALL">All Payments</option>
                      <option value="CASH">Cash</option>
                      <option value="CREDIT">Credit</option>
                      <option value="BANK">Bank / POS</option>
                    </select>
                  </>
                )}
              </div>
            )}

            {/* Purchase Specific Filters */}
            {reportType === "PURCHASE" && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all min-w-[150px]"
                  value={purchaseSupplierId}
                  onChange={(e) => setPurchaseSupplierId(e.target.value)}
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                  value={purchasePaymentStatus}
                  onChange={(e) => setPurchasePaymentStatus(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                </select>

                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                  value={purchaseProductId}
                  onChange={(e) => setPurchaseProductId(e.target.value)}
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ledger Specific Filters */}
            {reportType === "LEDGER" && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                  value={ledgerType}
                  onChange={(e) => {
                    setLedgerType(e.target.value as any);
                    setSelectedEntityId("");
                  }}
                >
                  <option value="SUPPLIER">Supplier</option>
                  <option value="CUSTOMER">Customer</option>
                </select>

                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all min-w-[200px]"
                  value={selectedEntityId}
                  onChange={(e) => {
                    setSelectedEntityId(e.target.value);
                    if (e.target.value === "ALL") {
                      setShowLogs(false);
                    }
                  }}
                >
                  <option value="">Select Account...</option>
                  <option value="ALL"> [ ALL ] </option>
                  {(ledgerType === "SUPPLIER" ? suppliers : customers).map(
                    (e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ),
                  )}
                </select>

                <input
                  type="month"
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-all"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  placeholder="Select month"
                />
                {selectedMonth && (
                  <button
                    onClick={() => setSelectedMonth("")}
                    className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
                  >
                    Clear Month
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />
            <button
              onClick={() => fetchReport()}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-950/20"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => handleDownloadPDF()}
              className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-500 transition-all"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-zinc-500">
            <FileText className="mx-auto mb-4 opacity-50" size={48} />
            <p>Select criteria to generate report</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Profit & Loss */}
            {reportType === "PL" && (
              <div className="space-y-6">
                {/* Explanation Card */}
                <div className="p-6 rounded-3xl bg-zinc-900/20 border border-zinc-800">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    <span className="font-black text-zinc-400">
                      How it works:
                    </span>{" "}
                    Profit & Loss shows your business performance.
                    <span className="text-emerald-400 font-bold">
                      {" "}
                      Income
                    </span>{" "}
                    (revenue from sales) minus
                    <span className="text-rose-400 font-bold">
                      {" "}
                      Expenses
                    </span>{" "}
                    (costs like fuel purchases, salaries) equals
                    <span className="text-zinc-100 font-bold">
                      {" "}
                      Net Profit
                    </span>{" "}
                    (or Loss if negative).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-8 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 card-hover">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                        <TrendingUp size={24} />
                      </div>
                    </div>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">
                      Total Income
                    </p>
                    <p className="text-3xl font-black text-emerald-500 font-mono italic">
                      Rs. {(data.income || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-8 rounded-[32px] bg-rose-500/10 border border-rose-500/20 card-hover">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500">
                        <TrendingDown size={24} />
                      </div>
                    </div>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">
                      Total Expenses
                    </p>
                    <p className="text-3xl font-black text-rose-500 font-mono italic">
                      Rs. {(data.expense || 0).toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "p-8 rounded-[32px] border card-hover",
                      data.netProfit >= 0
                        ? "bg-zinc-100 border-zinc-200 text-zinc-900"
                        : "bg-rose-600 border-rose-500 text-white",
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={cn(
                          "p-3 rounded-2xl",
                          data.netProfit >= 0
                            ? "bg-zinc-900 text-zinc-100"
                            : "bg-white/20 text-white",
                        )}
                      >
                        <Activity size={24} />
                      </div>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-bold uppercase tracking-wider mb-1",
                        data.netProfit >= 0 ? "text-zinc-500" : "text-white/70",
                      )}
                    >
                      Net Profit / Loss
                    </p>
                    <p className="text-3xl font-black font-mono italic">
                      Rs. {(data.netProfit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Report */}
            {reportType === "SALES" && (
              <div className="space-y-6">
                {/* Dynamic Summary Cards */}
                {data?.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                        Total Transactions
                      </p>
                      <p className="text-2xl font-black text-zinc-100 font-mono">
                        {data.summary.totalCustomers || 0}
                      </p>
                    </div>

                    {data.summary.fuelTypeTotals?.length > 0 &&
                      data.summary.fuelTypeTotals.map((fuel: any) => (
                        <div
                          key={fuel.name}
                          className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">
                            {fuel.name}
                          </p>
                          <p className="text-xl font-black text-blue-300 font-mono">
                            {fuel.quantity.toFixed(0)} L
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Rs. {fuel.amount.toLocaleString()}
                          </p>
                        </div>
                      ))}

                    {data.summary.paymentMethodTotals?.length > 0 &&
                      data.summary.paymentMethodTotals.map((pm: any) => (
                        <div
                          key={pm.method}
                          className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                            {pm.method} Sales
                          </p>
                          <p className="text-xl font-black text-emerald-400 font-mono">
                            Rs. {pm.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {pm.count} transactions
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-2 px-2">
                  <div className="w-1.5 h-6 bg-zinc-100 rounded-full" />
                  <h3 className="text-lg font-black text-zinc-100 tracking-tight uppercase">
                    {salesViewMode.replace("_", " ")} Report
                  </h3>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                  <div className="max-h-[600px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                      <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                        {salesViewMode === "DAILY_SUMMARY" && (
                          <tr>
                            <th className="px-6 py-5">Date</th>
                            <th className="px-6 py-5 text-right">Qty Sold</th>
                            <th className="px-6 py-5 text-right">Cash</th>
                            <th className="px-6 py-5 text-right">Card</th>
                            <th className="px-6 py-5 text-right">Online</th>
                            <th className="px-6 py-5 text-right">Credit</th>
                            <th className="px-6 py-5 text-right">Total Sale</th>
                          </tr>
                        )}
                        {salesViewMode === "SHIFT_WISE" && (
                          <tr>
                            <th className="px-6 py-5">Shift / Operator</th>
                            <th className="px-6 py-5">Time Range</th>
                            <th className="px-6 py-5 text-right">
                              Total Sales
                            </th>
                            <th className="px-6 py-5 text-right">Qty</th>
                            <th className="px-6 py-5 text-right text-emerald-500">
                              Profit
                            </th>
                          </tr>
                        )}
                        {salesViewMode === "NOZZLE_WISE" && (
                          <tr>
                            <th className="px-6 py-5">Nozzle / Shift</th>
                            <th className="px-6 py-5 text-right">Opening</th>
                            <th className="px-6 py-5 text-right">Closing</th>
                            <th className="px-6 py-5 text-right">Sold (L)</th>
                            <th className="px-6 py-5 text-right">Rate</th>
                            <th className="px-6 py-5 text-right text-zinc-100">
                              Total
                            </th>
                          </tr>
                        )}
                        {salesViewMode === "NOZZLE_READINGS" && (
                          <tr>
                            <th className="px-6 py-5">Date / Shift</th>
                            <th className="px-6 py-5">Nozzle</th>
                            <th className="px-6 py-5 text-right">Opening</th>
                            <th className="px-6 py-5 text-right">Closing</th>
                            <th className="px-6 py-5 text-right">Sold (L)</th>
                            <th className="px-6 py-5 text-right">Rate</th>
                            <th className="px-6 py-5 text-right text-zinc-100">
                              Amount
                            </th>
                          </tr>
                        )}
                        {salesViewMode === "DETAILED_SALES" && (
                          <tr>
                            <th className="px-6 py-5">Date / Time</th>
                            <th className="px-6 py-5">Customer / Vehicle</th>
                            <th className="px-6 py-5">Fuel / Nozzle</th>
                            <th className="px-6 py-5 text-right">Quantity</th>
                            <th className="px-6 py-5 text-right">Amount</th>
                            <th className="px-6 py-5">Method</th>
                            <th className="px-6 py-5">Paid To</th>
                            <th className="px-6 py-5">Shift</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {(Array.isArray(data) ? data : data.records || []).map(
                          (row: any, i: number) => (
                            <tr
                              key={i}
                              className="group hover:bg-zinc-100/[0.02] transition-colors"
                            >
                              {salesViewMode === "DAILY_SUMMARY" && (
                                <>
                                  <td className="px-6 py-5 font-mono text-zinc-300 font-bold">
                                    {formatDate(row.date)}
                                  </td>
                                  <td className="px-6 py-5 text-right text-zinc-400">
                                    {(row.quantitySold || 0).toFixed(2)} L
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.cashSales || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.cardSales || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.onlineSales || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.creditSales || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-100 font-mono italic">
                                    Rs. {(row.totalSales || 0).toLocaleString()}
                                  </td>
                                </>
                              )}
                              {salesViewMode === "SHIFT_WISE" && (
                                <>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {row.shiftName ||
                                          formatShiftName({
                                            startTime: row.startTime,
                                          })}
                                      </span>
                                      <span className="text-[10px] text-zinc-500">
                                        by {row.operator}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-xs text-zinc-500">
                                    {new Date(row.startTime).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}{" "}
                                    -
                                    {row.endTime
                                      ? new Date(
                                          row.endTime,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Ongoing"}
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-100 font-mono">
                                    Rs. {(row.totalSales || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right text-zinc-500">
                                    {(row.quantitySold || 0).toFixed(2)} L
                                  </td>
                                  <td className="px-6 py-5 text-right font-black text-emerald-500 font-mono">
                                    Rs. {(row.profit || 0).toLocaleString()}
                                  </td>
                                </>
                              )}
                              {salesViewMode === "NOZZLE_WISE" && (
                                <>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {row.nozzle}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 uppercase">
                                        {row.product}
                                      </span>
                                      <span className="text-[9px] text-zinc-600 mt-0.5">
                                        {row.shiftName || "Multiple Shifts"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.openingReading || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-500">
                                    {(row.closingReading || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-100">
                                    {(row.sale || 0).toFixed(2)} L
                                  </td>
                                  <td className="px-6 py-5 text-right text-zinc-500 font-mono">
                                    {row.rate}
                                  </td>
                                  <td className="px-6 py-5 text-right font-black text-zinc-100 font-mono italic">
                                    Rs. {(row.totalSale || 0).toLocaleString()}
                                  </td>
                                </>
                              )}
                              {salesViewMode === "NOZZLE_READINGS" && (
                                <>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-mono text-xs font-bold">
                                        {formatDate(row.date)}
                                      </span>
                                      <span className="text-[10px] text-zinc-500">
                                        {row.shiftName || "Unknown Shift"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {row.nozzle}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 uppercase">
                                        {row.product}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-600">
                                    {(row.openingReading || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-mono text-zinc-600">
                                    {(row.closingReading || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-200 font-mono">
                                    {(row.sold || 0).toFixed(2)} L
                                  </td>
                                  <td className="px-6 py-5 text-right text-zinc-500 font-mono">
                                    {row.rate}
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-100 font-mono italic">
                                    Rs. {(row.amount || 0).toLocaleString()}
                                  </td>
                                </>
                              )}
                              {salesViewMode === "DETAILED_SALES" && (
                                <>
                                  <td className="px-6 py-5 font-mono text-xs">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {formatDate(row.date)}
                                      </span>
                                      <span className="text-[10px] text-zinc-500">
                                        {formatTime(row.date)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {row.name}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 uppercase font-black text-blue-500">
                                        {row.vehicleNo}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-zinc-100 font-bold">
                                        {row.fuel}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 uppercase">
                                        {row.nozzle}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right font-bold text-zinc-200">
                                    {(row.quantity || 0).toFixed(2)} L
                                  </td>
                                  <td className="px-6 py-5 text-right font-black text-zinc-100 font-mono italic">
                                    Rs. {(row.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-5">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                        row.method === "CASH"
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : row.method === "CREDIT"
                                            ? "bg-rose-500/10 text-rose-500"
                                            : "bg-blue-500/10 text-blue-500",
                                      )}
                                    >
                                      {row.method}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 text-xs text-zinc-400">
                                    {row.paidTo}
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-zinc-300 font-bold">
                                        {row.shift}
                                      </span>
                                      <span className="text-[9px] text-zinc-600">
                                        by {row.shiftOpener}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                    {(Array.isArray(data) ? data : data.records || [])
                      .length === 0 && (
                      <div className="py-20 text-center text-zinc-600">
                        <p className="text-lg font-bold mb-2">
                          No sales data found
                        </p>
                        <p className="text-sm">
                          Try adjusting your filters or date range
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Report */}
            {reportType === "PURCHASE" && (
              <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                <div className="max-h-[600px] overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                    <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Supplier & Product</th>
                        <th className="px-6 py-5">Tank</th>
                        <th className="px-6 py-5 text-right">Qty (L)</th>
                        <th className="px-6 py-5 text-right">Rate</th>
                        <th className="px-6 py-5 text-right">Total Cost</th>
                        <th className="px-6 py-5 text-right">Paid</th>
                        <th className="px-6 py-5 text-right">Remaining</th>
                        <th className="px-6 py-5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {(Array.isArray(data) ? data : []).map((p: any) => (
                        <tr
                          key={p.id}
                          className="hover:bg-zinc-100/[0.02] transition-colors"
                        >
                          <td className="px-6 py-5 font-mono text-zinc-300 font-bold">
                            {formatDate(p.date)}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-zinc-100 font-bold">
                                {p.supplier?.name || p.supplier}
                              </span>
                              <span className="text-[10px] text-blue-500 uppercase font-black">
                                {p.tank?.product?.name || p.product}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-zinc-500 text-xs">
                            {p.tank?.name || p.tank}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-zinc-200">
                            {(p.quantity || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right font-mono text-zinc-600">
                            {p.rate}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-zinc-100 font-mono italic">
                            Rs. {(p.totalCost || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-emerald-500 font-mono">
                            {(p.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-rose-500 font-mono">
                            {(p.remainingAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                                p.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : p.status === "UNPAID"
                                    ? "bg-rose-500/10 text-rose-500"
                                    : "bg-orange-500/10 text-orange-500",
                              )}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ledger */}
            {reportType === "LEDGER" && (
              <div className="space-y-6">
                {data?.isMonthFiltered && (
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-bold">
                      📅 Month Filter Active: Showing transactions and summary for selected month only. Total balance shows current all-time balance.
                    </p>
                  </div>
                )}
                {selectedEntityId === "ALL" && data?.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                          <TrendingDown size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-500/70">
                            {ledgerType === "CUSTOMER" ? "Total Receivable" : "Total Payable"}
                          </p>
                          <p className="text-3xl font-black text-emerald-500 font-mono italic">
                            Rs. {data.summary.reduce((sum: number, item: any) => sum + item.balance, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {ledgerType === "CUSTOMER" ? "Amount to be received from customers" : "Amount to be paid to suppliers"}
                      </p>
                    </div>
                    <div className="p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-zinc-800 rounded-2xl text-zinc-400">
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total {ledgerType === "CUSTOMER" ? "Customers" : "Suppliers"}
                          </p>
                          <p className="text-3xl font-black text-zinc-100 font-mono italic">
                            {data.summary.length}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Active accounts with outstanding balance
                      </p>
                    </div>
                  </div>
                )}
                {selectedEntityId === "ALL" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-100 text-zinc-950"
                      >
                        Summary View
                      </button>
                    </div>
                  </div>
                )}

                {selectedEntityId && selectedEntityId !== "ALL" && data && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setSelectedEntityId("ALL");
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                      >
                        ← Back to Summary
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const entityName = ledgerType === "SUPPLIER" ? data?.supplier?.name : data?.customer?.name;
                            const response = await api.get(`/reports/invoice/${ledgerType.toLowerCase()}/${selectedEntityId}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            const date = new Date().toISOString().split('T')[0];
                            link.setAttribute('download', `INV_${entityName?.replace(/\s+/g, '_')}_${date}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error) {
                            console.error('Failed to download invoice:', error);
                            alert('Failed to generate invoice. Please try again.');
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-500"
                      >
                        Generate Invoice
                      </button>
                    </div>

                    <div className="flex flex-col items-end">
                      <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tight">
                        {ledgerType === "SUPPLIER"
                          ? data?.supplier?.name
                          : data?.customer?.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Current Balance: Rs.{" "}
                        {(data?.currentBalance || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEntityId === "ALL" ? (
                  <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                    <div className="max-h-[600px] overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                        <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                          <tr>
                            <th className="px-6 py-5">
                              {ledgerType === "SUPPLIER"
                                ? "Supplier Name"
                                : "Customer Name"}
                            </th>
                            <th className="px-6 py-5 text-right">
                            {ledgerType === "SUPPLIER" ? "Debit (Paid)" : "Credit (Received)"}
                            </th>
                            <th className="px-6 py-5 text-right text-emerald-500">
                            {ledgerType === "SUPPLIER" ? "Credit (Purchased)" : "Debit (Purchased)"}
                            </th>
                            <th className="px-6 py-5 text-right text-zinc-100">
                              {ledgerType === "SUPPLIER" ? "Payable" : "Receivable"}
                            </th>
                            <th className="px-6 py-5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {(data?.summary || []).map((item: any, i: number) => (
                            <tr
                              key={i}
                              className="hover:bg-zinc-100/2 transition-colors"
                            >
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-zinc-100">{item.name}</span>
                                  {ledgerType === "CUSTOMER" && item.vehicleNumber && (
                                    <span className="text-xs text-blue-500 font-black uppercase">🚗 {item.vehicleNumber}</span>
                                  )}
                                  {item.contact ? (
                                    item.contact.includes('@') ? (
                                      <span className="text-xs text-zinc-500">✉️ {item.contact}</span>
                                    ) : (
                                      <span className="text-xs text-zinc-500">📞 {item.contact}</span>
                                    )
                                  ) : (
                                    <span className="text-xs text-zinc-600">📞 No contact</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right font-mono text-rose-400/80">
                                {item.debit > 0
                                  ? item.debit.toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-6 py-5 text-right font-mono text-emerald-400/80">
                                {item.credit > 0
                                  ? item.credit.toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-6 py-5 text-right font-black text-zinc-100 font-mono italic">
                                Rs. {item.balance.toLocaleString()}
                              </td>
                              <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedEntityId(item.id);
                                      setShowLogs(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white hover:border-zinc-700 transition-all uppercase"
                                  >
                                    Logs
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const response = await api.get(`/reports/invoice/${ledgerType.toLowerCase()}/${item.id}`, { responseType: 'blob' });
                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const date = new Date().toISOString().split('T')[0];
                                        link.setAttribute('download', `INV_${item.name.replace(/\s+/g, '_')}_${date}.pdf`);
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                      } catch (error) {
                                        console.error('Failed to download invoice:', error);
                                        alert('Failed to generate invoice. Please try again.');
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 border border-blue-500 text-[10px] font-black text-white hover:bg-blue-500 transition-all uppercase"
                                  >
                                    Invoice
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(!data?.summary || data.summary.length === 0) && (
                        <div className="py-20 text-center text-zinc-600">
                          <p className="text-lg font-bold mb-2">
                            No {ledgerType.toLowerCase()} records found
                          </p>
                          <p className="text-sm">
                            Try adjusting your date range
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedEntityId && selectedEntityId !== "ALL" ? (
                  <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                    <div className="max-h-[600px] overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                        <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                          <tr>
                            <th className="px-6 py-5">Date</th>
                            <th className="px-6 py-5">Flow Description</th>
                            <th className="px-6 py-5 text-right">
                              {ledgerType === "SUPPLIER" ? "Debit (Paid)" : "Credit (Received)"}
                            </th>
                            <th className="px-6 py-5 text-right text-emerald-500">
                              {ledgerType === "SUPPLIER" ? "Credit (Payments)" : "Debit (Purchased)"}
                            </th>
                            <th className="px-6 py-5 text-right text-zinc-100">
                              {ledgerType === "SUPPLIER" ? "Payable" : "Receivable"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {(data?.ledger || []).map((row: any, i: number) => (
                            <tr
                              key={i}
                              className="hover:bg-zinc-100/2 transition-colors"
                            >
                              <td className="px-6 py-5 font-mono text-zinc-300 text-xs">
                                {formatDate(row.date)}
                              </td>
                              <td className="px-6 py-5">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-100 font-bold">
                                        {row.description}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-[8px] font-black text-zinc-500 uppercase border border-zinc-800">
                                        {row.type}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
                                      <span className="text-blue-400 font-black uppercase">
                                        {ledgerType === "SUPPLIER"
                                          ? row.supplierName
                                          : row.customerName}
                                      </span>
                                      {row.details && (
                                        <>
                                          {ledgerType === "SUPPLIER" ? (
                                            <>
                                              <span className="text-zinc-500 italic">
                                                Purchase Detail:{" "}
                                                {row.details.quantity}L @ Rs.{" "}
                                                {row.details.rate}
                                              </span>
                                              <span
                                                className={cn(
                                                  "font-bold",
                                                  row.details.status === "PAID"
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                                )}
                                              >
                                                Status: {row.details.status}{" "}
                                                (Paid: Rs.{" "}
                                                {(
                                                  row.details.paidAmount || 0
                                                ).toLocaleString()}{" "}
                                                | Rem: Rs.{" "}
                                                {(
                                                  row.details.remainingAmount || 0
                                                ).toLocaleString()}
                                                )
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-zinc-400 font-bold">
                                                Vehicle:{" "}
                                                {row.details.vehicleNumber ||
                                                  "N/A"}
                                              </span>
                                              <span className="text-zinc-500">
                                                {row.details.product} (
                                                {row.details.quantity}L)
                                              </span>
                                              <span className="text-zinc-600">
                                                via{" "}
                                                {row.details.nozzle || "Unknown"}
                                              </span>
                                              <span className="text-amber-500 font-bold">
                                                {row.details.shift}
                                              </span>
                                              <span className="text-zinc-600 font-mono">
                                                @ {row.details.time}
                                              </span>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                              </td>
                              <td className="px-6 py-5 text-right font-mono text-rose-400/80">
                                {row.debit > 0
                                  ? (row.debit || 0).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-6 py-5 text-right font-mono text-emerald-400/80">
                                {row.credit > 0
                                  ? (row.credit || 0).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-6 py-5 text-right font-black text-zinc-100 font-mono italic">
                                Rs.{" "}
                                {(
                                  row.runningBalance ??
                                  row.balance ??
                                  0
                                ).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Trial Balance */}
            {reportType === "TRIAL" && (
              <div className="space-y-6">
                {/* Explanation Card */}
                <div className="p-6 rounded-3xl bg-zinc-900/20 border border-zinc-800">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    <span className="font-black text-zinc-400">
                      Trial Balance:
                    </span>{" "}
                    Lists all accounts with their balances.
                    <span className="text-blue-400 font-bold"> Debit</span>{" "}
                    accounts (Assets, Expenses) on left,
                    <span className="text-emerald-400 font-bold">
                      {" "}
                      Credit
                    </span>{" "}
                    accounts (Liabilities, Equity, Income) on right.
                    <span className="text-zinc-100 font-bold">
                      {" "}
                      Total Debits must equal Total Credits
                    </span>{" "}
                    - if they match, your books are balanced. Click any account
                    to view its detailed ledger.
                  </p>
                </div>

                {/* Balance Status */}
                <div
                  className={cn(
                    "p-6 rounded-3xl border flex items-center justify-between",
                    data.isBalanced
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-rose-500/10 border-rose-500/20",
                  )}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">
                      Balance Status
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-black",
                        data.isBalanced ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {data.isBalanced
                        ? "✓ Books are Balanced"
                        : "✗ Out of Balance"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-1">Total Debits</p>
                    <p className="text-lg font-mono text-zinc-300">
                      Rs. {(data.totalDebit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-1">Total Credits</p>
                    <p className="text-lg font-mono text-zinc-300">
                      Rs. {(data.totalCredit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Grouped Accounts */}
                {data.grouped &&
                  Object.entries(data.grouped).map(
                    ([type, accounts]: [string, any]) => {
                      const accountsArray = accounts as any[];
                      return (
                        accountsArray.length > 0 && (
                          <div key={type} className="space-y-3">
                            <div className="flex items-center gap-3 px-2">
                              <div
                                className={cn(
                                  "w-1.5 h-6 rounded-full",
                                  type === "ASSET"
                                    ? "bg-blue-500"
                                    : type === "LIABILITY"
                                      ? "bg-orange-500"
                                      : type === "EQUITY"
                                        ? "bg-purple-500"
                                        : type === "INCOME"
                                          ? "bg-emerald-500"
                                          : "bg-rose-500",
                                )}
                              />
                              <h3 className="text-lg font-black text-zinc-100 tracking-tight uppercase">
                                {type}S
                              </h3>
                              <span className="text-xs text-zinc-600">
                                ({accounts.length} accounts)
                              </span>
                            </div>

                            <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                              <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                                <thead className="bg-zinc-900/95 backdrop-blur-sm uppercase font-black text-[10px] text-zinc-500 tracking-widest border-b border-zinc-800">
                                  <tr>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Account Name</th>
                                    <th className="px-6 py-4 text-right">
                                      Debit (DR)
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                      Credit (CR)
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                      Balance
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                  {accountsArray.map((acc: any) => (
                                    <tr
                                      key={acc.code}
                                      onClick={() =>
                                        router.push(
                                          `/reports?reportType=LEDGER&accountId=${acc.id}`,
                                        )
                                      }
                                      className="group hover:bg-zinc-100/3 transition-all cursor-pointer"
                                    >
                                      <td className="px-6 py-4 font-mono text-zinc-500 font-bold tracking-tighter">
                                        {acc.code}
                                      </td>
                                      <td className="px-6 py-4 text-zinc-100 font-bold">
                                        {acc.name}
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-zinc-100 text-base">
                                        {acc.debit > 0 ? (
                                          <span className="text-blue-400">
                                            {acc.debit.toLocaleString()}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-800">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-zinc-100 text-base">
                                        {acc.credit > 0 ? (
                                          <span className="text-emerald-400">
                                            {acc.credit.toLocaleString()}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-800">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-zinc-300 font-bold">
                                        Rs.{" "}
                                        {Math.abs(acc.balance).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      );
                    },
                  )}

                {/* Summary Totals */}
                <div className="overflow-hidden rounded-[40px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm shadow-2xl">
                  <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                    <tbody>
                      <tr className="bg-zinc-100 text-zinc-950 font-black">
                        <td
                          className="px-8 py-8 text-xl tracking-tighter"
                          colSpan={2}
                        >
                          GRAND TOTALS
                        </td>
                        <td className="px-8 py-8 text-right font-mono text-2xl italic text-blue-600">
                          {(data.totalDebit || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-8 text-right font-mono text-2xl italic text-emerald-600">
                          {(data.totalCredit || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-8 text-right font-mono text-2xl italic">
                          {data.isBalanced ? "✓ Balanced" : "✗ Error"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Balance Sheet */}
            {reportType === "BS" && (
              <div className="space-y-6">
                {/* Explanation Card */}
                <div className="p-6 rounded-3xl bg-zinc-900/20 border border-zinc-800">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    <span className="font-black text-zinc-400">
                      Balance Sheet Formula:
                    </span>
                    <span className="text-blue-400 font-bold"> Assets</span>{" "}
                    (what you own: cash, inventory, equipment) =
                    <span className="text-orange-400 font-bold">
                      {" "}
                      Liabilities
                    </span>{" "}
                    (what you owe: supplier debts) +
                    <span className="text-zinc-100 font-bold">
                      {" "}
                      Equity
                    </span>{" "}
                    (owner investment) +
                    <span className="text-emerald-400 font-bold">
                      {" "}
                      Net Profit
                    </span>
                    . This shows your business financial position at a point in
                    time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="p-2 bg-blue-500/20 rounded-xl text-blue-500">
                        <TrendingUp size={20} />
                      </div>
                      <h3 className="text-xl font-black text-zinc-100 tracking-tighter uppercase italic">
                        Assets
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm p-2">
                      <div className="space-y-1">
                        <div className="flex justify-between p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-all cursor-default">
                          <div className="flex flex-col">
                            <span className="text-zinc-100 font-bold">
                              Total Assets Value
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase font-black">
                              Current + Fixed
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black font-mono text-blue-500 italic">
                              Rs. {(data.totalAssets || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="p-2 bg-orange-500/20 rounded-xl text-orange-500">
                        <Scale size={20} />
                      </div>
                      <h3 className="text-xl font-black text-zinc-100 tracking-tighter uppercase italic">
                        Liabilities & Equity
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm p-2">
                      <div className="flex justify-between p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-all mb-2">
                        <div className="flex flex-col">
                          <span className="text-zinc-100 font-bold">
                            Liabilities & Equity Total
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase font-black">
                            Combined Valuation
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-orange-500 italic">
                            Rs.{" "}
                            {(
                              data.totalLiabilitiesAndEquity || 0
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="px-6 py-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                          Balanced & Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
