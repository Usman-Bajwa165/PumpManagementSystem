"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { MessageSquare, Loader2, CheckCircle2, XCircle, Settings } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectedNumber, setConnectedNumber] = useState("");
  const [preferences, setPreferences] = useState<any>({
    phoneNumber: "",
    salesNotifications: true,
    shiftNotifications: true,
    inventoryNotifications: true,
    stockNotifications: true,
    notifyCash: true,
    notifyCard: true,
    notifyOnline: true,
    notifyCredit: true,
    minCashAmount: 0,
    minCardAmount: 0,
    minOnlineAmount: 0,
    minCreditAmount: 0,
    lowFuelThreshold: 20,
  });
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  const fetchStatus = async () => {
    try {
      const res = await api.get("/whatsapp/status");
      setStatus(res.data);
      if (res.data.connectedNumber) {
        setConnectedNumber(res.data.connectedNumber);
      }

      if (!res.data.isReady && res.data.hasQR) {
        const qrRes = await api.get("/whatsapp/qr");
        setQrCode(qrRes.data.qrCode);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    // Validate: At least one payment method must be checked if sales notifications are enabled
    if (preferences.salesNotifications) {
      if (!preferences.notifyCash && !preferences.notifyCard && !preferences.notifyOnline && !preferences.notifyCredit) {
        toast.warning(
          "Validation Error",
          "Please enable at least one payment method for sales notifications!"
        );
        return;
      }
    }
    
    setIsSaving(true);
    try {
      await api.post("/whatsapp/preferences", preferences);
      toast.success(
        "Preferences Saved!",
        "Your notification preferences have been updated successfully."
      );
    } catch (err) {
      console.error(err);
      toast.error(
        "Save Failed",
        "Unable to save preferences. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPreferences();
    const interval = setInterval(fetchStatus, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await api.get("/whatsapp/preferences");
      if (res.data) {
        setPreferences(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch preferences", err);
    }
  };

  useEffect(() => {
    if (qrCode && canvasRef.current) {
      import("qrcode").then((QRCode) => {
        QRCode.toCanvas(canvasRef.current, qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      });
    }
  }, [qrCode]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight italic flex items-center gap-3">
            <MessageSquare className="text-green-500" />
            WhatsApp Integration
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Connect WhatsApp to receive real-time notifications.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Connection Status
                  </p>
                  <div className="flex items-center gap-3">
                    {status?.isReady ? (
                      <>
                        <CheckCircle2 className="text-green-500" size={24} />
                        <span className="text-xl font-bold text-green-500">
                          Connected
                        </span>
                      </>
                    ) : status?.status === "failed" ? (
                      <>
                        <XCircle className="text-rose-500" size={24} />
                        <span className="text-xl font-bold text-rose-500">
                          Failed
                        </span>
                      </>
                    ) : status?.status === "authenticated" || status?.status === "loading" ? (
                      <>
                        <Loader2
                          className="animate-spin text-blue-500"
                          size={24}
                        />
                        <span className="text-xl font-bold text-blue-500">
                          Logging in...
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader2
                          className="animate-spin text-amber-500"
                          size={24}
                        />
                        <span className="text-xl font-bold text-amber-500">
                          Waiting for Authentication
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            {qrCode && !status?.isReady && (
              <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40 text-center space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">
                    Scan QR Code
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Open WhatsApp on your phone → Settings → Linked Devices →
                    Link a Device
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="p-6 bg-white rounded-2xl">
                    <canvas ref={canvasRef} />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  QR code refreshes every 1 minute
                </div>
              </div>
            )}

            {/* Success Message & Preferences */}
            {status?.isReady && (
              <>
                <div className="p-8 rounded-3xl border border-green-900/50 bg-green-900/10 text-center">
                  <CheckCircle2
                    className="mx-auto text-green-500 mb-4"
                    size={48}
                  />
                  <h3 className="text-lg font-bold text-green-500 mb-2">
                    WhatsApp Connected Successfully!
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Configure your notification preferences below.
                  </p>
                </div>

                {/* Notification Preferences */}
                <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/40">
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="text-blue-500" size={24} />
                    <h3 className="text-lg font-bold text-zinc-100">
                      Notification Preferences
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Connected Number Info */}
                    <div className="p-4 rounded-xl bg-green-900/10 border border-green-900/20">
                      <p className="text-sm font-bold text-green-500 mb-2">Connected WhatsApp Number (FROM)</p>
                      <p className="text-lg font-mono text-zinc-100">+{connectedNumber}</p>
                      <p className="text-xs text-zinc-500 mt-1">Messages will be sent from this number</p>
                    </div>

                    {/* Notification Phone Number */}
                    <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <label className="block text-zinc-100 font-medium mb-2">Send Notifications To (TO)</label>
                      <input
                        type="text"
                        value={preferences.phoneNumber || connectedNumber}
                        onChange={(e) => setPreferences({ ...preferences, phoneNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
                        placeholder={connectedNumber || "923001234567"}
                      />
                      <p className="text-xs text-zinc-500 mt-2">
                        By default, notifications are sent to the connected number. You can change it to send to a different number.
                      </p>
                    </div>

                    {/* Reading Change Notifications (Always Enabled) */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <div>
                        <p className="text-zinc-100 font-medium">Nozzle Reading Change Alerts</p>
                        <p className="text-xs text-zinc-500 mt-1">Notified when readings are manually adjusted</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-500 font-bold">ALWAYS ON</span>
                        <div className="w-12 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                    {/* Backup Notifications (Always Enabled) */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <div>
                        <p className="text-zinc-100 font-medium">Backup Notifications</p>
                        <p className="text-xs text-zinc-500 mt-1">Notified when backups are created</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-500 font-bold">ALWAYS ON</span>
                        <div className="w-12 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Sales Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <div>
                        <p className="text-zinc-100 font-medium">Sales Notifications</p>
                        <p className="text-xs text-zinc-500 mt-1">Notified on sales (configure payment methods below)</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, salesNotifications: !preferences.salesNotifications })}
                        className={`w-12 h-6 rounded-full flex items-center transition-all ${
                          preferences.salesNotifications ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                        } px-1`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>

                    {/* Payment Method Sub-Options */}
                    {preferences.salesNotifications && (
                      <div className="ml-4 space-y-3 p-4 rounded-xl bg-zinc-950/30 border border-zinc-800">
                        <p className="text-sm text-zinc-400 font-medium mb-3">Payment Methods (at least one required):</p>
                        
                        {/* Cash */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-300">Cash Payments</label>
                            <button
                              onClick={() => setPreferences({ ...preferences, notifyCash: !preferences.notifyCash })}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${
                                preferences.notifyCash ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                              } px-0.5`}
                            >
                              <div className="w-3.5 h-3.5 bg-white rounded-full" />
                            </button>
                          </div>
                          {preferences.notifyCash && (
                            <input
                              type="number"
                              min="0"
                              value={preferences.minCashAmount === 0 ? "" : preferences.minCashAmount}
                              onChange={(e) => setPreferences({ ...preferences, minCashAmount: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm"
                              placeholder="Min amount (Rs.) - 0 for all"
                            />
                          )}
                        </div>

                        {/* Card */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-300">Card Payments</label>
                            <button
                              onClick={() => setPreferences({ ...preferences, notifyCard: !preferences.notifyCard })}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${
                                preferences.notifyCard ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                              } px-0.5`}
                            >
                              <div className="w-3.5 h-3.5 bg-white rounded-full" />
                            </button>
                          </div>
                          {preferences.notifyCard && (
                            <input
                              type="number"
                              min="0"
                              value={preferences.minCardAmount === 0 ? "" : preferences.minCardAmount}
                              onChange={(e) => setPreferences({ ...preferences, minCardAmount: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm"
                              placeholder="Min amount (Rs.) - 0 for all"
                            />
                          )}
                        </div>

                        {/* Online */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-300">Online Transfers</label>
                            <button
                              onClick={() => setPreferences({ ...preferences, notifyOnline: !preferences.notifyOnline })}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${
                                preferences.notifyOnline ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                              } px-0.5`}
                            >
                              <div className="w-3.5 h-3.5 bg-white rounded-full" />
                            </button>
                          </div>
                          {preferences.notifyOnline && (
                            <input
                              type="number"
                              min="0"
                              value={preferences.minOnlineAmount === 0 ? "" : preferences.minOnlineAmount}
                              onChange={(e) => setPreferences({ ...preferences, minOnlineAmount: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm"
                              placeholder="Min amount (Rs.) - 0 for all"
                            />
                          )}
                        </div>

                        {/* Credit */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-300">Credit Sales (Pay Later)</label>
                            <button
                              onClick={() => setPreferences({ ...preferences, notifyCredit: !preferences.notifyCredit })}
                              className={`w-10 h-5 rounded-full flex items-center transition-all ${
                                preferences.notifyCredit ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                              } px-0.5`}
                            >
                              <div className="w-3.5 h-3.5 bg-white rounded-full" />
                            </button>
                          </div>
                          {preferences.notifyCredit && (
                            <input
                              type="number"
                              min="0"
                              value={preferences.minCreditAmount === 0 ? "" : preferences.minCreditAmount}
                              onChange={(e) => setPreferences({ ...preferences, minCreditAmount: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm"
                              placeholder="Min amount (Rs.) - 0 for all"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Shift Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <div>
                        <p className="text-zinc-100 font-medium">Shift Notifications</p>
                        <p className="text-xs text-zinc-500 mt-1">Notified when shifts open/close</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, shiftNotifications: !preferences.shiftNotifications })}
                        className={`w-12 h-6 rounded-full flex items-center transition-all ${
                          preferences.shiftNotifications ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                        } px-1`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>

                    {/* Credit Notifications - REMOVED (now under Sales) */}

                    {/* Inventory Notifications */}
                    <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-100 font-medium">Inventory Alerts</p>
                          <p className="text-xs text-zinc-500 mt-1">Notified when stock is low</p>
                        </div>
                        <button
                          onClick={() => setPreferences({ ...preferences, inventoryNotifications: !preferences.inventoryNotifications })}
                          className={`w-12 h-6 rounded-full flex items-center transition-all ${
                            preferences.inventoryNotifications ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                          } px-1`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                      {preferences.inventoryNotifications && (
                        <div className="space-y-2">
                          <label className="text-sm text-zinc-300">Low Fuel Threshold (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={preferences.lowFuelThreshold}
                            onChange={(e) => setPreferences({ ...preferences, lowFuelThreshold: e.target.value === "" ? "" : parseInt(e.target.value) })}
                            onBlur={(e) => { if (e.target.value === "") setPreferences({ ...preferences, lowFuelThreshold: 20 }); }}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm"
                            placeholder="20"
                          />
                          <p className="text-xs text-zinc-500">Alert when tank level falls below this percentage</p>
                        </div>
                      )}
                    </div>

                    {/* Stock Change Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
                      <div>
                        <p className="text-zinc-100 font-medium">Stock Change Notifications</p>
                        <p className="text-xs text-zinc-500 mt-1">Notified when stock is purchased or adjusted</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, stockNotifications: !preferences.stockNotifications })}
                        className={`w-12 h-6 rounded-full flex items-center transition-all ${
                          preferences.stockNotifications ? "bg-green-600 justify-end" : "bg-zinc-700 justify-start"
                        } px-1`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={savePreferences}
                    disabled={isSaving}
                    className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
