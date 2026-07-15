const symbols = {
  coin: "🪙",
  bag: "💰",
  ticket: "🎟",
  attack: "⚔",
  raid: "🧲",
  shield: "🛡",
};

const spinResults = {
  oneCoin: ["coin", "bag", "coin"],
  threeCoins: ["coin", "coin", "coin"],
  coinBags: ["bag", "bag", "bag"],
  attack: ["attack", "attack", "attack"],
  raid: ["raid", "raid", "raid"],
  spinRefill: ["ticket", "ticket", "ticket"],
};

const openingDeck = ["threeCoins", "attack", "oneCoin", "spinRefill", "raid", "coinBags", "threeCoins", "oneCoin", "coinBags", "threeCoins"];
const randomDeck = ["oneCoin", "threeCoins", "coinBags", "attack", "raid", "oneCoin", "threeCoins", "coinBags"];
const animationSymbols = ["coin", "coin", "coin", "bag", "bag", "attack", "raid", "ticket"];
const coinValues = { coin: 260, bag: 1250 };

const stageConfigs = [
  {
    name: "尘落哨站",
    freeSpins: 20,
    buildings: [
      { id: "gate", name: "废料大门", icon: "🚪", costs: [450, 800, 1350, 2100, 3200] },
      { id: "tower", name: "信号塔", icon: "📡", costs: [500, 900, 1500, 2350, 3500] },
      { id: "garage", name: "突袭车库", icon: "🔧", costs: [420, 780, 1280, 2050, 3150] },
      { id: "vault", name: "金币金库", icon: "🏦", costs: [580, 980, 1650, 2500, 3800] },
      { id: "reactor", name: "护盾反应堆", icon: "⚡", costs: [520, 920, 1550, 2400, 3650] },
    ],
  },
  {
    name: "霜脊营地",
    freeSpins: 24,
    buildings: [
      { id: "wall", name: "冰封围墙", icon: "🧱", costs: [900, 1450, 2200, 3300, 4700] },
      { id: "beacon", name: "极光灯塔", icon: "💡", costs: [850, 1350, 2100, 3200, 4550] },
      { id: "hangar", name: "雪地机库", icon: "🚜", costs: [920, 1480, 2250, 3400, 4850] },
      { id: "depot", name: "寒铁仓库", icon: "🏚", costs: [980, 1550, 2380, 3550, 5100] },
      { id: "clinic", name: "修复医站", icon: "🏥", costs: [880, 1420, 2180, 3250, 4650] },
    ],
  },
  {
    name: "星火堡垒",
    freeSpins: 28,
    buildings: [
      { id: "citadel", name: "核心堡垒", icon: "🏰", costs: [1500, 2300, 3400, 5000, 7200] },
      { id: "array", name: "轨道天线", icon: "🛰", costs: [1420, 2200, 3300, 4880, 7000] },
      { id: "armory", name: "合金军械库", icon: "🛠", costs: [1480, 2280, 3380, 4980, 7150] },
      { id: "bank", name: "中央金库", icon: "🏦", costs: [1600, 2400, 3600, 5250, 7600] },
      { id: "core", name: "星火反应炉", icon: "🌋", costs: [1520, 2320, 3480, 5100, 7350] },
    ],
  },
];

const rivalNames = ["诺瓦", "米卡", "奥里恩", "薇拉", "杰特"];

const milestoneTemplate = [
  { points: 20, reward: { coins: 600 }, claimed: false },
  { points: 50, reward: { coins: 1200, shields: 1 }, claimed: false },
  { points: 100, reward: { coins: 2600, shields: 2 }, claimed: false },
];

const state = {
  stageIndex: 0,
  coins: 0,
  spins: 0,
  shields: 1,
  eventPoints: 0,
  multiplier: 1,
  spinning: false,
  auto: false,
  spinCount: 0,
  eventSeconds: 300,
  feed: [],
  buildings: [],
  rivals: [],
  milestones: [],
  completionRewards: [],
};

