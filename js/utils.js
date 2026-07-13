(function (global) {
  "use strict";

  const moneyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function clampAmount(value, config) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return config.minAmount;
    const clamped = Math.min(config.maxAmount, Math.max(config.minAmount, numeric));
    const stepped = config.minAmount + Math.round((clamped - config.minAmount) / config.amountStep) * config.amountStep;
    return Math.min(config.maxAmount, Math.max(config.minAmount, stepped));
  }

  function parseBRLMoney(value) {
    if (typeof value === "number") return value;
    const raw = String(value || "").trim().replace(/[^\d,.-]/g, "");
    if (!raw) return NaN;
    if (raw.includes(",")) return Number(raw.replace(/\./g, "").replace(",", "."));
    return Number(raw);
  }

  function calculateLoan(amount, installments, config) {
    const principal = clampAmount(amount, config);
    const n = Number(installments);
    const rate = Number(config.monthlyInterestRate);
    const downPaymentRate = Number(config.downPaymentRate || 0);
    if (!config.allowedInstallments.includes(n)) throw new Error("Quantidade de parcelas não permitida.");
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Taxa de juros inválida.");
    if (!Number.isFinite(downPaymentRate) || downPaymentRate < 0 || downPaymentRate >= 1) throw new Error("Percentual de entrada inválido.");

    const downPayment = roundMoney(principal * downPaymentRate);
    const financedAmount = roundMoney(principal - downPayment);

    let payment;
    let installmentTotal;
    if (config.calculationMethod === "PRICE") {
      payment = rate === 0 ? financedAmount / n : financedAmount * rate / (1 - Math.pow(1 + rate, -n));
      installmentTotal = payment * n;
    } else if (config.calculationMethod === "SIMPLE") {
      installmentTotal = financedAmount * (1 + rate * n);
      payment = installmentTotal / n;
    } else {
      throw new Error("Método de cálculo inválido.");
    }
    if (![payment, installmentTotal].every(Number.isFinite) || payment < 0 || installmentTotal < 0) throw new Error("Não foi possível calcular a simulação.");
    payment = roundMoney(payment);
    installmentTotal = roundMoney(payment * n);
    const total = roundMoney(downPayment + installmentTotal);
    return { amount: roundMoney(principal), downPaymentRate, downPayment, financedAmount, installments: n, rate, payment, installmentTotal, total, interest: roundMoney(total - principal), method: config.calculationMethod };
  }

  function formatMoney(value) { return moneyFormatter.format(Number(value) || 0); }
  function formatRate(value) { return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value) * 100)}% a.m.`; }
  function digitsOnly(value) { return String(value || "").replace(/\D/g, ""); }
  function formatCPF(value) {
    return digitsOnly(value).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  function isValidCPF(value) {
    const cpf = digitsOnly(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const digit = (length) => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
      const result = (sum * 10) % 11;
      return result === 10 ? 0 : result;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
  }
  function formatPhone(value) {
    const phone = digitsOnly(value).slice(0, 11);
    if (phone.length <= 10) return phone.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return phone.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  function isValidPhone(value) {
    const phone = digitsOnly(value);
    return phone.length === 11 && /^[1-9]{2}9\d{8}$/.test(phone);
  }
  function normalizeName(value) { return String(value || "").trim().replace(/\s+/g, " "); }
  function isValidName(value) {
    const name = normalizeName(value);
    return name.length >= 5 && name.length <= 100 && !/^\d+$/.test(name) && name.split(" ").filter((part) => part.length >= 2).length >= 2;
  }
  function calculateAge(value, referenceDate = new Date()) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return NaN;
    const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > referenceDate) return NaN;
    let age = referenceDate.getFullYear() - year;
    const beforeBirthday = referenceDate.getMonth() < month - 1 || (referenceDate.getMonth() === month - 1 && referenceDate.getDate() < day);
    if (beforeBirthday) age -= 1;
    return age;
  }
  function isAdultBirthDate(value, referenceDate = new Date()) {
    const age = calculateAge(value, referenceDate);
    return Number.isFinite(age) && age >= 18 && age <= 120;
  }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function storageGet(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch (_) { return null; } }
  function storageSet(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  function installCommonUI() {
    const navToggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (navToggle && nav) navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
    });
    document.querySelectorAll("[data-nav] a").forEach((link) => link.addEventListener("click", () => {
      if (window.innerWidth < 768 && navToggle && nav) { nav.hidden = true; navToggle.setAttribute("aria-expanded", "false"); }
    }));
    if (global.LFY_CONFIG && global.LFY_CONFIG.demoMode) document.querySelectorAll("[data-demo-banner]").forEach((el) => { el.hidden = false; });
    document.querySelectorAll("[data-current-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  global.LFY = { roundMoney, clampAmount, parseBRLMoney, calculateLoan, formatMoney, formatRate, digitsOnly, formatCPF, isValidCPF, formatPhone, isValidPhone, normalizeName, isValidName, calculateAge, isAdultBirthDate, setText, storageGet, storageSet, installCommonUI };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", installCommonUI);
})(typeof window !== "undefined" ? window : globalThis);
