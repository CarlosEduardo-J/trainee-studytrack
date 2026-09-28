const TASK_TYPES = ['tarefa', 'trabalho', 'prova'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function text(value, field, { required = false, max = 120 } = {}) {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (required && !clean) throw new ValidationError(`O campo "${field}" é obrigatório.`);
  if (clean.length > max) throw new ValidationError(`O campo "${field}" aceita no máximo ${max} caracteres.`);
  return clean;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function date(value, field) {
  if (!isValidDate(value)) throw new ValidationError(`O campo "${field}" precisa ser uma data válida (AAAA-MM-DD).`);
  return value;
}

function taskType(value) {
  if (value === undefined || value === null || value === '') return 'tarefa';
  if (!TASK_TYPES.includes(value)) throw new ValidationError('Tipo inválido. Use tarefa, trabalho ou prova.');
  return value;
}

function email(value) {
  const clean = text(value, 'e-mail', { required: true, max: 160 }).toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new ValidationError('Informe um e-mail válido.');
  return clean;
}

function password(value) {
  if (typeof value !== 'string' || value.length < 6) throw new ValidationError('A senha precisa ter pelo menos 6 caracteres.');
  if (value.length > 128) throw new ValidationError('A senha aceita no máximo 128 caracteres.');
  return value;
}

function color(value) {
  if (value === undefined || value === '') return '#2563eb';
  if (!COLOR_RE.test(value)) throw new ValidationError('Cor inválida. Use o formato #RRGGBB.');
  return value;
}

function positiveInt(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 1000) {
    throw new ValidationError(`O campo "${field}" precisa ser um número inteiro entre 1 e 1000.`);
  }
  return number;
}

function id(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

// Current calendar day in Brazil, where the students are.
function today(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = {
  TASK_TYPES,
  ValidationError,
  text,
  date,
  isValidDate,
  taskType,
  email,
  password,
  color,
  positiveInt,
  id,
  today,
  addDays,
};