const els = {
  coins: document.querySelector("#coins"),
  spins: document.querySelector("#spins"),
  shields: document.querySelector("#shields"),
  eventPoints: document.querySelector("#eventPoints"),
  eventTimer: document.querySelector("#eventTimer"),
  eventProgressBar: document.querySelector("#eventProgressBar"),
  slotMachine: document.querySelector("#slotMachine"),
  reels: [document.querySelector("#reel0 span"), document.querySelector("#reel1 span"), document.querySelector("#reel2 span")],
  lastResultLabel: document.querySelector("#lastResultLabel"),
  lastReward: document.querySelector("#lastReward"),
  spinButton: document.querySelector("#spinButton"),
  autoButton: document.querySelector("#autoButton"),
  multiplierButtons: document.querySelectorAll("[data-multiplier]"),
  baseMap: document.querySelector("#baseMap"),
  baseTitle: document.querySelector(".base-panel h2"),
  baseProgress: document.querySelector("#baseProgress"),
  milestones: document.querySelector("#milestones"),
  leaderboard: document.querySelector("#leaderboard"),
  feedList: document.querySelector("#feedList"),
  toastStack: document.querySelector("#toastStack"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalClose: document.querySelector("#modalClose"),
  modalContent: document.querySelector("#modalContent"),
};

function currentStage() {
  return stageConfigs[state.stageIndex];
}

function stageNumber() {
  return state.stageIndex + 1;
}

function formatNumber(value) {
  return Math.floor(value).toLocaleString("zh-CN");
}

function cloneBuildings(stage) {
  return stage.buildings.map((building) => ({
    ...building,
    level: 0,
    health: 100,
  }));
}

function cloneMilestones() {
  return milestoneTemplate.map((milestone) => ({
    points: milestone.points,
    reward: { ...milestone.reward },
    claimed: false,
  }));
}

function createRivals() {
  return rivalNames.map((name, index) => ({
    name,
    score: 70 - index * 12 + state.stageIndex * 18,
    coins: 5200 + index * 900 + state.stageIndex * 2600,
  }));
}

function remainingUpgradeCost() {
  return state.buildings.reduce((sum, building) => {
    return sum + building.costs.slice(building.level).reduce((subtotal, cost) => subtotal + cost, 0);
  }, 0);
}

function stageIsComplete() {
  return state.buildings.every((building) => building.level >= building.costs.length);
}

function exactRechargeCoins() {
  return Math.max(0, remainingUpgradeCost() - state.coins);
}

function rechargeSpinCount(neededCoins) {
  if (neededCoins <= 0) return 0;
  return Math.max(5, Math.min(10, Math.ceil(neededCoins / 7000)));
}

function buildCompletionRewards(totalCoins) {
  const count = rechargeSpinCount(totalCoins);
  if (count === 0) return [];
  const weights = Array.from({ length: count }, () => 0.72 + Math.random() * 0.72);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const rewards = weights.map((weight) => Math.max(1, Math.floor((totalCoins * weight) / weightTotal)));
  const currentTotal = rewards.reduce((sum, reward) => sum + reward, 0);
  rewards[rewards.length - 1] += totalCoins - currentTotal;
  return rewards;
}

function addCoins(amount) {
  state.coins += amount;
  bump(els.coins);
}

function addEventPoints(amount) {
  state.eventPoints += amount;
  bump(els.eventPoints);
}

function spendSpins(amount) {
  state.spins = Math.max(0, state.spins - amount);
  bump(els.spins);
}

function addFeed(title, body, revengeTarget = null) {
  state.feed.unshift({ title, body, revengeTarget });
  state.feed = state.feed.slice(0, 6);
  renderFeed();
}

function toast(title, body) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
  while (els.toastStack.children.length >= 3) {
    els.toastStack.firstElementChild?.remove();
  }
  els.toastStack.appendChild(node);
  window.setTimeout(() => node.remove(), 3600);
}

function bump(node) {
  node.classList.remove("bump");
  void node.offsetWidth;
  node.classList.add("bump");
}

function renderAll() {
  els.coins.textContent = formatNumber(state.coins);
  els.spins.textContent = formatNumber(state.spins);
  els.shields.textContent = formatNumber(state.shields);
  els.eventPoints.textContent = formatNumber(state.eventPoints);
  els.spinButton.disabled = state.spinning;
  els.baseTitle.textContent = currentStage().name;
  renderControls();
  renderBase();
  renderMilestones();
  renderLeaderboard();
  renderEventProgress();
}

