/**
 * Backend da LFY Créditos para Google Apps Script.
 * Revise todas as constantes antes de implantar em produção.
 */
const SETTINGS = Object.freeze({
  SPREADSHEET_ID: '1Jw4Dw3BKStyeNLaVgmNWNcb3x0sgPAKKN0finkzwdOI',
  SHEET_NAME: 'Solicitacoes',
  TIME_ZONE: 'America/Sao_Paulo',
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 30000,
  AMOUNT_STEP: 100,
  ALLOWED_INSTALLMENTS: [1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36, 48],
  CALCULATION_METHOD: 'PRICE',
  // 0.008 = 0,80% ao mês. Deve coincidir com js/config.js.
  MONTHLY_INTEREST_RATE: 0.008,
  DOWN_PAYMENT_RATE: 0.10,
  DUPLICATE_WINDOW_HOURS: 24,
  LOCK_TIMEOUT_MS: 20000
});

const HEADERS = [
  'Protocolo', 'Data e hora', 'Nome completo', 'CPF', 'Telefone',
  'Valor solicitado', 'Número de parcelas', 'Taxa mensal', 'Valor da parcela',
  'Valor total', 'Método de cálculo', 'Status', 'Aceite de maioridade',
  'Aceite do aviso de privacidade', 'Origem', 'Data de nascimento',
  'Entrada (10%)', 'Valor financiado'
];

function setupSheet() {
  validateSettings_();
  const spreadsheet = SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SETTINGS.SHEET_NAME);
  if (sheet.getMaxColumns() < HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#0B1F3A').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('C:E').setNumberFormat('@');
  sheet.getRange('F:F').setNumberFormat('R$ #,##0.00');
  sheet.getRange('G:G').setNumberFormat('0');
  sheet.getRange('H:H').setNumberFormat('0.00%');
  sheet.getRange('I:J').setNumberFormat('R$ #,##0.00');
  sheet.getRange('P:P').setNumberFormat('@');
  sheet.getRange('Q:R').setNumberFormat('R$ #,##0.00');
  sheet.autoResizeColumns(1, HEADERS.length);
  return 'Aba "' + SETTINGS.SHEET_NAME + '" pronta para receber solicitações.';
}

