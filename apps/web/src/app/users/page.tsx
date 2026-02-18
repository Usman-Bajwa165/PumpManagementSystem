"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "OPERATOR",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      const filteredUsers = res.data.filter((u: any) => u.role !== "ADMIN");
      setUsers(filteredUsers);
    } catch (err) {
      toast.error("Failed to Load", "Unable to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.password) {
      toast.warning("Validation Error", "Username and password are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/users", formData);
      toast.success("User Created", `${formData.username} added successfully`);
      setShowModal(false);
      setFormData({ username: "", password: "", role: "OPERATOR" });
      fetchUsers();
    } catch (err: any) {
      toast.error(
        "Creation Failed",
        err.response?.data?.message || "Unable to create user",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === user?.sub) {
      toast.warning("Cannot Edit Self", "You cannot change your own role");
      return;
    }

    try {
      await api.put(`/users/${userId}`, { role: newRole });
      toast.success("Role Updated", "User role changed successfully");
      fetchUsers();
    } catch (err) {
      toast.error("Update Failed", "Unable to update user role");
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (userId === user?.sub) {
      toast.warning("Cannot Delete Self", "You cannot delete your own account");
      return;
    }

    if (!confirm(`Delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      toast.success("User Deleted", `${username} removed successfully`);
      fetchUsers();
    } catch (err) {
      toast.error("Deletion Failed", "Unable to delete user");
    }
  };

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">
              User Management
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <Shield size={16} />
              Manage access and permissions
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Plus size={18} />
            Create User
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="animate-spin text-red-600 w-10 h-10" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {users.length === 0 ? (
              <div className="col-span-full p-16 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <User size={48} className="mx-auto text-zinc-700 mb-4" />
                <h3 className="text-zinc-300 font-bold text-lg">
                  No Users Found
                </h3>
                <p className="text-zinc-500">
                  Create a new user to grant access.
                </p>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-lg shadow-inner">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-zinc-100 leading-tight">
                          {u.username}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Added {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {u.id !== user?.sub && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                        Access Role
                      </label>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={u.id === user?.sub}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-300 text-sm font-medium outline-none focus:border-red-600 transition-all appearance-none"
                      >
                        <option value="MANAGER">Manager (Full Access)</option>
                        <option value="OPERATOR">Operator (Restricted)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/30 border border-zinc-800">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          u.role === "MANAGER"
                            ? "bg-emerald-500"
                            : "bg-amber-500",
                        )}
                      />
                      <span className="text-xs text-zinc-400">
                        {u.role === "MANAGER"
                          ? "Can manage stocks & users"
                          : "Can only record sales"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-full bg-red-600/10 text-red-500">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Add User</h2>
                  <p className="text-zinc-500 text-sm">
                    Create new system access
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-red-600 transition-all"
                    placeholder="johndoe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-red-600 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, role: "OPERATOR" })
                      }
                      className={cn(
                        "p-3 rounded-xl border text-sm font-bold transition-all",
                        formData.role === "OPERATOR"
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      Operator
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, role: "MANAGER" })
                      }
                      className={cn(
                        "p-3 rounded-xl border text-sm font-bold transition-all",
                        formData.role === "MANAGER"
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      Manager
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      username: "",
                      password: "",
                      role: "OPERATOR",
                    });
                  }}
                  className="flex-1 py-3.5 rounded-xl border border-zinc-800 text-zinc-500 font-bold hover:bg-zinc-900 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