function renderControls() {
  const unlockedAuto = stageNumber() >= 2;
  els.autoButton.classList.toggle("locked", !unlockedAuto);
  els.autoButton.textContent = unlockedAuto ? (state.auto ? "停止" : "自动") : "自动🔒";
  els.autoButton.setAttribute("aria-pressed", state.auto ? "true" : "false");

  els.multiplierButtons.forEach((button) => {
    const value = Number(button.dataset.multiplier);
    const requiredStage = value === 5 ? 3 : value === 2 ? 2 : 1;
    const locked = stageNumber() < requiredStage || (state.completionRewards.length > 0 && value > 1);
    button.classList.toggle("locked", locked);
    button.classList.toggle("selected", state.multiplier === value);
    button.textContent = locked ? `${value}倍🔒` : `${value}倍`;
    button.setAttribute("aria-disabled", locked ? "true" : "false");
  });
}

function renderBase() {
  els.baseMap.innerHTML = "";
  const totalLevels = state.buildings.length * 5;
  const currentLevels = state.buildings.reduce((sum, building) => sum + building.level, 0);
  els.baseProgress.textContent = `${Math.round((currentLevels / totalLevels) * 100)}%`;

  state.buildings.forEach((building) => {
    const cost = building.costs[building.level] ?? null;
    const node = document.createElement("article");
    node.className = "building";
    node.dataset.id = building.id;
    node.innerHTML = `
      <div class="building-top">
        <span class="building-icon">${building.icon}</span>
        <div>
          <div class="building-name">${building.name}</div>
          <div class="building-level">等级 ${building.level}/5</div>
        </div>
        <strong>${building.health}%</strong>
      </div>
      <div class="health-row"><span style="width:${building.health}%"></span></div>
      <div class="building-footer">
        <div class="progress-track"><span style="width:${(building.level / 5) * 100}%"></span></div>
        <button class="upgrade-button" data-building="${building.id}" ${cost === null ? "disabled" : ""}>
          ${cost === null ? "满级" : `${formatNumber(cost)} 🪙`}
        </button>
      </div>
    `;
    els.baseMap.appendChild(node);
  });
}

function renderMilestones() {
  els.milestones.innerHTML = "";
  state.milestones.forEach((milestone) => {
    const ready = state.eventPoints >= milestone.points && !milestone.claimed;
    const rewards = [];
    if (milestone.reward.coins) rewards.push(`+${formatNumber(milestone.reward.coins)} 金币`);
    if (milestone.reward.shields) rewards.push(`+${milestone.reward.shields} 护盾`);

    const node = document.createElement("div");
    node.className = `milestone ${milestone.claimed ? "claimed" : ""}`;
    node.innerHTML = `
      <div>
        <strong>${milestone.points} 分</strong>
        <p>${rewards.join(" · ")}</p>
      </div>
      <button class="claim-button" data-milestone="${milestone.points}" ${ready ? "" : "disabled"}>
        ${milestone.claimed ? "已领" : "领取"}
      </button>
    `;
    els.milestones.appendChild(node);
  });
}

function renderLeaderboard() {
  const entries = [
    ...state.rivals.map((rival) => ({ ...rival, player: false })),
    { name: "你", score: state.eventPoints, coins: state.coins, player: true },
  ].sort((a, b) => b.score - a.score);

  els.leaderboard.innerHTML = "";
  entries.forEach((entry, index) => {
    const node = document.createElement("li");
    node.className = entry.player ? "player" : "";
    node.innerHTML = `<strong>#${index + 1}</strong><span>${entry.name}</span><b>${formatNumber(entry.score)}</b>`;
    els.leaderboard.appendChild(node);
  });
}

function renderEventProgress() {
  const next = state.milestones.find((milestone) => !milestone.claimed);
  const target = next ? next.points : state.milestones[state.milestones.length - 1].points;
  const percent = Math.min(100, (state.eventPoints / target) * 100);
  els.eventProgressBar.style.width = `${percent}%`;
}

