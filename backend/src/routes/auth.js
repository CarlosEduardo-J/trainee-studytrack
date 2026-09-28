const express = require('express');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('../auth');
const v = require('../validate');

const publicUser = (u) => ({ id: u.id, nome: u.nome, email: u.email, curso: u.curso });

function authRoutes({ db, secret, limiter }) {
  const router = express.Router();

  router.post('/cadastro', (req, res) => {
    const nome = v.text(req.body.nome, 'nome', { required: true, max: 80 });
    const email = v.email(req.body.email);
    const senha = v.password(req.body.senha);
    const curso = v.text(req.body.curso, 'curso', { max: 80 });

    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }
    const { lastInsertRowid } = db
      .prepare('INSERT INTO usuarios (nome, email, senha_hash, curso) VALUES (?, ?, ?, ?)')
      .run(nome, email, hashPassword(senha), curso);
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ token: signToken({ sub: user.id }, secret), usuario: publicUser(user) });
  });

  router.post('/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    if (limiter.isBlocked(req.ip, email)) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' });
    }
    const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!user || !verifyPassword(senha, user.senha_hash)) {
      limiter.fail(req.ip, email);
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    limiter.reset(req.ip, email);
    res.json({ token: signToken({ sub: user.id }, secret), usuario: publicUser(user) });
  });

  router.get('/me', requireAuth(secret), (req, res) => {
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.userId);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
    res.json(publicUser(user));
  });

  return router;
}

module.exports = { authRoutes };
