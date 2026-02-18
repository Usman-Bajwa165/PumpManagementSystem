"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutDashboard,
  Fuel,
  ShoppingCart,
  BarChart3,
  BookOpen,
  LogOut,
  User,
  Settings,
  MessageSquare,
  Database,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Truck,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    name: "Shifts",
    href: "/shifts",
    icon: Fuel,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: BookOpen,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Setup",
    href: "/setup",
    icon: Settings,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: Wallet,
    roles: ["ADMIN", "MANAGER"],
  },
  { name: "Users", href: "/users", icon: User, roles: ["ADMIN"] },
  {
    name: "WhatsApp",
    href: "/whatsapp",
    icon: MessageSquare,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Backups",
    href: "/backup",
    icon: Database,
    roles: ["ADMIN", "MANAGER"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!isCollapsed && (
          <>
            <Fuel className="text-red-600" size={24} />
            <span className="ml-3 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Pump Portal
            </span>
          </>
        )}
        {isCollapsed && <Fuel className="text-red-600 mx-auto" size={24} />}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems
          .filter((item) => item.roles.includes(user?.role || ""))
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-red-600/10 text-red-500"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100",
                  isCollapsed && "justify-center",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive
                      ? "text-red-500"
                      : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100",
                    !isCollapsed && "mr-3",
                  )}
                />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-900 p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3 rounded-lg bg-zinc-100 dark:bg-zinc-900/50 p-3 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-500 text-xs font-bold">
              {user?.username?.[0].toUpperCase() || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.username}
              </span>
              <span className="text-[10px] uppercase text-zinc-500">
                {user?.role}
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-500 text-xs font-bold">
              {user?.username?.[0].toUpperCase() || "U"}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={isCollapsed ? "Logout" : ""}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-red-500",
            isCollapsed && "justify-center",
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Logout"}
        </button>
      </div>
    </div>
  );
}
