"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Play, Square, AlertCircle, Loader2, Droplet } from "lucide-react";
import { useToast } from "@/components/Toast";

interface NozzleReading {
  nozzleId: string;
  nozzle: {
    name: string;
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
  const [closingReadings, setClosingReadings] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState("");
  const toast = useToast();

  const fetchCurrentShift = async () => {
    try {
      const res = await api.get("/shifts/current");
      setCurrentShift(res.data as Shift);
    } catch (err) {
      console.error("Failed to fetch shift", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);

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
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 italic tracking-tight">
            Shift Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Control station operations and nozzle readings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!currentShift ? (
          <div className="p-12 rounded-3xl border border-zinc-900 bg-zinc-900/40 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <Square size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                No Active Shift
              </h2>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2">
                Station is currently offline. Start a new shift to record sales
                and manage stock.
              </p>
            </div>
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
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="p-6 rounded-2xl border border-red-600/20 bg-red-600/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,36,0.5)]" />
                <div>
                  <p className="text-sm font-semibold text-red-500 uppercase tracking-widest text-[10px]">
                    Active Shift
                  </p>
                  <h3 className="text-zinc-100 font-bold">
                    Shift ID: {currentShift.id.slice(0, 8)}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">
                  Started At
                </p>
                <p className="text-sm text-zinc-300">
                  {new Date(currentShift.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Reading Entry Form */}
            <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                Closing Readings
              </h3>
              <div className="space-y-4">
                {currentShift.readings.map((reading) => (
                  <div
                    key={reading.nozzleId}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-100">
                        {reading.nozzle.name}
                      </p>
                      <p className="text-xs text-zinc-500 uppercase mt-0.5">
                        Opening:{" "}
                        <span className="text-zinc-300 font-mono">
                          {reading.openingReading}
                        </span>
                      </p>
                    </div>
                    <div className="w-full md:w-48">
                      <input
                        type="number"
                        placeholder="Enter Closing"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-red-600 outline-none transition-all placeholder:text-zinc-700"
                        value={closingReadings[reading.nozzleId] || ""}
                        onChange={(e) =>
                          setClosingReadings({
                            ...closingReadings,
                            [reading.nozzleId]: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleEndShift}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-zinc-100 text-black font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
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
