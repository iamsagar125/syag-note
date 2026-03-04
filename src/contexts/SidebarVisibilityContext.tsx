import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "syag_sidebar_open";

function readStored(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "false") return false;
    if (v === "true") return true;
  } catch {}
  return true;
}

interface SidebarVisibilityContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarVisibilityContext = createContext<SidebarVisibilityContextValue | null>(null);

export function SidebarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpenState] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(sidebarOpen));
    } catch {}
  }, [sidebarOpen]);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({ sidebarOpen, setSidebarOpen, toggleSidebar }),
    [sidebarOpen, setSidebarOpen, toggleSidebar]
  );

  return (
    <SidebarVisibilityContext.Provider value={value}>
      {children}
    </SidebarVisibilityContext.Provider>
  );
}

export function useSidebarVisibility() {
  const ctx = useContext(SidebarVisibilityContext);
  if (!ctx) throw new Error("useSidebarVisibility must be used within SidebarVisibilityProvider");
  return ctx;
}
