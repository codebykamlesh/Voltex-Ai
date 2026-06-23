import { create } from "zustand";

type UIState = {
  sidebarOpen: boolean;
  isMobile: boolean;
  theme: "dark" | "light" | "system";

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobile: (isMobile: boolean) => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  isMobile: false,
  theme: "dark",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobile: (isMobile) => set({ isMobile, sidebarOpen: !isMobile }),
  setTheme: (theme) => set({ theme }),
}));