function renderFeed() {
  els.feedList.innerHTML = "";
  const items = state.feed.length
    ? state.feed
    : [
        { title: "阶段目标", body: "用完免费转次数后，补齐本阶段剩余建筑。" },
        { title: "荒原掠夺赛", body: "完成行动，冲上掠夺榜。" },
        { title: "护盾待命", body: "护盾会抵挡下一次来袭。" },
      ];

  items.slice(0, 3).forEach((item) => {
    const node = document.createElement("article");
    node.className = "feed-item";
    node.innerHTML = `<strong>${item.title}</strong><p>${item.body}</p>`;
    if (item.revengeTarget) {
      const button = document.createElement("button");
      button.className = "revenge-button";
      button.type = "button";
      button.textContent = "复仇";
      button.addEventListener("click", () => openAttackModal(item.revengeTarget));
      node.appendChild(button);
    }
    els.feedList.appendChild(node);
  });
}

function chooseResult() {
  if (state.spinCount < openingDeck.length) {
    return openingDeck[state.spinCount];
  }
  return randomDeck[Math.floor(Math.random() * randomDeck.length)];
}

function resolveReels(reels, completionReward = null) {
  if (completionReward !== null) {
    return {
      label: "阶段补给转动",
      reward: completionReward,
      event: 0,
      special: null,
      message: `+${formatNumber(completionReward)} 金币`,
    };
  }

  const same = reels.every((symbol) => symbol === reels[0]);
  if (same && reels[0] === "attack") {
    return { label: "攻击信号", reward: 560, event: 5, special: "attack", message: "+560 金币" };
  }
  if (same && reels[0] === "raid") {
    return { label: "掠夺窗口", reward: 820, event: 10, special: "raid", message: "+820 金币" };
  }
  if (same && reels[0] === "ticket") {
    return { label: "抽奖次数补给", reward: 0, spins: 5, event: 2, special: "spinRefill", message: "+5 次抽奖" };
  }

  const reward = reels.reduce((sum, symbol) => sum + (coinValues[symbol] || 0), 0);
  const coinCount = reels.filter((symbol) => symbol === "coin").length;
  const bagCount = reels.filter((symbol) => symbol === "bag").length;
  let label = "金币奖励";
  if (coinCount === 3) label = "三枚金币";
  if (bagCount === 3) label = "金币袋";
  if (coinCount === 1 && bagCount === 0) label = "一枚金币";
  return {
    label,
    reward,
    event: Math.max(1, coinCount + bagCount * 3),
    special: null,
    message: `+${formatNumber(reward)} 金币`,
  };
}

async function spin() {
  if (state.spinning) return;

  if (state.spins <= 0) {
    openRechargeModal();
    return;
  }

  if (state.spins < state.multiplier) {
    toast("转次数不足", "当前倍率需要更多转次数，请降低倍率。");
    return;
  }

  const completionSpin = state.completionRewards.length > 0;
  const resultKey = completionSpin ? "coinBags" : chooseResult();
  const reels = spinResults[resultKey];
  state.spinning = true;
  spendSpins(state.multiplier);
  state.spinCount += 1;
  els.slotMachine.classList.add("spinning");
  els.lastResultLabel.textContent = "转动中";
  els.lastReward.textContent = "结算中...";
  renderAll();

  const spinInterval = window.setInterval(() => {
    els.reels.forEach((reel) => {
      const randomKey = animationSymbols[Math.floor(Math.random() * animationSymbols.length)];
      reel.textContent = symbols[randomKey];
    });
  }, 90);

  await delay(820);
  window.clearInterval(spinInterval);
  reels.forEach((symbolKey, index) => {
    els.reels[index].textContent = symbols[symbolKey];
    bump(els.reels[index]);
  });
  els.slotMachine.classList.remove("spinning");

  const completionReward = completionSpin ? state.completionRewards.shift() : null;
  const result = resolveReels(reels, completionReward);
  const reward = completionSpin ? result.reward : result.reward * state.multiplier;
  if (reward > 0) {
    addCoins(reward);
  }
  if (!completionSpin && result.spins) {
    state.spins += result.spins * state.multiplier;
    bump(els.spins);
  }
  if (!completionSpin) {
    addEventPoints(result.event * state.multiplier);
  }
  els.lastResultLabel.textContent = result.label;
  els.lastReward.textContent = result.spins && !completionSpin ? `+${result.spins * state.multiplier} 次抽奖` : `+${formatNumber(reward)} 金币`;

  if (!completionSpin && result.special === "spinRefill") {
    toast("抽奖次数补给", `获得 ${result.spins * state.multiplier} 次抽奖机会。`);
  }

  if (!completionSpin && result.special === "attack") {
    window.setTimeout(() => openAttackModal(), 350);
  }

  if (!completionSpin && result.special === "raid") {
    window.setTimeout(() => openRaidModal(), 350);
  }

  if (!completionSpin && resultKey === "coinBags") {
    toast("金币袋", "获得一笔大奖。");
  }

  if (!completionSpin) {
    simulateRivals();
    maybeIncomingAttack();
  }
  state.spinning = false;
  renderAll();

  if (state.spins === 0 && !stageIsComplete()) {
    toast("免费转次数已用完", "再次点击转动可打开阶段补给。");
  }

  if (state.auto && state.spins >= state.multiplier && !["attack", "raid"].includes(result.special) && !completionSpin) {
    window.setTimeout(spin, 780);
  } else if (state.auto && state.spins < state.multiplier) {
    toggleAuto(false);
  }
}

