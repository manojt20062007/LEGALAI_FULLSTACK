"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiBaseUrl, apiClient } from "@/lib/api/client";
import { ShieldCheck, PlusCircle, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OfficersPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // In a real app, you'd fetch the list of officers here using a GET /officers endpoint
  // For this sprint, we're just adding the creation form.

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await apiClient("/api/v1/auth/officers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role: "officer" }),
      });
      setSuccess(true);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to create officer");
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-blue-700" />
        <h1 className="text-2xl font-bold text-slate-900">Officer Management</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          Register New Officer
        </h2>

        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Officer account successfully created! They can now log in.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer.name@legalai.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="securepassword123"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Registering..." : "Create Officer Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
