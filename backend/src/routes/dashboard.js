const express = require('express');
const v = require('../validate');

const WEEKS = 6;

function dashboardRoutes({ db, now }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const hoje = v.today(now());
    const emTres = v.addDays(hoje, 3);
    const uid = req.userId;

    const count = (sql, ...params) => db.prepare(sql).get(uid, ...params).n;
    const resumo = {
      hoje,
      abertas: count('SELECT COUNT(*) AS n FROM tarefas WHERE usuario_id = ? AND concluida = 0'),
      concluidas: count('SELECT COUNT(*) AS n FROM tarefas WHERE usuario_id = ? AND concluida = 1'),
      atrasadas: count('SELECT COUNT(*) AS n FROM tarefas WHERE usuario_id = ? AND concluida = 0 AND data_limite < ?', hoje),
      vencendo: count(
        'SELECT COUNT(*) AS n FROM tarefas WHERE usuario_id = ? AND concluida = 0 AND data_limite BETWEEN ? AND ?',
        hoje,
        emTres
      ),
      disciplinas: count('SELECT COUNT(*) AS n FROM disciplinas WHERE usuario_id = ?'),
      turmas: count('SELECT COUNT(*) AS n FROM turma_membros WHERE usuario_id = ?'),
    };

    const porDisciplina = db
      .prepare(
        `SELECT d.id, d.nome, d.cor, COUNT(t.id) AS total, COALESCE(SUM(t.concluida), 0) AS feitas
           FROM disciplinas d
           LEFT JOIN tarefas t ON t.disciplina_id = d.id
          WHERE d.usuario_id = ?
          GROUP BY d.id
          ORDER BY d.nome`
      )
      .all(uid);

    // Completed tasks per week, oldest first, ending with the current week.
    const semanas = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const fim = v.addDays(hoje, -7 * i);
      const inicio = v.addDays(fim, -6);
      semanas.push({
        inicio,
        fim,
        concluidas: count(
          'SELECT COUNT(*) AS n FROM tarefas WHERE usuario_id = ? AND concluida = 1 AND concluida_em BETWEEN ? AND ?',
          inicio,
          fim
        ),
      });
    }

    res.json({ resumo, porDisciplina, semanas });
  });

  return router;
}

module.exports = { dashboardRoutes };