function openAttackModal(targetName = null) {
  const target = targetName
    ? state.rivals.find((rival) => rival.name === targetName) || state.rivals[0]
    : state.rivals[Math.floor(Math.random() * state.rivals.length)];
  const targetBuildings = state.buildings.map((building) => ({
    ...building,
    enemyHealth: 55 + Math.floor(Math.random() * 45),
  }));

  openModal(`
    <h3 id="modalTitle">攻击 ${target.name} 的哨站</h3>
    <div class="choice-grid">
      ${targetBuildings
        .slice(0, 5)
        .map(
          (building) => `
          <button class="choice-button" data-attack="${target.name}" data-target="${building.name}" type="button">
            <span>${building.icon}</span>
            <strong>${building.name}</strong>
            <p>耐久 ${building.enemyHealth}%</p>
          </button>
        `,
        )
        .join("")}
    </div>
  `);
}

function resolveAttack(targetName, buildingName) {
  const reward = 820 * state.multiplier;
  addCoins(reward);
  addEventPoints(5 * state.multiplier);
  const rival = state.rivals.find((item) => item.name === targetName);
  if (rival) rival.score = Math.max(0, rival.score - 4);
  addFeed(`你攻击了${targetName}`, `${buildingName} 受损，获得 ${formatNumber(reward)} 金币。`);
  closeModal();
  toast("攻击完成", `${targetName} 的 ${buildingName} 被击破一段。`);
  renderAll();
}

function openRaidModal() {
  const target = state.rivals[Math.floor(Math.random() * state.rivals.length)];
  const vaults = [
    { label: "埋藏宝箱", icon: "🧰", multiplier: 1.8 },
    { label: "燃料柜", icon: "⛽", multiplier: 1.25 },
    { label: "信号货箱", icon: "📦", multiplier: 2.4 },
    { label: "旧地堡", icon: "🧱", multiplier: 1.1 },
    { label: "黄金藏点", icon: "💰", multiplier: 3.2 },
    { label: "诱饵箱", icon: "🪤", multiplier: 0.75 },
  ].sort(() => Math.random() - 0.5);

  openModal(`
    <h3 id="modalTitle">掠夺 ${target.name} 的金库</h3>
    <div class="choice-grid">
      ${vaults
        .map(
          (vault) => `
          <button class="choice-button" data-raid="${target.name}" data-mult="${vault.multiplier}" data-label="${vault.label}" type="button">
            <span>${vault.icon}</span>
            <strong>${vault.label}</strong>
            <p>点击打开</p>
          </button>
        `,
        )
        .join("")}
    </div>
  `);
}

