const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const context = vm.createContext({ console, Intl, Math, Number, String, Object, JSON, globalThis: null });
context.globalThis = context;
vm.runInContext(fs.readFileSync('js/config.js', 'utf8') + '\nglobalThis.LFY_CONFIG_TEST = LFY_CONFIG;', context);
vm.runInContext(fs.readFileSync('js/utils.js', 'utf8'), context);
const { LFY, LFY_CONFIG_TEST: base } = context;
const config = (overrides = {}) => ({ ...base, allowedInstallments: [...base.allowedInstallments], ...overrides });

function close(actual, expected, tolerance = 0.01) { assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`); }

assert.strictEqual(LFY.clampAmount(10, config()), 1000);
assert.strictEqual(LFY.clampAmount(99999, config()), 30000);
assert.strictEqual(LFY.clampAmount(1126, config()), 1100);
base.allowedInstallments.forEach((n) => assert.ok(Number.isFinite(LFY.calculateLoan(1000, n, config()).payment)));
assert.throws(() => LFY.calculateLoan(1000, 7, config()), /parcelas/);

let result = LFY.calculateLoan(1000, 2, config({ monthlyInterestRate: 0.05, calculationMethod: 'PRICE' }));
close(result.downPayment, 100); close(result.financedAmount, 900); close(result.payment, 484.02); close(result.total, 1068.04); close(result.interest, 68.04);
result = LFY.calculateLoan(1000, 4, config({ monthlyInterestRate: 0, calculationMethod: 'PRICE' }));
close(result.payment, 225); close(result.total, 1000); close(result.interest, 0);
result = LFY.calculateLoan(1000, 4, config({ monthlyInterestRate: 0.05, calculationMethod: 'SIMPLE' }));
close(result.payment, 270); close(result.total, 1180); close(result.interest, 180);
result = LFY.calculateLoan(30000, 12, config({ monthlyInterestRate: 0.008, calculationMethod: 'PRICE' }));
close(result.downPayment, 3000); close(result.financedAmount, 27000); close(result.payment, 2368.71); close(result.total, 31424.52);

assert.strictEqual(LFY.isValidCPF('529.982.247-25'), true);
assert.strictEqual(LFY.isValidCPF('111.111.111-11'), false);
assert.strictEqual(LFY.isValidCPF('529.982.247-24'), false);
assert.strictEqual(LFY.isValidPhone('(11) 99999-9999'), true);
assert.strictEqual(LFY.isValidPhone('(11) 3333-4444'), false);
assert.strictEqual(LFY.isValidName('Maria da Silva'), true);
assert.strictEqual(LFY.isValidName('Maria'), false);
assert.strictEqual(LFY.isValidName('123456'), false);
assert.strictEqual(LFY.isAdultBirthDate('2000-01-01', new Date(2026, 6, 13)), true);
assert.strictEqual(LFY.isAdultBirthDate('2010-01-01', new Date(2026, 6, 13)), false);
assert.strictEqual(LFY.isAdultBirthDate('2020-02-30', new Date(2026, 6, 13)), false);

console.log('Todos os testes unitários passaram.');
