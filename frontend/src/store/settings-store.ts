import { create } from "zustand";

type SettingsState = {
  aiModel: string;
  temperature: number;
  maxTokens: number;
  sidebarCollapsed: boolean;

  setAiModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  loadFromServer: (settings: Partial<SettingsState>) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  aiModel: "llama-3.3-70b-versatile",
  temperature: 0.7,
  maxTokens: 4096,
  sidebarCollapsed: false,

  setAiModel: (model) => set({ aiModel: model }),
  setTemperature: (temp) => set({ temperature: temp }),
  setMaxTokens: (tokens) => set({ maxTokens: tokens }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  loadFromServer: (settings) => set((state) => ({ ...state, ...settings })),
}));