function resolveRaid(targetName, multiplier, label) {
  const rival = state.rivals.find((item) => item.name === targetName);
  const baseReward = 900 * state.multiplier * Number(multiplier);
  const cap = rival ? Math.round(rival.coins * 0.08) : baseReward;
  const reward = Math.max(420, Math.round(Math.min(baseReward, cap + 1200)));
  addCoins(reward);
  addEventPoints(10 * state.multiplier);
  if (rival) {
    rival.coins = Math.max(0, rival.coins - Math.min(reward, cap));
    rival.score = Math.max(0, rival.score - 2);
  }
  addFeed(`你掠夺了${targetName}`, `${label} 开出 ${formatNumber(reward)} 金币。`);
  closeModal();
  toast("掠夺完成", "掠夺成功，金币增加。");
  renderAll();
}

function maybeIncomingAttack() {
  if (state.spinCount < 4 || Math.random() > 0.26) return;
  const rival = state.rivals[Math.floor(Math.random() * state.rivals.length)];
  const vulnerable = state.buildings.filter((building) => building.level > 0);
  const target = vulnerable[Math.floor(Math.random() * vulnerable.length)] || state.buildings[Math.floor(Math.random() * state.buildings.length)];

  if (state.shields > 0) {
    state.shields -= 1;
    addFeed(`${rival.name} 发起攻击`, `护盾挡住了对 ${target.name} 的伤害。`, rival.name);
    toast("护盾破裂", `${rival.name} 的攻击被抵挡。`);
    return;
  }

  target.health = Math.max(45, target.health - 18 - Math.floor(Math.random() * 18));
  const loss = Math.min(state.coins, Math.round(state.coins * 0.04));
  state.coins -= loss;
  addFeed(`${rival.name} 发起攻击`, `${target.name} 受损，损失 ${formatNumber(loss)} 金币。`, rival.name);
  renderAll();
  const node = document.querySelector(`[data-id="${target.id}"]`);
  if (node) node.classList.add("damaged");
}

function upgradeBuilding(id) {
  const building = state.buildings.find((item) => item.id === id);
  if (!building || building.level >= 5) return;

  const cost = building.costs[building.level];
  if (state.coins < cost) {
    if (state.spins <= 0) {
      openRechargeModal();
    } else {
      toast("金币不足", "继续转动，积累本阶段升级金币。");
    }
    return;
  }

  state.coins -= cost;
  building.level += 1;
  building.health = Math.min(100, building.health + 15);
  addEventPoints(1);
  addFeed("基地升级", `${building.name} 达到 ${building.level} 级。`);
  toast("升级完成", `${building.name} ${building.level} 级`);
  renderAll();

  if (stageIsComplete()) {
    window.setTimeout(openStageCompleteModal, 250);
  }
}

function claimMilestone(points) {
  const milestone = state.milestones.find((item) => item.points === points);
  if (!milestone || milestone.claimed || state.eventPoints < milestone.points) return;
  milestone.claimed = true;
  state.coins += milestone.reward.coins || 0;
  state.shields = Math.min(3, state.shields + (milestone.reward.shields || 0));
  toast("里程碑奖励", `${points} 分奖励已领取。`);
  renderAll();
}

function openRechargeModal() {
  if (stageIsComplete()) {
    openStageCompleteModal();
    return;
  }

  const neededCoins = exactRechargeCoins();
  const grantSpins = rechargeSpinCount(neededCoins);
  openModal(`
    <h3 id="modalTitle">阶段补给</h3>
    <p class="modal-copy">免费转次数已用完。支付 1 美元，获得 ${grantSpins} 次阶段抽奖机会。</p>
    <div class="offer">
      <div class="offer-card">
        <strong>1 美元</strong>
        <p>+${grantSpins} 次抽奖机会</p>
        <button class="modal-action" data-offer="stage-pack" type="button">充值并领取</button>
      </div>
    </div>
  `);
}

function resolveOffer(kind) {
  if (kind !== "stage-pack") return;
  const neededCoins = exactRechargeCoins();
  const rewards = buildCompletionRewards(neededCoins);
  state.completionRewards = rewards;
  state.spins += rewards.length;
  state.multiplier = 1;
  state.auto = false;
  closeModal();
  toast("抽奖机会已到账", `获得 ${rewards.length} 次阶段抽奖机会。`);
  renderAll();
}

