(function () {
  "use strict";
  const openedAt = Date.now();
  let sending = false;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("request-form");
    if (!form) return;
    const simulation = LFY.storageGet("lfySimulation");
    if (!simulation) { window.location.replace("index.html#simular"); return; }
    let result;
    try { result = LFY.calculateLoan(simulation.amount, simulation.installments, LFY_CONFIG); }
    catch (_) { sessionStorage.removeItem("lfySimulation"); window.location.replace("index.html#simular"); return; }
    renderSummary(result);

    const name = document.getElementById("full-name");
    const birthDate = document.getElementById("birth-date");
    const cpf = document.getElementById("cpf");
    const phone = document.getElementById("phone");
    name.addEventListener("blur", () => { name.value = LFY.normalizeName(name.value); validateField(name); });
    const today = new Date();
    const maxBirth = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minBirth = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const toDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    birthDate.max = toDateInput(maxBirth); birthDate.min = toDateInput(minBirth);
    birthDate.addEventListener("change", () => validateField(birthDate));
    cpf.addEventListener("input", () => { cpf.value = LFY.formatCPF(cpf.value); clearError(cpf); });
    cpf.addEventListener("blur", () => validateField(cpf));
    phone.addEventListener("input", () => { phone.value = LFY.formatPhone(phone.value); clearError(phone); });
    phone.addEventListener("blur", () => validateField(phone));
    form.querySelectorAll("input[type=checkbox]").forEach((field) => field.addEventListener("change", () => validateField(field)));
    form.addEventListener("submit", (event) => submit(event, form, result));
  });

  function renderSummary(result) {
    LFY.setText("request-amount", LFY.formatMoney(result.amount));
    LFY.setText("request-down-payment", LFY.formatMoney(result.downPayment));
    LFY.setText("request-financed", LFY.formatMoney(result.financedAmount));
    LFY.setText("request-installments", `${result.installments}x`);
    LFY.setText("request-rate", LFY.formatRate(result.rate));
    LFY.setText("request-payment", LFY.formatMoney(result.payment));
    LFY.setText("request-total", LFY.formatMoney(result.total));
  }
  function errorId(field) { return `${field.id}-error`; }
  function showError(field, message) {
    field.setAttribute("aria-invalid", "true");
    const target = document.getElementById(errorId(field)); if (target) target.textContent = message;
  }
  function clearError(field) {
    field.removeAttribute("aria-invalid");
    const target = document.getElementById(errorId(field)); if (target) target.textContent = "";
  }
  function validateField(field) {
    clearError(field);
    if (field.id === "full-name" && !LFY.isValidName(field.value)) showError(field, "Informe nome e sobrenome válidos.");
    if (field.id === "birth-date" && !LFY.isAdultBirthDate(field.value)) showError(field, "Informe uma data válida. É necessário ter 18 anos ou mais.");
    if (field.id === "cpf" && !LFY.isValidCPF(field.value)) showError(field, "Informe um CPF válido.");
    if (field.id === "phone" && !LFY.isValidPhone(field.value)) showError(field, "Informe um celular com DDD, incluindo o 9.");
    if (field.type === "checkbox" && !field.checked) showError(field, "Esta confirmação é obrigatória.");
    return field.getAttribute("aria-invalid") !== "true";
  }
  function validateForm(form) {
    const fields = [...form.querySelectorAll("#full-name, #birth-date, #cpf, #phone, input[type=checkbox]")];
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) fields.find((field) => field.getAttribute("aria-invalid") === "true")?.focus();
    return valid;
  }
  function setStatus(message, kind) {
    const status = document.getElementById("form-status"); status.textContent = message; status.dataset.kind = kind || "";
  }
  async function submit(event, form, result) {
    event.preventDefault();
    if (sending || !validateForm(form)) return;
    if (document.getElementById("website").value) { setStatus("Não foi possível enviar. Atualize a página e tente novamente.", "error"); return; }
    if (Date.now() - openedAt < LFY_CONFIG.minimumFormFillTimeMs) { setStatus("Revise os dados e aguarde um instante antes de enviar.", "error"); return; }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(LFY_CONFIG.googleAppsScriptUrl)) {
      setStatus("O canal de envio ainda não foi configurado. Entre em contato com o responsável pelo site.", "error"); return;
    }
    sending = true;
    const button = document.getElementById("submit-request"); button.disabled = true; button.textContent = "Enviando solicitação..."; setStatus("Enviando com segurança...", "loading");
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), LFY_CONFIG.requestTimeoutMs);
    const payload = new URLSearchParams({
      name: LFY.normalizeName(document.getElementById("full-name").value),
      birthDate: document.getElementById("birth-date").value,
      cpf: LFY.digitsOnly(document.getElementById("cpf").value),
      phone: LFY.digitsOnly(document.getElementById("phone").value),
      amount: String(result.amount), installments: String(result.installments),
      adultConsent: "true", privacyConsent: "true", origin: window.location.href,
      website: ""
    });
    try {
      const response = await fetch(LFY_CONFIG.googleAppsScriptUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: payload, signal: controller.signal, redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data.ok !== "boolean") throw new Error("Resposta inválida do serviço.");
      if (data.ok !== true) {
        const publicMessage = typeof data.message === "string" && data.message.length <= 180
          ? data.message
          : "Não foi possível registrar a solicitação. Tente novamente.";
        setStatus(publicMessage, "error");
        sending = false; button.disabled = false; button.textContent = "Finalizar solicitação";
        return;
      }
      if (typeof data.protocol !== "string") throw new Error("Resposta inválida do serviço.");
      LFY.storageSet("lfyProtocol", data.protocol); sessionStorage.removeItem("lfyPersonalData"); window.location.assign("sucesso.html");
    } catch (error) {
      console.error("Falha técnica no envio da solicitação:", error?.name || "erro");
      setStatus(error?.name === "AbortError" ? "O envio demorou mais que o esperado. Verifique sua conexão e tente novamente." : "Não foi possível registrar agora. Seus dados continuam no formulário; tente novamente.", "error");
      sending = false; button.disabled = false; button.textContent = "Finalizar solicitação";
    } finally { clearTimeout(timeout); }
  }
})();
