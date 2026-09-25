# 🚀 Backend + App Web — StudyTrack

API REST em **Node.js + Express 5** com banco **SQLite** (módulo nativo `node:sqlite`) que também serve o
aplicativo web responsivo (PWA) da pasta `public/`. Um único processo entrega a API e as telas.

---

## ▶️ Como Executar

Requer **Node.js 22.5+**.

```bash
cd backend
npm install
cp .env.example .env      # defina um JWT_SECRET longo
npm run seed              # (opcional) cria o banco com dados de demonstração
npm start
```

Acesse **http://localhost:3000** no navegador ou no celular (mesma rede, com `HOST=0.0.0.0`).
No celular, use "Adicionar à tela inicial" para instalar como app.

Contas de demonstração criadas pelo `seed` (senha `studytrack123`): `samuel@studytrack.app`
(aluno) e `carlos@studytrack.app` (representante da turma, código `K7M2QX`).

```bash
npm test                  # 10 testes automatizados da API (node:test)
```

---

## 🌱 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `HOST` | `127.0.0.1` | Interface de rede (use `0.0.0.0` só atrás de firewall/proxy) |
| `JWT_SECRET` | aleatório | Segredo de assinatura dos tokens. Sem ele, as sessões caem a cada reinício |
| `DB_FILE` | `./data/studytrack.db` | Arquivo do banco SQLite |
| `CORS_ORIGIN` | `*` | Origem liberada para clientes externos (ex.: app Flutter) |

---

## 📚 Rotas

Todas as rotas `/api/*`, exceto cadastro e login, exigem `Authorization: Bearer <token>`.
Cada aluno só enxerga e altera os próprios dados.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/cadastro` | Cria conta (`nome`, `email`, `senha`, `curso`) e devolve token |
| `POST` | `/api/auth/login` | Login; bloqueia 15 min após 5 senhas erradas |
| `GET` | `/api/auth/me` | Dados do usuário logado |
| `GET` | `/api/dashboard` | Resumo: abertas, concluídas, atrasadas, vencendo, progresso e semanas |
| `GET/POST` | `/api/disciplinas` | Lista / cria disciplina |
| `PUT/DELETE` | `/api/disciplinas/:id` | Edita / exclui disciplina |
| `GET/POST` | `/api/tarefas` | Lista (`?status=abertas\|concluidas`) / cria tarefa, trabalho ou prova |
| `GET/PUT/DELETE` | `/api/tarefas/:id` | Consulta / edita ou conclui / exclui |
| `GET/POST` | `/api/metas` | Lista com progresso calculado / cria meta |
| `DELETE` | `/api/metas/:id` | Exclui meta |
| `GET/POST` | `/api/turmas` | Minhas turmas / cria turma (quem cria vira representante) |
| `POST` | `/api/turmas/entrar` | Entra com o código da turma |
| `GET/POST` | `/api/turmas/:id/atividades` | Lista / publica atividade (só representante) |
| `PUT/DELETE` | `/api/turmas/:id/atividades/:atividadeId` | Edita / remove para todos (só representante) |
| `GET` | `/api/turmas/:id/membros` | Membros e conclusão das atividades da turma (só representante) |
| `DELETE` | `/api/turmas/:id/sair` | Sai da turma |

---

## 🗂️ Estrutura

```
backend/
├── server.js            # inicialização (env, banco, porta)
├── seed.js              # dados de demonstração
├── src/
│   ├── app.js           # Express: segurança, rotas, erros, arquivos estáticos
│   ├── app.test.js      # testes de ponta a ponta da API
│   ├── auth.js          # hash de senha (scrypt), JWT HS256, limite de login
│   ├── db.js            # schema SQLite
│   ├── validate.js      # validação de entrada e datas
│   └── routes/          # auth, dashboard, disciplinas, tarefas, metas, turmas
└── public/              # app web/PWA (HTML, CSS, JS, manifest, service worker)
```

---

## 🔒 Segurança

- Senhas guardadas com **scrypt + salt**; nunca são devolvidas pela API.
- Token **JWT HS256** com validade de 7 dias.
- Toda consulta filtra pelo usuário do token; acesso a dado de outro aluno responde 404.
- Atividades de turma só podem ser criadas, alteradas ou removidas pelo representante.
- Cabeçalhos `Content-Security-Policy`, `X-Frame-Options` e `nosniff`; corpo JSON limitado a 20 KB.
- Por padrão o servidor escuta só em `127.0.0.1`.
