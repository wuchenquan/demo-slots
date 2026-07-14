import { useEffect, useMemo, useReducer, type Dispatch } from "react";
import { MAX_BUILDING_LEVEL } from "./data/buildings";
import { buildingCost, nearestUpgrade, progressPercent } from "./simulation/economy";
import { createInitialState, gameReducer, getLoopStage, getRankedPlayers, type GameAction } from "./simulation/state";
import type { GameState, OpponentState, PaypointSignal } from "./simulation/types";

const multipliers = [1, 2, 5, 10] as const;

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const rankedPlayers = useMemo(() => getRankedPlayers(state), [state]);
  const nearest = nearestUpgrade(state);
  const progress = progressPercent(state.buildings);

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="app-shell">
      <header className="hero-bar">
        <div>
          <p className="eyebrow">Portfolio systems prototype</p>
          <h1><span aria-hidden="true">🎰</span> Demo Slots</h1>
        </div>
        <div className="hero-summary">
          <span>✨ {getLoopStage(state)}</span>
          <strong>Island {state.island}</strong>
        </div>
      </header>

      <ResourceBar state={state} dispatch={dispatch} />

      <section className="dashboard-grid">
        <section className="panel spin-panel" aria-label="Spin controls">
          <SpinPanel state={state} dispatch={dispatch} />
        </section>

        <section className="panel build-panel" aria-label="Build progress">
          <BuildingBoard state={state} dispatch={dispatch} progress={progress} />
        </section>

        <section className="panel live-panel" aria-label="Live operations">
          <LiveOpsPanel state={state} rankedPlayers={rankedPlayers} />
        </section>
      </section>

      <section className="lower-grid">
        <section className="panel" aria-label="Encounter">
          <EncounterPanel state={state} dispatch={dispatch} />
        </section>
        <section className="panel" aria-label="Design signals">
          <DesignPanel state={state} nearest={nearest} />
        </section>
        <section className="panel" aria-label="Session metrics">
          <MetricsPanel state={state} progress={progress} />
        </section>
      </section>

      <section className="event-log" aria-label="Event stream">
        {state.events.map((event) => (
          <p key={event.id} className={`event event-${event.tone}`}>{event.text}</p>
        ))}
      </section>
    </main>
  );
}

