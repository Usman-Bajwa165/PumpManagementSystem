"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Database,
  Loader2,
  Download,
  CheckCircle2,
  FolderOpen,
  Clock,
} from "lucide-react";
import { formatPakistaniTime } from "@/lib/timezone";
import { useToast } from "@/components/Toast";

export default function BackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [location, setLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFull, setIsCreatingFull] = useState(false);
  const [nightTime, setNightTime] = useState("00:00");
  const [dayTime, setDayTime] = useState("12:00");
  const [syncWithShift, setSyncWithShift] = useState(false);
  const toast = useToast();

  const fetchBackups = async () => {
    try {
      const res = await api.get("/backup/list");
      setBackups(res.data.backups);
      setLocation(res.data.location);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get("/backup/config");
      setNightTime(res.data.nightTime || "00:00");
      setDayTime(res.data.dayTime || "12:00");
      setSyncWithShift(res.data.syncWithShift || false);
    } catch (err) {
      console.error(err);
    }
  };

  const updateConfig = async (next?: {
    nightTime?: string;
    dayTime?: string;
    syncWithShift?: boolean;
  }) => {
    try {
      await api.post("/backup/config", {
        nightTime: next?.nightTime ?? nightTime,
        dayTime: next?.dayTime ?? dayTime,
        syncWithShift: next?.syncWithShift ?? syncWithShift,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const createManualBackup = async () => {
    setIsCreating(true);
    try {
      const res = await api.post("/backup/manual");
      if (res.data.success) {
        toast.success(
          "Backup Created!",
          `File: ${res.data.filename}`
        );
        fetchBackups();
      } else {
        toast.error(
          "Backup Failed",
          res.data.error || "Unable to create backup. Please try again."
        );
      }
    } catch (err: any) {
      toast.error(
        "Backup Failed",
        err.response?.data?.message || "An error occurred while creating backup."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const createFullBackup = async () => {
    setIsCreatingFull(true);
    try {
      const res = await api.post("/backup/full");
      if (res.data.success) {
        toast.success(
          "Full Backup Created!",
          `Complete database backup: ${res.data.filename}`
        );
        fetchBackups();
      } else {
        toast.error(
          "Full Backup Failed",
          res.data.error || "Unable to create full backup. Please try again."
        );
      }
    } catch (err: any) {
      toast.error(
        "Full Backup Failed",
        err.response?.data?.message || "An error occurred while creating full backup."
      );
    } finally {
      setIsCreatingFull(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-900 -mx-8 px-8 py-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight italic flex items-center gap-3">
                <Database className="text-blue-500" />
                Database Backups
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Automatic backups use your configured times or shift closures
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createManualBackup}
                disabled={isCreating || isCreatingFull}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Manual Backup
                  </>
                )}
              </button>
              <button
                onClick={createFullBackup}
                disabled={isCreating || isCreatingFull}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isCreatingFull ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Full Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Backup Location */}
        <div className="p-6 rounded-3xl border border-zinc-900 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="text-zinc-500" size={20} />
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              Backup Location
            </h3>
          </div>
          <p className="text-zinc-100 font-mono text-sm bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
            {location || "Loading..."}
          </p>

          <div className="mt-2 space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncWithShift}
                  onChange={async () => {
                    const next = !syncWithShift;
                    setSyncWithShift(next);
                    await updateConfig({ syncWithShift: next });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white" />
              </label>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-zinc-300">
                  Backup When Shift Closes
                </span>
                <span className="text-[11px] text-zinc-500">
                  Takes an incremental backup on each shift close
                </span>
              </div>
            </div>

            {!syncWithShift && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Night Backup Time
                  </span>
                  <input
                    type="time"
                    value={nightTime}
                    onChange={(e) => {
                      const v = e.target.value || "00:00";
                      setNightTime(v);
                    }}
                    onBlur={() => updateConfig({ nightTime })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Day Backup Time
                  </span>
                  <input
                    type="time"
                    value={dayTime}
                    onChange={(e) => {
                      const v = e.target.value || "12:00";
                      setDayTime(v);
                    }}
                    onBlur={() => updateConfig({ dayTime })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Backup List */}
        <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">
            Available Backups
          </h3>

          {isLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : backups.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
              <Database size={48} className="mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm mt-2">
                Create your first backup using the button above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup, idx) => {
                const isAuto = backup.filename.startsWith("Auto_");
                const isFull = backup.filename.startsWith("Full_");
                const isFullAuto = backup.filename.startsWith("Full_Auto_");
                const isFullMan = backup.filename.startsWith("Full_Man_");
                const isDay = backup.filename.includes("_D.");
                const isNight = backup.filename.includes("_N.");

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900 hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          isFullAuto
                            ? "bg-purple-600/10 text-purple-500"
                            : isFull
                            ? "bg-emerald-600/10 text-emerald-500"
                            : isAuto
                            ? "bg-blue-600/10 text-blue-500"
                            : "bg-amber-600/10 text-amber-500"
                        }`}
                      >
                        <Database size={20} />
                      </div>
                      <div>
                        <p className="text-zinc-100 font-bold font-mono text-sm">
                          {backup.filename}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-zinc-500">
                            {formatPakistaniTime(backup.date)}
                          </span>
                          <span className="text-xs text-zinc-600">•</span>
                          <span className="text-xs text-zinc-500">
                            {formatFileSize(backup.size)}
                          </span>
                          {isFullAuto && (
                            <>
                              <span className="text-xs text-zinc-600">•</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-600/20 text-purple-500">
                                Monthly Full (Auto)
                              </span>
                            </>
                          )}
                          {isFullMan && (
                            <>
                              <span className="text-xs text-zinc-600">•</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-500">
                                Full Database (Manual)
                              </span>
                            </>
                          )}
                          {isFull && !isFullAuto && !isFullMan && (
                            <>
                              <span className="text-xs text-zinc-600">•</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-500">
                                Full Database
                              </span>
                            </>
                          )}
                          {isAuto && !isFull && (
                            <>
                              <span className="text-xs text-zinc-600">•</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  isDay
                                    ? "bg-amber-600/20 text-amber-500"
                                    : "bg-blue-600/20 text-blue-500"
                                }`}
                              >
                                {isDay ? "Day (12 PM)" : "Night (12 AM)"}
                              </span>
                            </>
                          )}
                          {!isAuto && (
                            <>
                              <span className="text-xs text-zinc-600">•</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-600/20 text-amber-500">
                                Manual
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-3xl border border-blue-900/50 bg-blue-900/10">
          <h4 className="text-sm font-bold text-blue-500 mb-3">
            Backup Information
          </h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Automatic backups:</strong>{" "}
                Run daily at your configured Night and Day times - Incremental data since last auto backup
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Manual backups:</strong> Quick
                incremental snapshot - Data since last auto backup
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Monthly Full (Auto):</strong> Complete
                backup automatically on 1st of each month - ALL historical data
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Full Database (Manual):</strong> Complete
                backup with ALL historical data - Can be created anytime
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Naming format:</strong>{" "}
                Auto_DDMMYY_D/N, Man_DDMMYY_HH:MMam/pm, Full_Auto_MonthName-Year, Full_Man_DDMMYY_HH:MMam/pm
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-300">Retention:</strong> All
                backups are kept permanently (manual deletion required)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
