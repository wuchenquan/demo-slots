import type { BuildingDefinition } from "../simulation/types";

export const BUILDING_DEFINITIONS: BuildingDefinition[] = [
  { id: "gate", name: "Gate", weight: 0.92, icon: "🏰" },
  { id: "market", name: "Market", weight: 1.08, icon: "🏪" },
  { id: "workshop", name: "Workshop", weight: 1.16, icon: "🛠️" },
  { id: "tower", name: "Tower", weight: 1.28, icon: "🗼" },
  { id: "shrine", name: "Shrine", weight: 1.44, icon: "🔮" },
];

export const MAX_BUILDING_LEVEL = 3;
export const BASE_BUILDING_COST = 720;
