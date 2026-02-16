"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function DateTime() {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("en-PK", {
        timeZone: "Asia/Karachi",
        dateStyle: "medium",
        timeStyle: "medium",
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <Clock size={14} />
      <span>{currentTime}</span>
    </div>
  );
}