function doPost(e) {
  let lock = null;
  try {
    validateSettings_();
    const payload = normalizePayload_(e && e.parameter ? e.parameter : {});
    validatePayload_(payload);
    if (payload.website) return json_({ ok: false, message: 'Não foi possível registrar a solicitação.' });
    const calculation = calculateLoan_(payload.amount, payload.installments);
    lock = LockService.getScriptLock();
    lock.waitLock(SETTINGS.LOCK_TIMEOUT_MS);
    const sheet = SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID).getSheetByName(SETTINGS.SHEET_NAME);
    if (!sheet) throw new Error('Aba não configurada. Execute setupSheet().');
    if (isDuplicate_(sheet, payload.cpf, payload.phone)) return json_({ ok: false, message: 'Já existe uma solicitação recente com estes dados. Aguarde antes de tentar novamente.' });
    const protocol = createProtocol_();
    const timestamp = Utilities.formatDate(new Date(), SETTINGS.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss');
    const row = [
      safeText_(protocol), safeText_(timestamp), safeText_(payload.name), textValue_(payload.cpf), textValue_(payload.phone),
      calculation.amount, calculation.installments, calculation.rate, calculation.payment, calculation.total,
      calculation.method, 'Nova solicitação', 'Sim', 'Sim', safeText_(payload.origin), safeText_(payload.birthDate),
      calculation.downPayment, calculation.financedAmount
    ];
    sheet.appendRow(row);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 5).setNumberFormat('@');
    sheet.getRange(lastRow, 8).setNumberFormat('0.00%');
    sheet.getRange(lastRow, 16).setNumberFormat('@');
    return json_({ ok: true, protocol: protocol });
  } catch (error) {
    console.error('LFY doPost falhou: ' + String(error && error.message ? error.message : 'erro desconhecido'));
    return json_({ ok: false, message: 'Não foi possível registrar a solicitação.' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function normalizePayload_(data) {
  return {
    name: String(data.name || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    birthDate: String(data.birthDate || '').trim(),
    cpf: digitsOnly_(data.cpf), phone: digitsOnly_(data.phone),
    amount: Number(data.amount), installments: Number(data.installments),
    adultConsent: String(data.adultConsent) === 'true', privacyConsent: String(data.privacyConsent) === 'true',
    origin: String(data.origin || '').trim().slice(0, 500), website: String(data.website || '').trim()
  };
}

function validatePayload_(data) {
  if (!isValidName_(data.name)) throw new Error('Nome inválido.');
  if (!isAdultBirthDate_(data.birthDate)) throw new Error('Data de nascimento inválida ou menor de idade.');
  if (!isValidCPF_(data.cpf)) throw new Error('CPF inválido.');
  if (!/^[1-9]{2}9\d{8}$/.test(data.phone)) throw new Error('Telefone inválido.');
  if (!Number.isFinite(data.amount) || data.amount < SETTINGS.MIN_AMOUNT || data.amount > SETTINGS.MAX_AMOUNT) throw new Error('Valor fora dos limites.');
  const stepOffset = Math.round((data.amount - SETTINGS.MIN_AMOUNT) * 100);
  if (stepOffset % Math.round(SETTINGS.AMOUNT_STEP * 100) !== 0) throw new Error('Valor fora do intervalo configurado.');
  if (SETTINGS.ALLOWED_INSTALLMENTS.indexOf(data.installments) === -1) throw new Error('Parcelas não permitidas.');
  if (!data.adultConsent || !data.privacyConsent) throw new Error('Aceites obrigatórios ausentes.');
}

function calculateLoan_(amount, installments) {
  const principal = roundMoney_(amount), rate = Number(SETTINGS.MONTHLY_INTEREST_RATE), downPaymentRate = Number(SETTINGS.DOWN_PAYMENT_RATE), n = Number(installments);
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(downPaymentRate) || downPaymentRate < 0 || downPaymentRate >= 1 || !Number.isFinite(n) || n <= 0) throw new Error('Configuração de cálculo inválida.');
  const downPayment = roundMoney_(principal * downPaymentRate);
  const financedAmount = roundMoney_(principal - downPayment);
  let payment, installmentTotal;
  if (SETTINGS.CALCULATION_METHOD === 'PRICE') {
    payment = rate === 0 ? financedAmount / n : financedAmount * rate / (1 - Math.pow(1 + rate, -n));
    installmentTotal = payment * n;
  } else if (SETTINGS.CALCULATION_METHOD === 'SIMPLE') {
    installmentTotal = financedAmount * (1 + rate * n); payment = installmentTotal / n;
  } else throw new Error('Método de cálculo inválido.');
  if (!Number.isFinite(payment) || !Number.isFinite(installmentTotal)) throw new Error('Resultado de cálculo inválido.');
  payment = roundMoney_(payment); installmentTotal = roundMoney_(payment * n);
  const total = roundMoney_(downPayment + installmentTotal);
  return { amount: principal, downPayment: downPayment, financedAmount: financedAmount, installments: n, rate: rate, payment: payment, total: total, method: SETTINGS.CALCULATION_METHOD };
}

function isDuplicate_(sheet, cpf, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const first = Math.max(2, lastRow - 499);
  const values = sheet.getRange(first, 1, lastRow - first + 1, 5).getDisplayValues();
  const cutoff = Date.now() - SETTINGS.DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (digitsOnly_(values[i][3]) === cpf && digitsOnly_(values[i][4]) === phone) {
      const parts = values[i][1].match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
      if (!parts) return true;
      const date = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), Number(parts[4]), Number(parts[5]), Number(parts[6]));
      if (date.getTime() >= cutoff) return true;
    }
  }
  return false;
}

function isValidName_(name) { return name.length >= 5 && name.length <= 100 && !/^\d+$/.test(name) && name.split(' ').filter(function (part) { return part.length >= 2; }).length >= 2; }
function isAdultBirthDate_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > new Date()) return false;
  const todayText = Utilities.formatDate(new Date(), SETTINGS.TIME_ZONE, 'yyyy-MM-dd').split('-');
  const todayYear = Number(todayText[0]), todayMonth = Number(todayText[1]), todayDay = Number(todayText[2]);
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age >= 18 && age <= 120;
}
function isValidCPF_(value) {
  const cpf = digitsOnly_(value); if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  function digit(length) { let sum = 0; for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i); const result = (sum * 10) % 11; return result === 10 ? 0 : result; }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
function validateSettings_() {
  if (!SETTINGS.SPREADSHEET_ID || SETTINGS.SPREADSHEET_ID.indexOf('PREENCHER') !== -1) throw new Error('ID da planilha não configurado.');
  if (['PRICE', 'SIMPLE'].indexOf(SETTINGS.CALCULATION_METHOD) === -1) throw new Error('Método inválido.');
}
function createProtocol_() { return 'LFY-' + Utilities.formatDate(new Date(), SETTINGS.TIME_ZONE, 'yyyyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase(); }
function digitsOnly_(value) { return String(value || '').replace(/\D/g, ''); }
function roundMoney_(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function safeText_(value) { const text = String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim(); return /^[=+\-@]/.test(text) ? "'" + text : text; }
function textValue_(value) { return "'" + digitsOnly_(value); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
