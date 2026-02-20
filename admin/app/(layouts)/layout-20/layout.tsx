"use client";

import { Layout20 } from "@/components/layouts/layout-20";
import { ReactNode, useEffect, useState } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { getToken } from "@/lib/auth";

export default function Layout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setReady(true);
  }, []);

  if (!ready) return <ScreenLoader />;

  return <Layout20>{children}</Layout20>;
}
