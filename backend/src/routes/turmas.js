const crypto = require('node:crypto');
const express = require('express');
const { transaction } = require('../db');
const v = require('../validate');

// No 0/O/1/I so the code is easy to read aloud in class.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function turmaRoutes({ db, now }) {
  const router = express.Router();

  const membership = (turmaId, userId) =>
    db
      .prepare(
        `SELECT t.*, m.papel FROM turmas t
           JOIN turma_membros m ON m.turma_id = t.id AND m.usuario_id = ?
          WHERE t.id = ?`
      )
      .get(userId, v.id(turmaId));

  const requireMember = (req, res) => {
    const turma = membership(req.params.id, req.userId);
    if (!turma) res.status(404).json({ error: 'Turma não encontrada.' });
    return turma;
  };

  const requireRepresentative = (req, res) => {
    const turma = requireMember(req, res);
    if (!turma) return null;
    if (turma.papel !== 'representante') {
      res.status(403).json({ error: 'Apenas o representante da turma pode fazer isso.' });
      return null;
    }
    return turma;
  };

  const copyToStudent = db.prepare(
    `INSERT OR IGNORE INTO tarefas (usuario_id, atividade_id, titulo, descricao, tipo, data_limite)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  router.get('/', (req, res) => {
    const rows = db
      .prepare(
        `SELECT t.id, t.nome, t.codigo, m.papel, u.nome AS representante_nome,
                (SELECT COUNT(*) FROM turma_membros x WHERE x.turma_id = t.id) AS total_membros,
                (SELECT COUNT(*) FROM turma_atividades a WHERE a.turma_id = t.id) AS total_atividades
           FROM turmas t
           JOIN turma_membros m ON m.turma_id = t.id AND m.usuario_id = ?
           JOIN usuarios u ON u.id = t.representante_id
          ORDER BY t.nome`
      )
      .all(req.userId);
    // Only the representative controls who joins, so only they see the invite code.
    res.json(rows.map((r) => (r.papel === 'representante' ? r : { ...r, codigo: null })));
  });

  router.post('/', (req, res) => {
    const nome = v.text(req.body.nome, 'nome da turma', { required: true, max: 80 });
    const turma = transaction(db, () => {
      let codigo = newCode();
      while (db.prepare('SELECT 1 FROM turmas WHERE codigo = ?').get(codigo)) codigo = newCode();
      const { lastInsertRowid } = db
        .prepare('INSERT INTO turmas (nome, codigo, representante_id) VALUES (?, ?, ?)')
        .run(nome, codigo, req.userId);
      db.prepare("INSERT INTO turma_membros (turma_id, usuario_id, papel) VALUES (?, ?, 'representante')").run(
        lastInsertRowid,
        req.userId
      );
      return { id: Number(lastInsertRowid), nome, codigo, papel: 'representante' };
    });
    res.status(201).json(turma);
  });

  router.post('/entrar', (req, res) => {
    const codigo = v.text(req.body.codigo, 'código', { required: true, max: 12 }).toUpperCase();
    const turma = db.prepare('SELECT * FROM turmas WHERE codigo = ?').get(codigo);
    if (!turma) return res.status(404).json({ error: 'Código de turma inválido.' });
    if (membership(turma.id, req.userId)) return res.status(409).json({ error: 'Você já participa desta turma.' });

    const copied = transaction(db, () => {
      db.prepare("INSERT INTO turma_membros (turma_id, usuario_id, papel) VALUES (?, ?, 'aluno')").run(
        turma.id,
        req.userId
      );
      // The newcomer receives every activity that is still due.
      const pending = db
        .prepare('SELECT * FROM turma_atividades WHERE turma_id = ? AND data_limite >= ?')
        .all(turma.id, v.today(now()));
      for (const a of pending) copyToStudent.run(req.userId, a.id, a.titulo, a.descricao, a.tipo, a.data_limite);
      return pending.length;
    });
    res.status(201).json({ id: turma.id, nome: turma.nome, papel: 'aluno', atividades_recebidas: copied });
  });

  router.get('/:id/atividades', (req, res) => {
    const turma = requireMember(req, res);
    if (!turma) return;
    const rows = db
      .prepare(
        `SELECT a.*,
                (SELECT COUNT(*) FROM tarefas t WHERE t.atividade_id = a.id) AS enviadas,
                (SELECT COUNT(*) FROM tarefas t WHERE t.atividade_id = a.id AND t.concluida = 1) AS concluidas
           FROM turma_atividades a
          WHERE a.turma_id = ?
          ORDER BY a.data_limite`
      )
      .all(turma.id);
    res.json(rows);
  });

  router.post('/:id/atividades', (req, res) => {
    const turma = requireRepresentative(req, res);
    if (!turma) return;
    const data = {
      titulo: v.text(req.body.titulo, 'título', { required: true }),
      descricao: v.text(req.body.descricao, 'descrição', { max: 500 }),
      tipo: v.taskType(req.body.tipo),
      data_limite: v.date(req.body.data_limite, 'data de entrega'),
    };
    const atividade = transaction(db, () => {
      const { lastInsertRowid } = db
        .prepare(
          'INSERT INTO turma_atividades (turma_id, titulo, descricao, tipo, data_limite, criado_por) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(turma.id, data.titulo, data.descricao, data.tipo, data.data_limite, req.userId);
      // Publishing fans the activity out to every member's personal task list.
      const members = db.prepare('SELECT usuario_id FROM turma_membros WHERE turma_id = ?').all(turma.id);
      for (const m of members) {
        copyToStudent.run(m.usuario_id, lastInsertRowid, data.titulo, data.descricao, data.tipo, data.data_limite);
      }
      return { id: Number(lastInsertRowid), turma_id: turma.id, ...data, enviadas: members.length };
    });
    res.status(201).json(atividade);
  });

  router.put('/:id/atividades/:atividadeId', (req, res) => {
    const turma = requireRepresentative(req, res);
    if (!turma) return;
    const current = db
      .prepare('SELECT * FROM turma_atividades WHERE id = ? AND turma_id = ?')
      .get(v.id(req.params.atividadeId), turma.id);
    if (!current) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const next = {
      titulo: req.body.titulo !== undefined ? v.text(req.body.titulo, 'título', { required: true }) : current.titulo,
      descricao: req.body.descricao !== undefined ? v.text(req.body.descricao, 'descrição', { max: 500 }) : current.descricao,
      tipo: req.body.tipo !== undefined ? v.taskType(req.body.tipo) : current.tipo,
      data_limite: req.body.data_limite !== undefined ? v.date(req.body.data_limite, 'data de entrega') : current.data_limite,
    };
    transaction(db, () => {
      const args = [next.titulo, next.descricao, next.tipo, next.data_limite, current.id];
      db.prepare('UPDATE turma_atividades SET titulo = ?, descricao = ?, tipo = ?, data_limite = ? WHERE id = ?').run(...args);
      db.prepare('UPDATE tarefas SET titulo = ?, descricao = ?, tipo = ?, data_limite = ? WHERE atividade_id = ?').run(...args);
    });
    res.json({ ...current, ...next });
  });

  router.delete('/:id/atividades/:atividadeId', (req, res) => {
    const turma = requireRepresentative(req, res);
    if (!turma) return;
    const result = db
      .prepare('DELETE FROM turma_atividades WHERE id = ? AND turma_id = ?')
      .run(v.id(req.params.atividadeId), turma.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Atividade não encontrada.' });
    res.status(204).end();
  });

  router.get('/:id/membros', (req, res) => {
    const turma = requireRepresentative(req, res);
    if (!turma) return;
    // Only class-activity completion is shown; personal tasks stay private.
    const rows = db
      .prepare(
        `SELECT u.id, u.nome, m.papel, m.entrou_em,
                COUNT(t.id) AS atividades,
                COALESCE(SUM(t.concluida), 0) AS concluidas
           FROM turma_membros m
           JOIN usuarios u ON u.id = m.usuario_id
           LEFT JOIN tarefas t ON t.usuario_id = u.id
                AND t.atividade_id IN (SELECT id FROM turma_atividades WHERE turma_id = m.turma_id)
          WHERE m.turma_id = ?
          GROUP BY u.id
          ORDER BY m.papel DESC, u.nome`
      )
      .all(turma.id);
    res.json(rows);
  });

  router.delete('/:id/sair', (req, res) => {
    const turma = requireMember(req, res);
    if (!turma) return;
    if (turma.papel === 'representante') {
      return res.status(409).json({ error: 'O representante não pode sair da própria turma.' });
    }
    transaction(db, () => {
      db.prepare(
        `DELETE FROM tarefas WHERE usuario_id = ? AND concluida = 0
            AND atividade_id IN (SELECT id FROM turma_atividades WHERE turma_id = ?)`
      ).run(req.userId, turma.id);
      db.prepare('DELETE FROM turma_membros WHERE turma_id = ? AND usuario_id = ?').run(turma.id, req.userId);
    });
    res.status(204).end();
  });

  return router;
}

module.exports = { turmaRoutes };
