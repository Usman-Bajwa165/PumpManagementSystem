"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Play,
  Square,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  Moon,
  Sun,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

interface NozzleReading {
  nozzleId: string;
  nozzle: {
    name: string;
    lastReading: number;
    tank: {
      product: {
        name: string;
      };
    };
  };
  openingReading: number;
}

interface Shift {
  id: string;
  status: "OPEN" | "CLOSED";
  startTime: string;
  readings: NozzleReading[];
}

interface AutoCloseConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function ShiftsPage() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [closingReadings, setClosingReadings] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState("");
  const [autoClose, setAutoClose] = useState<AutoCloseConfig>({
    enabled: false,
    startTime: "00:00",
    endTime: "12:00",
  });
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const fetchCurrentShift = async () => {
    try {
      const [shiftRes, nozzlesRes, autoCloseRes] = await Promise.all([
        api.get("/shifts/current"),
        api.get("/inventory/nozzles"),
        api.get("/shifts/auto-close-status"),
      ]);
      const shift = shiftRes.data as Shift;
      setCurrentShift(shift);
      setNozzles(nozzlesRes.data);
      setAutoClose({
        enabled: autoCloseRes.data.enabled,
        startTime: autoCloseRes.data.startTime || "00:00",
        endTime: autoCloseRes.data.endTime || "12:00",
      });

      if (shift?.readings) {
        const prefilled: Record<string, number> = {};
        shift.readings.forEach((reading) => {
          prefilled[reading.nozzleId] = reading.nozzle.lastReading;
        });
        setClosingReadings(prefilled);
      }
    } catch (err) {
      console.error("Failed to fetch shift", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);

  const formatTimeDisplay = (value: string) => {
    if (!value) return "--:--";
    const [h, m] = value.split(":");
    const date = new Date();
    date.setHours(Number(h || 0), Number(m || 0), 0, 0);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getShiftHours = () => {
    const [sh, sm] = autoClose.startTime.split(":").map((v) => Number(v || 0));
    const [eh, em] = autoClose.endTime.split(":").map((v) => Number(v || 0));
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) {
      return null;
    }
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const diffMinutes = end >= start ? end - start : 24 * 60 - (start - end);
    const hours = diffMinutes / 60;
    return hours;
  };

  const formatShiftTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const period = hours >= 12 ? "Night Shift" : "Day Shift";
    const icon = hours >= 12 ? Moon : Sun;
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: formattedDate, time: formattedTime, period, Icon: icon };
  };

  const handleStartShift = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/shifts/start");
      await fetchCurrentShift();
      toast.success("Shift Started", "New shift has been opened successfully.");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to start shift";
      setError(errorMsg);
      toast.error("Failed to Start Shift", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    setIsSubmitting(true);
    setError("");
    const readings = Object.entries(closingReadings).map(
      ([nozzleId, closingReading]) => ({
        nozzleId,
        closingReading: Number(closingReading),
      }),
    );

    if (readings.length < (currentShift?.readings?.length || 0)) {
      const errorMsg = "Please provide closing readings for all nozzles.";
      setError(errorMsg);
      toast.warning("Incomplete Readings", errorMsg);
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("/shifts/end", { readings });
      setCurrentShift(null);
      setClosingReadings({});
      toast.success(
        "Shift Closed",
        "Shift ended and sales calculated successfully.",
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to end shift";
      setError(errorMsg);
      toast.error("Failed to End Shift", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAutoClose = async () => {
    try {
      const newValue = !autoClose.enabled;
      await api.post("/shifts/toggle-auto-close", {
        enabled: newValue,
        startTime: autoClose.startTime,
        endTime: autoClose.endTime,
      });
      setAutoClose((prev) => ({ ...prev, enabled: newValue }));
      toast.success(
        "Auto-Close Updated",
        newValue
          ? "Shifts will auto-close at 12:00 AM/PM"
          : "Auto-close disabled",
      );
    } catch (err: any) {
      toast.error(
        "Failed",
        err.response?.data?.message || "Failed to update setting",
      );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-red-600 w-12 h-12" />
        </div>
      </DashboardLayout>
    );
  }

  const shiftInfo = currentShift
    ? formatShiftTime(currentShift.startTime)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              Shift Management
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Clock size={16} />
              Control station operations and closings
            </p>
          </div>

          <div className="p-1.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-4 pr-6 pl-4 py-3 backdrop-blur-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                Auto Shift Schedule
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-300">
                  {formatTimeDisplay(autoClose.startTime)} –{" "}
                  {formatTimeDisplay(autoClose.endTime)}
                </span>
                {getShiftHours() !== null && (
                  <span className="text-[11px] text-zinc-500">
                    Shift Hours: {getShiftHours()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">
                  Start Time
                </span>
                <input
                  type="time"
                  value={autoClose.startTime}
                  onChange={(e) =>
                    setAutoClose((prev) => ({
                      ...prev,
                      startTime: e.target.value || "00:00",
                    }))
                  }
                  onBlur={() => {
                    void api
                      .post("/shifts/toggle-auto-close", {
                        enabled: autoClose.enabled,
                        startTime: autoClose.startTime,
                        endTime: autoClose.endTime,
                      })
                      .catch(() => {});
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 outline-none focus:border-red-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">
                  End Time
                </span>
                <input
                  type="time"
                  value={autoClose.endTime}
                  onChange={(e) =>
                    setAutoClose((prev) => ({
                      ...prev,
                      endTime: e.target.value || "12:00",
                    }))
                  }
                  onBlur={() => {
                    void api
                      .post("/shifts/toggle-auto-close", {
                        enabled: autoClose.enabled,
                        startTime: autoClose.startTime,
                        endTime: autoClose.endTime,
                      })
                      .catch(() => {});
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 outline-none focus:border-red-600"
                />
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoClose.enabled}
                onChange={handleToggleAutoClose}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {!currentShift ? (
          <div className="p-16 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full animate-pulse" />
              <div className="relative h-full w-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Square size={40} />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-100">
                Functionality Halted
              </h2>
              <p className="text-zinc-500 max-w-md mx-auto">
                {nozzles.length === 0
                  ? "Cannot start shift. No nozzles are configured in the system."
                  : "The station is currently offline. Start a new shift to begin recording sales and tracking inventory."}
              </p>
            </div>

            {nozzles.length > 0 && (
              <button
                onClick={handleStartShift}
                disabled={isSubmitting}
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg hover:to-red-400 transition-all flex items-center gap-3 mx-auto disabled:opacity-50 hover:shadow-lg hover:shadow-red-900/20"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
                Start Operations
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-6 relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  {shiftInfo?.Icon && <shiftInfo.Icon size={32} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                      Active Shift
                    </p>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-100">
                    {shiftInfo?.period} ({shiftInfo?.date})
                  </h3>
                </div>
              </div>

              <div className="text-center md:text-right relative z-10 bg-zinc-950/30 px-6 py-3 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                  Shift Started At
                </p>
                <p className="text-xl font-mono text-zinc-200">
                  {shiftInfo?.time}
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Clock size={20} className="text-red-500" />
                  Closing Readings
                </h3>
                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {currentShift.readings.length} Nozzles Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentShift.readings.map((reading) => (
                  <div
                    key={reading.nozzleId}
                    className="group relative p-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-zinc-200">
                          {reading.nozzle.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {reading.nozzle.tank?.product?.name}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                        <Fuel size={16} className="text-zinc-500" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase font-bold">
                          Opening Reading
                        </p>
                        <p className="text-sm font-mono text-zinc-400">
                          {reading.openingReading.toLocaleString()}
                        </p>
                      </div>

                      <div className="relative">
                        <label className="text-[10px] text-red-500 uppercase font-bold absolute -top-5 right-0 group-focus-within:opacity-100 opacity-0 transition-opacity">
                          Current
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter Closing"
                          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-mono text-zinc-100 focus:border-red-600 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-700"
                          value={closingReadings[reading.nozzleId] || ""}
                          onChange={(e) =>
                            setClosingReadings({
                              ...closingReadings,
                              [reading.nozzleId]: Number(e.target.value),
                            })
                          }
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={handleEndShift}
                  disabled={isSubmitting}
                  className="px-8 py-4 rounded-xl bg-zinc-100 text-black font-bold hover:bg-white hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <Square size={18} fill="currentColor" />
                  )}
                  Close Shift & Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
// Helper component for icon
function Fuel({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 22v-8a2 2 0 0 1 2-2h2.5" />
      <path d="M12 22V10a2 2 0 0 0-2-2H2" />
      <path d="M10 22h-5" />
      <path d="M9 22h3" />
      <path d="M14 22V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20l-3-3-3 3Z" />
    </svg>
  );
}
