const { chromium } = require("playwright");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const root = process.cwd();
  const fileUrl = pathToFileURL(path.join(root, "outputs", "slots-survival-demo", "index.html")).href;
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(fileUrl);
  await page.waitForSelector("#spinButton");

  async function settleModal() {
    const modalVisible = await page.locator("#modalBackdrop:not(.hidden)").count();
    if (!modalVisible) return;
    await page.evaluate(() => {
      const choice = document.querySelector("#modalBackdrop:not(.hidden) .choice-button");
      if (choice) {
        choice.click();
        return;
      }
      document.querySelector("#modalBackdrop:not(.hidden) #modalClose")?.click();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      if (!document.querySelector("#modalBackdrop")?.classList.contains("hidden")) {
        closeModal();
      }
    });
  }

  const initialLocks = await page.evaluate(() => ({
    auto: document.querySelector("#autoButton")?.textContent,
    two: document.querySelector('[data-multiplier="2"]')?.textContent,
    five: document.querySelector('[data-multiplier="5"]')?.textContent,
    stage: document.querySelector(".base-panel h2")?.textContent,
  }));

  const initialSpinCount = await page.evaluate(() => Number(document.querySelector("#spins")?.textContent.replaceAll(",", "")));
  let sawFreeSpinRefill = false;
  let allResultsHaveThreeIcons = true;
  let sawBlankIcon = false;
  for (let i = 0; i < initialSpinCount + 12; i += 1) {
    const currentSpins = await page.evaluate(() => Number(document.querySelector("#spins")?.textContent.replaceAll(",", "")));
    if (currentSpins <= 0) break;
    await page.click("#spinButton");
    await page.waitForTimeout(1450);
    await settleModal();
    await page.waitForTimeout(250);
    await settleModal();
    const lastResult = await page.locator("#lastResultLabel").innerText();
    if (lastResult.includes("抽奖次数补给")) sawFreeSpinRefill = true;
    const reelTexts = await page.$$eval(".reel span", (nodes) => nodes.map((node) => node.textContent));
    if (reelTexts.length !== 3 || reelTexts.some((text) => !text || text.trim() === "")) allResultsHaveThreeIcons = false;
    if (reelTexts.includes("·")) sawBlankIcon = true;
  }

  const beforeRecharge = await page.evaluate(() => ({
    spins: document.querySelector("#spins")?.textContent,
    coins: Number(document.querySelector("#coins")?.textContent.replaceAll(",", "")),
    needed: exactRechargeCoins(),
    remaining: remainingUpgradeCost(),
    complete: stageIsComplete(),
  }));

  await page.click("#spinButton");
  await page.waitForTimeout(250);
  const rechargeText = await page.locator("#modalContent").innerText();
  await page.click('[data-offer="stage-pack"]');
  await page.waitForTimeout(250);

  const afterRecharge = await page.evaluate(() => ({
    coins: Number(document.querySelector("#coins")?.textContent.replaceAll(",", "")),
    spins: Number(document.querySelector("#spins")?.textContent.replaceAll(",", "")),
    queuedRewards: state.completionRewards.length,
    rewardVariance: new Set(state.completionRewards).size,
    remaining: remainingUpgradeCost(),
  }));

  for (let i = 0; i < afterRecharge.spins; i += 1) {
    await page.click("#spinButton");
    await page.waitForTimeout(1050);
  }

  const afterPaidSpins = await page.evaluate(() => ({
    coins: Number(document.querySelector("#coins")?.textContent.replaceAll(",", "")),
    spins: Number(document.querySelector("#spins")?.textContent.replaceAll(",", "")),
    queuedRewards: state.completionRewards.length,
    remaining: remainingUpgradeCost(),
  }));

  for (let guard = 0; guard < 40; guard += 1) {
    const available = page.locator(".upgrade-button:not([disabled])").first();
    if (!(await available.count())) break;
    await available.click();
    await page.waitForTimeout(80);
    if (await page.locator("#modalBackdrop:not(.hidden) [data-next-stage]").count()) break;
  }

  await page.waitForTimeout(400);
  const stageCompleteText = await page.locator("#modalContent").innerText();
  await page.click("[data-next-stage]");
  await page.waitForTimeout(250);

  const secondStage = await page.evaluate(() => ({
    auto: document.querySelector("#autoButton")?.textContent,
    two: document.querySelector('[data-multiplier="2"]')?.textContent,
    five: document.querySelector('[data-multiplier="5"]')?.textContent,
    stage: document.querySelector(".base-panel h2")?.textContent,
    spins: document.querySelector("#spins")?.textContent,
    buildings: document.querySelectorAll(".building").length,
  }));

  const thirdStage = await page.evaluate(() => {
    startStage(2);
    return {
      auto: document.querySelector("#autoButton")?.textContent,
      two: document.querySelector('[data-multiplier="2"]')?.textContent,
      five: document.querySelector('[data-multiplier="5"]')?.textContent,
      stage: document.querySelector(".base-panel h2")?.textContent,
      spins: document.querySelector("#spins")?.textContent,
      buildings: document.querySelectorAll(".building").length,
    };
  });

  await page.screenshot({ path: "work/slots-demo-check.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "work/slots-demo-check-mobile.png", fullPage: true });

  await browser.close();

  const failures = [];
  if (!initialLocks.auto.includes("🔒")) failures.push("第一阶段自动转动未上锁");
  if (!initialLocks.two.includes("🔒")) failures.push("第一阶段 2 倍未上锁");
  if (!initialLocks.five.includes("🔒")) failures.push("第一阶段 5 倍未上锁");
  if (initialSpinCount !== 20) failures.push("第一阶段初始抽奖次数不是 20");
  if (!sawFreeSpinRefill) failures.push("免费流程中没有抽到抽奖次数补给");
  if (!allResultsHaveThreeIcons) failures.push("存在不是三个图标的抽奖结果");
  if (sawBlankIcon) failures.push("抽奖结果仍出现空白图标");
  if (beforeRecharge.spins !== "0") failures.push("第一阶段免费转次数未耗尽");
  if (beforeRecharge.complete) failures.push("免费转次数耗尽前已经完成阶段");
  if (!rechargeText.includes("1 美元")) failures.push("补给弹窗未显示 1 美元");
  if (!rechargeText.includes("抽奖机会")) failures.push("补给弹窗未显示抽奖机会");
  if (afterRecharge.coins !== beforeRecharge.coins) failures.push("充值后直接增加了金币");
  if (afterRecharge.spins <= 0) failures.push("充值后未增加抽奖次数");
  if (afterRecharge.queuedRewards !== afterRecharge.spins) failures.push("付费抽奖奖励队列与次数不一致");
  if (afterRecharge.queuedRewards > 1 && afterRecharge.rewardVariance <= 1) failures.push("付费抽奖奖励没有随机波动");
  if (afterPaidSpins.coins !== afterPaidSpins.remaining) failures.push("付费抽奖后金币未精确等于剩余升级成本");
  if (afterPaidSpins.spins !== 0 || afterPaidSpins.queuedRewards !== 0) failures.push("付费抽奖机会未正确消耗完");
  if (!stageCompleteText.includes("阶段完成")) failures.push("升满建筑后未出现阶段完成弹窗");
  if (secondStage.stage !== "霜脊营地") failures.push("未进入第二阶段");
  if (secondStage.auto.includes("🔒")) failures.push("第二阶段自动转动仍上锁");
  if (secondStage.two.includes("🔒")) failures.push("第二阶段 2 倍仍上锁");
  if (!secondStage.five.includes("🔒")) failures.push("第二阶段 5 倍未上锁");
  if (secondStage.buildings !== 5) failures.push("第二阶段不是 5 个建筑");
  if (thirdStage.stage !== "星火堡垒") failures.push("未能进入第三阶段");
  if (thirdStage.five.includes("🔒")) failures.push("第三阶段 5 倍仍上锁");
  if (thirdStage.buildings !== 5) failures.push("第三阶段不是 5 个建筑");
  if (errors.length) failures.push(...errors);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        initialLocks,
        initialSpinCount,
        sawFreeSpinRefill,
        allResultsHaveThreeIcons,
        sawBlankIcon,
        beforeRecharge,
        rechargeText,
        afterRecharge,
        afterPaidSpins,
        secondStage,
        thirdStage,
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
