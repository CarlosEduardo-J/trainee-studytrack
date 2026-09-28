// Loads the small pilot dataset used in the 3rd-bimester demo. Dates are relative to today.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { openDatabase } = require('./src/db');
const { hashPassword } = require('./src/auth');
const { today, addDays } = require('./src/validate');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'studytrack.db');
const PASSWORD = 'studytrack123';

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_FILE + suffix, { force: true });
const db = openDatabase(DB_FILE);
const hoje = today();
const d = (days) => addDays(hoje, days);

const users = [
  ['Carlos Eduardo Alexandria', 'carlos@studytrack.app'],
  ['Samuel Stefano', 'samuel@studytrack.app'],
  ['João Italo Pamplona', 'joaoitalo@studytrack.app'],
  ['João Vitor Melo', 'joaovitor@studytrack.app'],
  ['Mariana Souza', 'mariana@studytrack.app'],
  ['Lucas Ferreira', 'lucas@studytrack.app'],
];
const uid = {};
for (const [nome, email] of users) {
  uid[email.split('@')[0]] = Number(
    db
      .prepare('INSERT INTO usuarios (nome, email, senha_hash, curso) VALUES (?, ?, ?, ?)')
      .run(nome, email, hashPassword(PASSWORD), 'ADS · 5º período').lastInsertRowid
  );
}

function disciplina(user, nome, cor, professor = '') {
  return Number(
    db
      .prepare('INSERT INTO disciplinas (usuario_id, nome, professor, periodo, cor) VALUES (?, ?, ?, ?, ?)')
      .run(uid[user], nome, professor, '2026/2', cor).lastInsertRowid
  );
}

function tarefa(user, discId, titulo, tipo, prazo, concluidaEm = null) {
  db.prepare(
    `INSERT INTO tarefas (usuario_id, disciplina_id, titulo, tipo, data_limite, concluida, concluida_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid[user], discId, titulo, tipo, prazo, concluidaEm ? 1 : 0, concluidaEm);
}

// Samuel: the account used in the screenshots.
const mob = disciplina('samuel', 'Desenvolvimento Mobile', '#2563eb');
const eng = disciplina('samuel', 'Engenharia de Software', '#7c3aed');
const seg = disciplina('samuel', 'Segurança da Informação', '#0891b2');
const piesc = disciplina('samuel', 'PIESC', '#12b76a', 'Prof. Rold Jr.');
tarefa('samuel', piesc, 'Reentrega do diagnóstico (Bim 1)', 'trabalho', d(-2), d(-2));
tarefa('samuel', mob, 'Tela de login responsiva', 'tarefa', d(-9), d(-10));
tarefa('samuel', eng, 'Diagrama de casos de uso', 'trabalho', d(-5), d(-6));
tarefa('samuel', seg, 'Resumo: autenticação e hash de senha', 'tarefa', d(-1));
tarefa('samuel', mob, 'Testar o app no celular', 'tarefa', d(2));
tarefa('samuel', piesc, 'Entrega final — materialização (Bim 3)', 'trabalho', d(3));
tarefa('samuel', seg, 'Lista de exercícios 3', 'tarefa', d(9));
db.prepare('INSERT INTO metas (usuario_id, disciplina_id, titulo, alvo, inicio, prazo) VALUES (?, ?, ?, ?, ?, ?)').run(
  uid.samuel,
  null,
  'Fechar as pendências do mês',
  5,
  d(-12),
  d(5)
);

// A few tasks for the other pilot users.
const carlosBd = disciplina('carlos', 'Desenvolvimento Mobile', '#2563eb');
tarefa('carlos', carlosBd, 'Revisar PRs da sprint', 'tarefa', d(-3), d(-3));
tarefa('carlos', carlosBd, 'Publicar versão de teste', 'tarefa', d(4));
const marEng = disciplina('mariana', 'Engenharia de Software', '#db2777');
tarefa('mariana', marEng, 'Leitura: cap. 4 Sommerville', 'tarefa', d(-4), d(-4));
tarefa('mariana', marEng, 'Estudo de caso em dupla', 'trabalho', d(6));
tarefa('lucas', null, 'Organizar horários de estudo', 'tarefa', d(1));

// Class run by Carlos (representative); everyone else joined with the code.
const turmaId = Number(
  db.prepare('INSERT INTO turmas (nome, codigo, representante_id) VALUES (?, ?, ?)').run('ADS 5º período — UNINGÁ', 'K7M2QX', uid.carlos)
    .lastInsertRowid
);
for (const [key] of Object.entries(uid)) {
  db.prepare('INSERT INTO turma_membros (turma_id, usuario_id, papel) VALUES (?, ?, ?)').run(
    turmaId,
    uid[key],
    key === 'carlos' ? 'representante' : 'aluno'
  );
}
const atividades = [
  ['Prova de Engenharia de Software', 'prova', d(6)],
  ['Relatório de Segurança da Informação', 'trabalho', d(11)],
];
for (const [titulo, tipo, prazo] of atividades) {
  const aid = db
    .prepare('INSERT INTO turma_atividades (turma_id, titulo, tipo, data_limite, criado_por) VALUES (?, ?, ?, ?, ?)')
    .run(turmaId, titulo, tipo, prazo, uid.carlos).lastInsertRowid;
  for (const id of Object.values(uid)) {
    db.prepare('INSERT INTO tarefas (usuario_id, atividade_id, titulo, tipo, data_limite) VALUES (?, ?, ?, ?, ?)').run(
      id,
      aid,
      titulo,
      tipo,
      prazo
    );
  }
}
db.prepare(
  `UPDATE tarefas SET concluida = 1, concluida_em = ? WHERE usuario_id = ? AND atividade_id IS NOT NULL
     AND titulo = 'Relatório de Segurança da Informação'`
).run(d(-1), uid.mariana);

console.log(`Banco de demonstração criado em ${DB_FILE}`);
console.log(`Contas: ${users.map(([, e]) => e).join(', ')} — senha: ${PASSWORD}`);
