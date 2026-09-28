const express = require('express');
const v = require('../validate');

function disciplinaRoutes({ db }) {
  const router = express.Router();

  const find = (userId, id) =>
    db.prepare('SELECT * FROM disciplinas WHERE id = ? AND usuario_id = ?').get(v.id(id), userId);

  router.get('/', (req, res) => {
    const rows = db
      .prepare(
        `SELECT d.*,
                COUNT(t.id) AS total_tarefas,
                COALESCE(SUM(t.concluida), 0) AS tarefas_concluidas
           FROM disciplinas d
           LEFT JOIN tarefas t ON t.disciplina_id = d.id AND t.usuario_id = d.usuario_id
          WHERE d.usuario_id = ?
          GROUP BY d.id
          ORDER BY d.nome`
      )
      .all(req.userId);
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO disciplinas (usuario_id, nome, professor, periodo, cor) VALUES (?, ?, ?, ?, ?)')
      .run(
        req.userId,
        v.text(req.body.nome, 'nome', { required: true, max: 80 }),
        v.text(req.body.professor, 'professor', { max: 80 }),
        v.text(req.body.periodo, 'período', { max: 20 }),
        v.color(req.body.cor)
      );
    res.status(201).json(find(req.userId, lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const current = find(req.userId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Disciplina não encontrada.' });
    const next = {
      nome: req.body.nome !== undefined ? v.text(req.body.nome, 'nome', { required: true, max: 80 }) : current.nome,
      professor: req.body.professor !== undefined ? v.text(req.body.professor, 'professor', { max: 80 }) : current.professor,
      periodo: req.body.periodo !== undefined ? v.text(req.body.periodo, 'período', { max: 20 }) : current.periodo,
      cor: req.body.cor !== undefined ? v.color(req.body.cor) : current.cor,
    };
    db.prepare('UPDATE disciplinas SET nome = ?, professor = ?, periodo = ?, cor = ? WHERE id = ?').run(
      next.nome,
      next.professor,
      next.periodo,
      next.cor,
      current.id
    );
    res.json(find(req.userId, current.id));
  });

  router.delete('/:id', (req, res) => {
    const current = find(req.userId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Disciplina não encontrada.' });
    db.prepare('DELETE FROM disciplinas WHERE id = ?').run(current.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { disciplinaRoutes };
