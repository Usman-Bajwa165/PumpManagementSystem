"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Play, Square, AlertCircle, Loader2, Clock } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

interface NozzleReading {
  nozzleId: string;
  nozzle: {
    name: string;
    lastReading: number;
  };
  openingReading: number;
}

interface Shift {
  id: string;
  status: "OPEN" | "CLOSED";
  startTime: string;
  readings: NozzleReading[];
}

export default function ShiftsPage() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [closingReadings, setClosingReadings] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
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
      setAutoCloseEnabled(autoCloseRes.data.enabled);
      
      // Prefill closing readings with current nozzle readings
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

  const formatShiftTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const period = hours >= 12 ? "Night" : "Morning";
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
    return { date: formattedDate, time: formattedTime, period };
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
      toast.success("Shift Closed", "Shift ended and sales calculated successfully.");
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
      const newValue = !autoCloseEnabled;
      await api.post("/shifts/toggle-auto-close", { enabled: newValue });
      setAutoCloseEnabled(newValue);
      toast.success(
        "Auto-Close Updated",
        newValue
          ? "Shifts will auto-close at 12:00 AM/PM"
          : "Auto-close disabled"
      );
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message || "Failed to update setting");
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

  const shiftInfo = currentShift ? formatShiftTime(currentShift.startTime) : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 italic tracking-tight">
            Shift Management
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
            Control station operations and nozzle readings.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-500" size={20} />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Auto-Close Shifts at 12:00 AM/PM
              </p>
              <p className="text-xs text-zinc-500">
                Automatically close and start new shifts at midnight and noon
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoCloseEnabled}
              onChange={handleToggleAutoClose}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
          </label>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!currentShift ? (
          <div className="p-12 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/40 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
              <Square size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                No Active Shift
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-500 max-w-xs mx-auto mt-2">
                {nozzles.length === 0
                  ? "Cannot start shift. No nozzles are configured in the system."
                  : "Station is currently offline. Start a new shift to record sales and manage stock."}
              </p>
            </div>
            {nozzles.length > 0 && (
              <button
                onClick={handleStartShift}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-500 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Play size={20} />
                )}
                Start Shift
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-red-600/20 bg-red-600/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,36,0.5)]" />
                <div>
                  <p className="text-sm font-semibold text-red-500 uppercase tracking-widest text-[10px]">
                    Active Shift
                  </p>
                  <h3 className="text-zinc-900 dark:text-zinc-100 font-bold">
                    {shiftInfo?.date} - {shiftInfo?.period}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">
                  Started At
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {shiftInfo?.time}
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                Closing Readings
              </h3>
              <div className="space-y-4">
                {currentShift.readings.map((reading) => (
                  <div
                    key={reading.nozzleId}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {reading.nozzle.name}
                      </p>
                      <p className="text-xs text-zinc-500 uppercase mt-0.5">
                        Opening:{" "}
                        <span className="text-zinc-700 dark:text-zinc-300 font-mono">
                          {reading.openingReading}
                        </span>
                      </p>
                    </div>
                    <div className="w-full md:w-48">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Current Reading"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-700"
                        value={closingReadings[reading.nozzleId] || ""}
                        onChange={(e) =>
                          setClosingReadings({
                            ...closingReadings,
                            [reading.nozzleId]: Number(e.target.value),
                          })
                        }
                        disabled={!isAdmin}
                      />
                      {!isAdmin && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Current: {reading.nozzle.lastReading}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleEndShift}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <Square size={18} fill="currentColor" />
                  )}
                  End Shift & Calculate Sales
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