function openStageCompleteModal() {
  const nextStage = state.stageIndex + 1;
  if (nextStage < stageConfigs.length) {
    openModal(`
      <h3 id="modalTitle">阶段完成</h3>
      <p class="modal-copy">${currentStage().name} 的全部建筑已升级完成。</p>
      <div class="modal-actions">
        <button class="modal-action" data-next-stage="${nextStage}" type="button">进入第 ${nextStage + 1} 阶段</button>
      </div>
    `);
    return;
  }

  openModal(`
    <h3 id="modalTitle">演示完成</h3>
    <p class="modal-copy">三个阶段的建筑都已升级完成。</p>
    <div class="modal-actions">
      <button class="modal-action" data-close-modal="true" type="button">返回查看</button>
    </div>
  `);
}

function startStage(index) {
  state.stageIndex = index;
  state.coins = 0;
  state.spins = currentStage().freeSpins;
  state.shields = 1;
  state.eventPoints = 0;
  state.multiplier = 1;
  state.spinning = false;
  state.auto = false;
  state.spinCount = 0;
  state.eventSeconds = 300;
  state.feed = [];
  state.buildings = cloneBuildings(currentStage());
  state.rivals = createRivals();
  state.milestones = cloneMilestones();
  state.completionRewards = [];
  els.reels.forEach((reel, index) => {
    reel.textContent = [symbols.coin, symbols.coin, symbols.coin][index];
  });
  els.lastResultLabel.textContent = "准备就绪";
  els.lastReward.textContent = "点击转动";
  addFeed(`第 ${stageNumber()} 阶段开启`, `获得 ${state.spins} 次免费转动。`);
  renderFeed();
  renderAll();
}

function simulateRivals() {
  state.rivals.forEach((rival) => {
    rival.score += Math.floor(Math.random() * 3);
  });
}

function openModal(markup) {
  els.modalContent.innerHTML = markup;
  els.modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  els.modalBackdrop.classList.add("hidden");
  els.modalContent.innerHTML = "";
}

function tickTimer() {
  state.eventSeconds = Math.max(0, state.eventSeconds - 1);
  const minutes = Math.floor(state.eventSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (state.eventSeconds % 60).toString().padStart(2, "0");
  els.eventTimer.textContent = `${minutes}:${seconds}`;
}

function toggleAuto(forceValue = null) {
  if (stageNumber() < 2) {
    toast("尚未解锁", "进入第二阶段后解锁自动转动。");
    return;
  }
  state.auto = forceValue === null ? !state.auto : forceValue;
  renderControls();
  if (state.auto) spin();
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function bindEvents() {
  els.spinButton.addEventListener("click", spin);
  els.autoButton.addEventListener("click", () => toggleAuto());
  els.modalClose.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });

  els.multiplierButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.multiplier);
      const requiredStage = value === 5 ? 3 : value === 2 ? 2 : 1;
      if (state.completionRewards.length > 0 && value > 1) {
        toast("补给转动中", "阶段补给转动固定为 1 倍。");
        return;
      }
      if (stageNumber() < requiredStage) {
        toast("尚未解锁", `进入第 ${requiredStage} 阶段后解锁 ${value} 倍下注。`);
        return;
      }
      state.multiplier = value;
      renderAll();
    });
  });

  document.addEventListener("click", (event) => {
    const upgrade = event.target.closest("[data-building]");
    if (upgrade) {
      upgradeBuilding(upgrade.dataset.building);
      return;
    }

    const milestone = event.target.closest("[data-milestone]");
    if (milestone) {
      claimMilestone(Number(milestone.dataset.milestone));
      return;
    }

    const attack = event.target.closest("[data-attack]");
    if (attack) {
      resolveAttack(attack.dataset.attack, attack.dataset.target);
      return;
    }

    const raid = event.target.closest("[data-raid]");
    if (raid) {
      resolveRaid(raid.dataset.raid, raid.dataset.mult, raid.dataset.label);
      return;
    }

    const offer = event.target.closest("[data-offer]");
    if (offer) {
      resolveOffer(offer.dataset.offer);
      return;
    }

    const nextStage = event.target.closest("[data-next-stage]");
    if (nextStage) {
      closeModal();
      startStage(Number(nextStage.dataset.nextStage));
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      closeModal();
    }
  });
}

function init() {
  bindEvents();
  startStage(0);
  setInterval(tickTimer, 1000);
}

init();
