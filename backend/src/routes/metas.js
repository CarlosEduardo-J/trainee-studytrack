const express = require('express');
const v = require('../validate');

function metaRoutes({ db, now }) {
  const router = express.Router();

  // Progress counts tasks the student finished inside the goal window.
  const withProgress = (meta) => {
    const params = [meta.usuario_id, meta.inicio, meta.prazo];
    let filter = '';
    if (meta.disciplina_id) {
      filter = 'AND disciplina_id = ?';
      params.push(meta.disciplina_id);
    }
    const { feitas } = db
      .prepare(
        `SELECT COUNT(*) AS feitas FROM tarefas
          WHERE usuario_id = ? AND concluida = 1 AND concluida_em BETWEEN ? AND ? ${filter}`
      )
      .get(...params);
    const disciplina = meta.disciplina_id
      ? db.prepare('SELECT nome, cor FROM disciplinas WHERE id = ?').get(meta.disciplina_id)
      : null;
    return {
      id: meta.id,
      titulo: meta.titulo,
      alvo: meta.alvo,
      inicio: meta.inicio,
      prazo: meta.prazo,
      disciplina_id: meta.disciplina_id,
      disciplina_nome: disciplina ? disciplina.nome : null,
      disciplina_cor: disciplina ? disciplina.cor : null,
      feitas,
      percentual: Math.min(100, Math.round((feitas / meta.alvo) * 100)),
      atingida: feitas >= meta.alvo,
      encerrada: meta.prazo < v.today(now()),
    };
  };

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM metas WHERE usuario_id = ? ORDER BY prazo').all(req.userId);
    res.json(rows.map(withProgress));
  });

  router.post('/', (req, res) => {
    const inicio = v.today(now());
    const prazo = v.date(req.body.prazo, 'prazo');
    if (prazo < inicio) throw new v.ValidationError('O prazo da meta não pode estar no passado.');

    let disciplinaId = null;
    if (req.body.disciplina_id) {
      const found = db
        .prepare('SELECT id FROM disciplinas WHERE id = ? AND usuario_id = ?')
        .get(v.id(req.body.disciplina_id), req.userId);
      if (!found) throw new v.ValidationError('Disciplina não encontrada.');
      disciplinaId = found.id;
    }

    const { lastInsertRowid } = db
      .prepare('INSERT INTO metas (usuario_id, disciplina_id, titulo, alvo, inicio, prazo) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        req.userId,
        disciplinaId,
        v.text(req.body.titulo, 'título', { required: true, max: 80 }),
        v.positiveInt(req.body.alvo, 'quantidade de tarefas'),
        inicio,
        prazo
      );
    res.status(201).json(withProgress(db.prepare('SELECT * FROM metas WHERE id = ?').get(lastInsertRowid)));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM metas WHERE id = ? AND usuario_id = ?').run(v.id(req.params.id), req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Meta não encontrada.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { metaRoutes };
