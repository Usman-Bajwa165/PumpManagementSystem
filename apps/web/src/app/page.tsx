"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Small delay for smooth transition if needed
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-sans">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin text-red-600 h-10 w-10 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight italic">
          Initializing Pump Management System...
        </h1>
        <p className="text-sm text-zinc-500">Redirecting to Control Panel</p>
      </div>
    </div>
  );
}
