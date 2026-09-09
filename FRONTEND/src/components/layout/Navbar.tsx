"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, PlusCircle, LayoutDashboard, FileText, BookOpen, Activity, AlertCircle, Users } from "lucide-react";
import { checkBackendHealth, getApiBaseUrl, isMockMode } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { useAuth } from "@/components/auth/AuthProvider";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<{
    checked: boolean;
    online: boolean;
    message: string;
  }>({
    checked: false,
    online: false,
    message: "Checking...",
  });

  const mockActive = isMockMode();

  useEffect(() => {
    let mounted = true;
    async function verifyHealth() {
      const res = await checkBackendHealth();
      if (mounted) {
        setBackendStatus({
          checked: true,
          online: res.online,
          message: res.message || (res.online ? "Online" : "Offline"),
        });
      }
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: ShieldCheck },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inspection/new", label: "New Inspection", icon: PlusCircle },
    { href: "/rules", label: "LMPC Rules", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  LM-Verify
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded">
                  SIH 2024
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium -mt-1 hidden sm:block">
                Legal Metrology Compliance
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Status indicator, Role Switcher, and CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            {user && user.role === "admin" && (
              <Link
                href="/admin/officers"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Users className="w-4 h-4" />
                Officers
              </Link>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 hidden sm:block">
                  {user.email}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                  {user.role}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Backend / Mock Status Indicator */}
          <div
            title={`Backend: ${getApiBaseUrl()} (${backendStatus.message})`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-600"
          >
            {mockActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="font-medium text-amber-800">Mock Mode</span>
              </>
            ) : backendStatus.online ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium text-emerald-700">API: 8000</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="font-medium text-slate-500">API Offline</span>
              </>
            )}
          </div>

          <Link
            href="/inspection/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Scan</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
