"use client";

import { useEffect } from "react";
import { getToken, setToken } from "@/lib/api-client";

export function TokenSync() {
  useEffect(() => {
    const token = getToken();
    if (token) {
      setToken(token);
    }
  }, []);

  return null;
}
