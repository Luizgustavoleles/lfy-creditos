(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("simulation-form");
    if (!form) return;
    const range = document.getElementById("amount-range");
    const input = document.getElementById("amount-input");
    const installmentGroup = document.getElementById("installment-options");
    const previous = LFY.storageGet("lfySimulation");
    let amount = LFY.clampAmount(previous?.amount ?? 1000, LFY_CONFIG);
    let installments = LFY_CONFIG.allowedInstallments.includes(Number(previous?.installments)) ? Number(previous.installments) : 6;
    if (!LFY_CONFIG.allowedInstallments.includes(installments)) installments = LFY_CONFIG.allowedInstallments[0];

    range.min = LFY_CONFIG.minAmount; range.max = LFY_CONFIG.maxAmount; range.step = LFY_CONFIG.amountStep;
    LFY.setText("amount-min", LFY.formatMoney(LFY_CONFIG.minAmount));
    LFY.setText("amount-max", LFY.formatMoney(LFY_CONFIG.maxAmount));
    installmentGroup.innerHTML = "";
    LFY_CONFIG.allowedInstallments.forEach((number) => {
      const label = document.createElement("label"); label.className = "installment-option";
      const radio = document.createElement("input"); radio.type = "radio"; radio.name = "installments"; radio.value = number; radio.checked = number === installments;
      const span = document.createElement("span"); span.textContent = `${number}x`;
      label.append(radio, span); installmentGroup.append(label);
      radio.addEventListener("change", () => { installments = number; update(); });
    });

    function update() {
      amount = LFY.clampAmount(amount, LFY_CONFIG);
      range.value = amount;
      input.value = LFY.formatMoney(amount);
      const result = LFY.calculateLoan(amount, installments, LFY_CONFIG);
      LFY.setText("summary-amount", LFY.formatMoney(result.amount));
      LFY.setText("summary-down-payment", LFY.formatMoney(result.downPayment));
      LFY.setText("summary-financed", LFY.formatMoney(result.financedAmount));
      LFY.setText("summary-installments", `${result.installments}x`);
      LFY.setText("summary-rate", LFY.formatRate(result.rate));
      LFY.setText("summary-payment", LFY.formatMoney(result.payment));
      LFY.setText("summary-total", LFY.formatMoney(result.total));
      LFY.setText("summary-interest", LFY.formatMoney(result.interest));
      document.querySelector(".range-fill").style.setProperty("--range-progress", `${((amount - LFY_CONFIG.minAmount) / (LFY_CONFIG.maxAmount - LFY_CONFIG.minAmount)) * 100}%`);
    }
    range.addEventListener("input", () => { amount = Number(range.value); update(); });
    input.addEventListener("focus", () => input.select());
    input.addEventListener("blur", () => { amount = LFY.parseBRLMoney(input.value); update(); });
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      LFY.storageSet("lfySimulation", { amount, installments });
      window.location.href = "solicitar.html";
    });
    update();

    document.querySelectorAll(".faq-question").forEach((button) => button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      button.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    }));
  });
})();
