/** Configurações centrais da experiência LFY Créditos. */
const LFY_CONFIG = Object.freeze({
  minAmount: 1000,
  maxAmount: 30000,
  amountStep: 100,
  allowedInstallments: Object.freeze([1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36, 48]),
  calculationMethod: "PRICE",

  // 0.008 equivale a 0,80% ao mês.
  monthlyInterestRate: 0.008,

  // Entrada obrigatória de 10% sobre o valor solicitado.
  downPaymentRate: 0.10,

  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbwVspgB_ZLtPf6gz1RHsJDK_FoiKlAv4csriAZ4Yxe1BqyU1d_lRUa4uv_MK9fvE2vG/exec",
  demoMode: true,
  requestTimeoutMs: 15000,
  minimumFormFillTimeMs: 3000,

  company: Object.freeze({
    brandName: "LFY Créditos",
    legalName: "PREENCHER ANTES DE PUBLICAR",
    document: "PREENCHER ANTES DE PUBLICAR",
    privacyContact: "PREENCHER ANTES DE PUBLICAR"
  })
});

// Disponibiliza a configuração aos utilitários carregados em outro arquivo.
globalThis.LFY_CONFIG = LFY_CONFIG;
