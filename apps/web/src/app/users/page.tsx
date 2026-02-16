"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

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
      toast.error("Creation Failed", err.response?.data?.message || "Unable to create user");
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
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight italic flex items-center gap-3">
              <Users className="text-blue-500" />
              User Management
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
              Manage system users and their roles
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/40">
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    u.id === user?.sub
                      ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900"
                      : "bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {u.username}
                        {u.id === user?.sub && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-600 dark:text-blue-400">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Created: {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      disabled={u.id === user?.sub}
                      className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="OPERATOR">Operator</option>
                    </select>

                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={u.id === user?.sub}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete user"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
                Add New User
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="OPERATOR">Operator</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ username: "", password: "", role: "OPERATOR" });
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Creating...
                    </>
                  ) : (
                    "Create User"
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
