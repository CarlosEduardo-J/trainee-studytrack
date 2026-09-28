const express = require('express');
const v = require('../validate');

const SELECT_TASK = `
  SELECT t.id, t.titulo, t.descricao, t.tipo, t.data_limite, t.concluida, t.concluida_em,
         t.disciplina_id, d.nome AS disciplina_nome, d.cor AS disciplina_cor,
         t.atividade_id, tu.id AS turma_id, tu.nome AS turma_nome
    FROM tarefas t
    LEFT JOIN disciplinas d ON d.id = t.disciplina_id
    LEFT JOIN turma_atividades a ON a.id = t.atividade_id
    LEFT JOIN turmas tu ON tu.id = a.turma_id`;

function toTask(row) {
  return { ...row, concluida: Boolean(row.concluida), origem: row.atividade_id ? 'turma' : 'pessoal' };
}

function tarefaRoutes({ db, now }) {
  const router = express.Router();

  const find = (userId, id) => {
    const row = db.prepare(`${SELECT_TASK} WHERE t.id = ? AND t.usuario_id = ?`).get(v.id(id), userId);
    return row ? toTask(row) : null;
  };

  // A task may only point at a discipline owned by the same student.
  const ownedDisciplina = (userId, value) => {
    if (value === undefined || value === null || value === '') return null;
    const found = db.prepare('SELECT id FROM disciplinas WHERE id = ? AND usuario_id = ?').get(v.id(value), userId);
    if (!found) throw new v.ValidationError('Disciplina não encontrada.');
    return found.id;
  };

  router.get('/', (req, res) => {
    const filters = { abertas: 'AND t.concluida = 0', concluidas: 'AND t.concluida = 1' };
    const extra = filters[req.query.status] || '';
    const rows = db
      .prepare(`${SELECT_TASK} WHERE t.usuario_id = ? ${extra} ORDER BY t.concluida, t.data_limite, t.id`)
      .all(req.userId);
    res.json(rows.map(toTask));
  });

  router.get('/:id', (req, res) => {
    const task = find(req.userId, req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json(task);
  });

  router.post('/', (req, res) => {
    const { lastInsertRowid } = db
      .prepare(
        'INSERT INTO tarefas (usuario_id, disciplina_id, titulo, descricao, tipo, data_limite) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        req.userId,
        ownedDisciplina(req.userId, req.body.disciplina_id),
        v.text(req.body.titulo, 'título', { required: true }),
        v.text(req.body.descricao, 'descrição', { max: 500 }),
        v.taskType(req.body.tipo),
        v.date(req.body.data_limite, 'data de entrega')
      );
    res.status(201).json(find(req.userId, lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const task = find(req.userId, req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

    const touchesContent = ['titulo', 'descricao', 'tipo', 'data_limite'].some((f) => req.body[f] !== undefined);
    if (task.origem === 'turma' && touchesContent) {
      return res.status(403).json({ error: 'Atividades da turma só podem ser alteradas pelo representante.' });
    }

    const next = {
      titulo: req.body.titulo !== undefined ? v.text(req.body.titulo, 'título', { required: true }) : task.titulo,
      descricao: req.body.descricao !== undefined ? v.text(req.body.descricao, 'descrição', { max: 500 }) : task.descricao,
      tipo: req.body.tipo !== undefined ? v.taskType(req.body.tipo) : task.tipo,
      data_limite: req.body.data_limite !== undefined ? v.date(req.body.data_limite, 'data de entrega') : task.data_limite,
      disciplina_id:
        req.body.disciplina_id !== undefined ? ownedDisciplina(req.userId, req.body.disciplina_id) : task.disciplina_id,
      concluida: req.body.concluida !== undefined ? Boolean(req.body.concluida) : task.concluida,
    };
    let concluidaEm = task.concluida_em;
    if (next.concluida && !task.concluida) concluidaEm = v.today(now());
    if (!next.concluida) concluidaEm = null;

    db.prepare(
      `UPDATE tarefas SET titulo = ?, descricao = ?, tipo = ?, data_limite = ?, disciplina_id = ?,
              concluida = ?, concluida_em = ? WHERE id = ?`
    ).run(
      next.titulo,
      next.descricao,
      next.tipo,
      next.data_limite,
      next.disciplina_id,
      next.concluida ? 1 : 0,
      concluidaEm,
      task.id
    );
    res.json(find(req.userId, task.id));
  });

  router.delete('/:id', (req, res) => {
    const task = find(req.userId, req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    if (task.origem === 'turma') {
      return res.status(403).json({ error: 'Atividades da turma só podem ser removidas pelo representante.' });
    }
    db.prepare('DELETE FROM tarefas WHERE id = ?').run(task.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { tarefaRoutes };
