const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('./db');
const { createApp } = require('./app');

const NOW = new Date('2026-09-15T15:00:00Z'); // 12:00 in Maringá
let server;
let base;

before(async () => {
  const db = openDatabase(':memory:');
  const app = createApp({ db, secret: 'test-secret', now: () => NOW, logger: { log() {}, error() {} } });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let counter = 0;
async function newStudent(nome = 'Aluno') {
  counter += 1;
  const res = await call('POST', '/api/auth/cadastro', {
    body: { nome, email: `aluno${counter}@uninga.edu.br`, senha: 'segredo123', curso: 'ADS' },
  });
  assert.equal(res.status, 201);
  return res.body.token;
}

test('health check responds without auth', async () => {
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('sign up validates input and rejects duplicate emails', async () => {
  const bad = await call('POST', '/api/auth/cadastro', { body: { nome: 'X', email: 'nao-e-email', senha: '123456' } });
  assert.equal(bad.status, 400);

  const short = await call('POST', '/api/auth/cadastro', { body: { nome: 'X', email: 'x@x.com', senha: '123' } });
  assert.equal(short.status, 400);

  const ok = await call('POST', '/api/auth/cadastro', { body: { nome: 'Dup', email: 'dup@x.com', senha: '123456' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.usuario.senha_hash, undefined);

  const dup = await call('POST', '/api/auth/cadastro', { body: { nome: 'Dup', email: 'DUP@x.com', senha: '123456' } });
  assert.equal(dup.status, 409);
});

test('login returns a token and locks after repeated failures', async () => {
  await call('POST', '/api/auth/cadastro', { body: { nome: 'Lia', email: 'lia@x.com', senha: 'certa123' } });
  const ok = await call('POST', '/api/auth/login', { body: { email: 'lia@x.com', senha: 'certa123' } });
  assert.equal(ok.status, 200);
  const me = await call('GET', '/api/auth/me', { token: ok.body.token });
  assert.equal(me.body.nome, 'Lia');

  for (let i = 0; i < 5; i++) {
    const wrong = await call('POST', '/api/auth/login', { body: { email: 'lia@x.com', senha: 'errada' } });
    assert.equal(wrong.status, 401);
  }
  const locked = await call('POST', '/api/auth/login', { body: { email: 'lia@x.com', senha: 'certa123' } });
  assert.equal(locked.status, 429);
});

test('private routes reject missing or forged tokens', async () => {
  assert.equal((await call('GET', '/api/tarefas')).status, 401);
  assert.equal((await call('GET', '/api/tarefas', { token: 'a.b.c' })).status, 401);
});

test('student manages disciplines and tasks end to end', async () => {
  const token = await newStudent();
  const disc = await call('POST', '/api/disciplinas', {
    token,
    body: { nome: 'Banco de Dados II', professor: 'Profa. Helena', cor: '#7c3aed' },
  });
  assert.equal(disc.status, 201);

  const noTitle = await call('POST', '/api/tarefas', { token, body: { titulo: ' ', data_limite: '2026-09-20' } });
  assert.equal(noTitle.status, 400);
  const badDate = await call('POST', '/api/tarefas', { token, body: { titulo: 'X', data_limite: '2026-02-31' } });
  assert.equal(badDate.status, 400);

  const task = await call('POST', '/api/tarefas', {
    token,
    body: { titulo: 'Modelagem ER', tipo: 'trabalho', data_limite: '2026-09-17', disciplina_id: disc.body.id },
  });
  assert.equal(task.status, 201);
  assert.equal(task.body.disciplina_nome, 'Banco de Dados II');
  assert.equal(task.body.origem, 'pessoal');

  const done = await call('PUT', `/api/tarefas/${task.body.id}`, { token, body: { concluida: true } });
  assert.equal(done.body.concluida, true);
  assert.equal(done.body.concluida_em, '2026-09-15');

  const list = await call('GET', '/api/disciplinas', { token });
  assert.equal(list.body[0].total_tarefas, 1);
  assert.equal(list.body[0].tarefas_concluidas, 1);

  assert.equal((await call('DELETE', `/api/tarefas/${task.body.id}`, { token })).status, 204);
  assert.equal((await call('GET', `/api/tarefas/${task.body.id}`, { token })).status, 404);
});

test('a student cannot read or change another student data', async () => {
  const ana = await newStudent('Ana');
  const bruno = await newStudent('Bruno');
  const disc = await call('POST', '/api/disciplinas', { token: ana, body: { nome: 'Redes' } });
  const task = await call('POST', '/api/tarefas', { token: ana, body: { titulo: 'Sub-redes', data_limite: '2026-09-20' } });

  assert.equal((await call('GET', `/api/tarefas/${task.body.id}`, { token: bruno })).status, 404);
  assert.equal((await call('PUT', `/api/tarefas/${task.body.id}`, { token: bruno, body: { concluida: true } })).status, 404);
  assert.equal((await call('DELETE', `/api/disciplinas/${disc.body.id}`, { token: bruno })).status, 404);

  const stolen = await call('POST', '/api/tarefas', {
    token: bruno,
    body: { titulo: 'Usar disciplina alheia', data_limite: '2026-09-20', disciplina_id: disc.body.id },
  });
  assert.equal(stolen.status, 400);
  assert.equal((await call('GET', '/api/tarefas', { token: bruno })).body.length, 0);
});

test('dashboard counts overdue and upcoming tasks', async () => {
  const token = await newStudent();
  await call('POST', '/api/tarefas', { token, body: { titulo: 'Atrasada', data_limite: '2026-09-10' } });
  await call('POST', '/api/tarefas', { token, body: { titulo: 'Amanhã', data_limite: '2026-09-16' } });
  await call('POST', '/api/tarefas', { token, body: { titulo: 'Longe', data_limite: '2026-10-30' } });
  const res = await call('GET', '/api/dashboard', { token });
  assert.equal(res.body.resumo.abertas, 3);
  assert.equal(res.body.resumo.atrasadas, 1);
  assert.equal(res.body.resumo.vencendo, 1);
  assert.equal(res.body.semanas.length, 6);
});

test('goal progress counts tasks finished inside its window', async () => {
  const token = await newStudent();
  const past = await call('POST', '/api/metas', { token, body: { titulo: 'X', alvo: 2, prazo: '2026-09-01' } });
  assert.equal(past.status, 400);

  const meta = await call('POST', '/api/metas', { token, body: { titulo: 'Semana produtiva', alvo: 2, prazo: '2026-09-21' } });
  assert.equal(meta.body.feitas, 0);
  const t = await call('POST', '/api/tarefas', { token, body: { titulo: 'Lista 4', data_limite: '2026-09-18' } });
  await call('PUT', `/api/tarefas/${t.body.id}`, { token, body: { concluida: true } });

  const [updated] = (await call('GET', '/api/metas', { token })).body;
  assert.equal(updated.feitas, 1);
  assert.equal(updated.percentual, 50);
  assert.equal(updated.atingida, false);
});

test('class activities reach every member and only the representative controls them', async () => {
  const rep = await newStudent('Representante');
  const aluno = await newStudent('Aluno da turma');
  const intruso = await newStudent('Fora da turma');

  const turma = await call('POST', '/api/turmas', { token: rep, body: { nome: 'ADS 5º período' } });
  assert.equal(turma.status, 201);
  assert.match(turma.body.codigo, /^[A-Z2-9]{6}$/);

  const early = await call('POST', `/api/turmas/${turma.body.id}/atividades`, {
    token: rep,
    body: { titulo: 'Prova de Redes', tipo: 'prova', data_limite: '2026-09-25' },
  });
  assert.equal(early.body.enviadas, 1);

  const bad = await call('POST', '/api/turmas/entrar', { token: aluno, body: { codigo: 'ZZZZZZ' } });
  assert.equal(bad.status, 404);
  const joined = await call('POST', '/api/turmas/entrar', { token: aluno, body: { codigo: turma.body.codigo.toLowerCase() } });
  assert.equal(joined.status, 201);
  assert.equal(joined.body.atividades_recebidas, 1);
  assert.equal((await call('POST', '/api/turmas/entrar', { token: aluno, body: { codigo: turma.body.codigo } })).status, 409);

  const late = await call('POST', `/api/turmas/${turma.body.id}/atividades`, {
    token: rep,
    body: { titulo: 'Trabalho de BD', tipo: 'trabalho', data_limite: '2026-09-30' },
  });
  assert.equal(late.body.enviadas, 2);

  const alunoTasks = (await call('GET', '/api/tarefas', { token: aluno })).body;
  assert.deepEqual(alunoTasks.map((t) => t.titulo), ['Prova de Redes', 'Trabalho de BD']);
  assert.equal(alunoTasks[0].origem, 'turma');
  assert.equal(alunoTasks[0].turma_nome, 'ADS 5º período');

  const [asMember] = (await call('GET', '/api/turmas', { token: aluno })).body;
  assert.equal(asMember.codigo, null);
  assert.equal(asMember.papel, 'aluno');

  const forbidden = await call('POST', `/api/turmas/${turma.body.id}/atividades`, {
    token: aluno,
    body: { titulo: 'Hack', data_limite: '2026-09-30' },
  });
  assert.equal(forbidden.status, 403);
  assert.equal((await call('GET', `/api/turmas/${turma.body.id}/atividades`, { token: intruso })).status, 404);
  assert.equal((await call('PUT', `/api/tarefas/${alunoTasks[0].id}`, { token: aluno, body: { titulo: 'Outro' } })).status, 403);
  assert.equal((await call('DELETE', `/api/tarefas/${alunoTasks[0].id}`, { token: aluno })).status, 403);

  await call('PUT', `/api/tarefas/${alunoTasks[0].id}`, { token: aluno, body: { concluida: true } });
  await call('PUT', `/api/turmas/${turma.body.id}/atividades/${early.body.id}`, {
    token: rep,
    body: { data_limite: '2026-09-26' },
  });
  const moved = (await call('GET', `/api/tarefas/${alunoTasks[0].id}`, { token: aluno })).body;
  assert.equal(moved.data_limite, '2026-09-26');
  assert.equal(moved.concluida, true);

  const membros = (await call('GET', `/api/turmas/${turma.body.id}/membros`, { token: rep })).body;
  const alunoRow = membros.find((m) => m.nome === 'Aluno da turma');
  assert.equal(alunoRow.atividades, 2);
  assert.equal(alunoRow.concluidas, 1);
  assert.equal((await call('GET', `/api/turmas/${turma.body.id}/membros`, { token: aluno })).status, 403);

  assert.equal((await call('DELETE', `/api/turmas/${turma.body.id}/sair`, { token: aluno })).status, 204);
  const after = (await call('GET', '/api/tarefas', { token: aluno })).body;
  assert.deepEqual(after.map((t) => t.titulo), ['Prova de Redes']);
});

test('unknown API routes and malformed JSON return clear errors', async () => {
  const token = await newStudent();
  assert.equal((await call('GET', '/api/nada', { token })).status, 404);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{quebrado',
  });
  assert.equal(res.status, 400);
});