function ResourceBar({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  return (
    <section className="resource-bar" aria-label="Resources">
      <Resource label="🪙 Coins" value={formatNumber(state.coins)} />
      <Resource label="⚡ Energy" value={state.energy} />
      <Resource label="🛡️ Shields" value={`${state.shields}/3`} />
      <div className="resource multiplier-group">
        <span>🚀 Multiplier</span>
        <div className="segmented" role="group" aria-label="Bet multiplier">
          {multipliers.map((multiplier) => (
            <button
              key={multiplier}
              type="button"
              className={state.multiplier === multiplier ? "is-active" : ""}
              onClick={() => dispatch({ type: "setMultiplier", multiplier })}
            >
              x{multiplier}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Resource({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="resource">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SpinPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const blocked = state.energy < state.multiplier || Boolean(state.encounter);
  return (
    <>
      <div className="panel-heading">
        <p className="eyebrow">Core input</p>
        <h2>Tap. Win. Spend.</h2>
      </div>
      <button
        type="button"
        className="spin-button"
        onClick={() => dispatch({ type: "spin" })}
        disabled={Boolean(state.encounter)}
      >
        <span aria-hidden="true" className="spin-emoji">{state.energy < state.multiplier ? "🪫" : "🎰"}</span>
        <span>{state.energy < state.multiplier ? "Energy Empty" : "Spin"}</span>
        <small>Costs {state.multiplier} energy</small>
      </button>
      <div className="spin-status">
        <span>Last result</span>
        <strong>{state.lastReward ? `${rewardEmoji(state.lastReward)} ${labelReward(state.lastReward)}` : "✨ Ready"}</strong>
      </div>
      {blocked && (
        <button type="button" className="secondary-action" onClick={() => dispatch({ type: "refillEnergy" })}>
          Demo refill +50 energy
        </button>
      )}
    </>
  );
}

function BuildingBoard({ state, dispatch, progress }: { state: GameState; dispatch: Dispatch<GameAction>; progress: number }) {
  return (
    <>
      <div className="panel-heading inline-heading">
        <div>
          <p className="eyebrow">Coin sink</p>
          <h2>Island progress</h2>
        </div>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-track" aria-label={`Island progress ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="building-grid">
        {state.buildings.map((building) => {
          const cost = buildingCost(building, state.island);
          const complete = building.level >= MAX_BUILDING_LEVEL;
          const canUpgrade = !complete && state.coins >= cost;
          return (
            <article key={building.id} className={`building-card ${building.damaged ? "is-damaged" : ""}`}>
              <div className="building-icon" aria-hidden="true">{building.icon}</div>
              <div>
                <h3>{building.name}</h3>
                <p>Level {building.level}/{MAX_BUILDING_LEVEL}</p>
                {building.damaged && <p className="warning-text">💥 Damaged by rival</p>}
              </div>
              <button
                type="button"
                disabled={complete}
                className={canUpgrade ? "upgrade-button can-upgrade" : "upgrade-button"}
                onClick={() => dispatch({ type: "upgrade", buildingId: building.id })}
              >
                {complete ? "Done" : `${formatNumber(cost)} coins`}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}

function LiveOpsPanel({ state, rankedPlayers }: { state: GameState; rankedPlayers: ReturnType<typeof getRankedPlayers> }) {
  const topRank = rankedPlayers.findIndex((player) => player.current) + 1;
  return (
    <>
      <div className="panel-heading">
        <p className="eyebrow">LiveOps pressure</p>
        <h2>Flash Tournament</h2>
      </div>
      <div className="timer-row">
        <div>
          <span>Time left</span>
          <strong>{formatTime(state.liveOps.tournamentRemaining)}</strong>
        </div>
        <div>
          <span>Your rank</span>
          <strong>#{topRank}</strong>
        </div>
      </div>
      <div className="rush-badge" aria-live="polite">
        ⚡ Reward Rush {state.liveOps.rewardRushRemaining > 0 ? formatTime(state.liveOps.rewardRushRemaining) : "ended"}
      </div>
      <ol className="leaderboard">
        {rankedPlayers.slice(0, 6).map((player, index) => (
          <li key={player.id} className={player.current ? "is-you" : ""}>
            <span>{index + 1}. {player.current ? "👑" : opponentAvatar(state, player.id)} {player.name}</span>
            <strong>{formatNumber(player.score)}</strong>
          </li>
        ))}
      </ol>
    </>
  );
}

function EncounterPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  if (!state.encounter) {
    return (
      <>
        <div className="panel-heading">
          <p className="eyebrow">T3-MCA layer</p>
          <h2>No bonus active</h2>
        </div>
        <p className="muted-copy">⚔️ Attack and 💰 Raid results interrupt passive spinning with light agency and social emotion.</p>
      </>
    );
  }

  if (state.encounter.type === "attack") {
    const targets = state.encounter.targetIds
      .map((id) => state.opponents.find((opponent) => opponent.id === id))
      .filter(Boolean) as OpponentState[];
    return (
      <>
        <div className="panel-heading">
          <p className="eyebrow">Magician's choice</p>
          <h2>Pick a target</h2>
        </div>
        <div className="target-list">
          {targets.map((target) => (
            <button key={target.id} type="button" onClick={() => dispatch({ type: "resolveAttack", targetId: target.id })}>
              <span>{target.avatar} {target.name}</span>
              <small>🛡️ {target.shields} shields · 🏗️ {target.progress}% built</small>
            </button>
          ))}
        </div>
      </>
    );
  }

  const raid = state.encounter;
  const target = state.opponents.find((opponent) => opponent.id === raid.targetId);
  return (
    <>
      <div className="panel-heading">
        <p className="eyebrow">Raid spike</p>
        <h2>{target ? `${target.avatar} ${target.name}` : "Rival"} vault</h2>
      </div>
      <div className="raid-grid">
        {raid.tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={tile.revealed || raid.resolved}
            onClick={() => dispatch({ type: "revealRaid", tileId: tile.id })}
          >
            {tile.revealed ? (
              <>
                <strong>{raidTileEmoji(tile.label)} {tile.label}</strong>
                <span>+{formatNumber(tile.value)}</span>
              </>
            ) : (
              <span>❔ Pick</span>
            )}
          </button>
        ))}
      </div>
      <div className="encounter-footer">
        <span>{Math.max(0, raid.picksLeft)} picks left</span>
        {raid.resolved && (
          <button type="button" className="secondary-action compact" onClick={() => dispatch({ type: "closeEncounter" })}>
            Return to spin
          </button>
        )}
      </div>
    </>
  );
}

function DesignPanel({ state, nearest }: { state: GameState; nearest: ReturnType<typeof nearestUpgrade> }) {
  return (
    <>
      <div className="panel-heading">
        <p className="eyebrow">Designer readout</p>
        <h2>{getLoopStage(state)}</h2>
      </div>
      {nearest && (
        <div className="near-goal">
          <span>Nearest upgrade</span>
          <strong>{nearest.building.name}: {formatNumber(nearest.cost)} coins</strong>
          <small>{state.coins >= nearest.cost ? "Ready to upgrade" : `${formatNumber(nearest.cost - state.coins)} short`}</small>
        </div>
      )}
      <div className="paypoint-list">
        {state.activePaypoints.length === 0 ? (
          <p className="muted-copy">🌱 No paypoint signal yet. The loop is still paying out or building intent.</p>
        ) : (
          state.activePaypoints.map((signal) => <Paypoint key={signal.type} signal={signal} />)
        )}
      </div>
    </>
  );
}

function Paypoint({ signal }: { signal: PaypointSignal }) {
  return (
    <article className="paypoint">
      <strong>{paypointEmoji(signal.type)} {signal.title}</strong>
      <p>{signal.reason}</p>
    </article>
  );
}

function MetricsPanel({ state, progress }: { state: GameState; progress: number }) {
  const metrics = [
    ["Spins", state.metrics.spins],
    ["Coins earned", formatNumber(state.metrics.coinsEarned)],
    ["Coins spent", formatNumber(state.metrics.coinsSpent)],
    ["Energy spent", state.metrics.energySpent],
    ["Attacks", state.metrics.attacks],
    ["Raids", state.metrics.raids],
    ["Shields used", state.metrics.shieldsUsed],
    ["Paypoint signals", state.metrics.paypointSignals + state.activePaypoints.length],
    ["Upgrade progress", `${progress}%`],
  ];

  return (
    <>
      <div className="panel-heading">
        <p className="eyebrow">Session telemetry</p>
        <h2>Metrics</h2>
      </div>
      <dl className="metric-list">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function labelReward(reward: string): string {
  return reward
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function rewardEmoji(reward: string): string {
  const icons: Record<string, string> = {
    smallCoins: "🪙",
    bigCoins: "💎",
    attack: "⚔️",
    raid: "💰",
    shield: "🛡️",
    combo: "🎉",
  };
  return icons[reward] ?? "✨";
}

function paypointEmoji(type: string): string {
  const icons: Record<string, string> = {
    nearGoal: "🎯",
    eventRush: "⏳",
    revenge: "🔥",
    outOfEnergy: "🪫",
  };
  return icons[type] ?? "⚠️";
}

function raidTileEmoji(label: string): string {
  const icons: Record<string, string> = {
    Cache: "🧰",
    Vault: "🏦",
    Empty: "🫧",
    Bonus: "🎁",
    Chest: "🧳",
    Trap: "🕳️",
  };
  return icons[label] ?? "💰";
}

function opponentAvatar(state: GameState, id: string): string {
  return state.opponents.find((opponent) => opponent.id === id)?.avatar ?? "⭐";
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
