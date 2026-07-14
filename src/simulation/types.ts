export type RewardType =
  | "smallCoins"
  | "bigCoins"
  | "attack"
  | "raid"
  | "shield"
  | "combo";

export type PaypointType = "nearGoal" | "eventRush" | "revenge" | "outOfEnergy";

export type Encounter =
  | { type: "attack"; targetIds: string[]; resolved: boolean }
  | { type: "raid"; targetId: string; picksLeft: number; tiles: RaidTile[]; resolved: boolean };

export interface RewardDefinition {
  type: RewardType;
  label: string;
  weight: number;
}

export interface BuildingDefinition {
  id: string;
  name: string;
  weight: number;
  icon: string;
}

export interface BuildingState extends BuildingDefinition {
  level: number;
  damaged: boolean;
}

export interface OpponentState {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  shields: number;
  progress: number;
  score: number;
}

export interface RaidTile {
  id: string;
  label: string;
  value: number;
  revealed: boolean;
}

export interface LiveOpsState {
  tournamentRemaining: number;
  rewardRushRemaining: number;
  tournamentScore: number;
}

export interface SessionMetrics {
  spins: number;
  coinsEarned: number;
  coinsSpent: number;
  energySpent: number;
  attacks: number;
  raids: number;
  shieldsUsed: number;
  paypointSignals: number;
}

export interface GameEvent {
  id: number;
  tone: "win" | "risk" | "social" | "system";
  text: string;
}

export interface PaypointSignal {
  type: PaypointType;
  title: string;
  reason: string;
}

export interface GameState {
  energy: number;
  coins: number;
  shields: number;
  multiplier: 1 | 2 | 5 | 10;
  island: number;
  buildings: BuildingState[];
  opponents: OpponentState[];
  liveOps: LiveOpsState;
  metrics: SessionMetrics;
  events: GameEvent[];
  activePaypoints: PaypointSignal[];
  encounter: Encounter | null;
  lastReward: RewardType | null;
  revengeTargetId: string | null;
  eventSeq: number;
}
