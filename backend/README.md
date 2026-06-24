# 🚀 Backend — StudyTrack

API REST de tarefas, em Node.js + Express, com armazenamento em memória.

---

## ▶️ Como Executar

```bash
cd backend
npm install
npm start
```

O servidor sobe em **http://localhost:3000** por padrão (ou na porta definida na variável de ambiente `PORT`).

Para rodar com hot reload durante o desenvolvimento:

```bash
npm run dev
```

---

## 🌱 Variáveis de Ambiente

Crie um arquivo `.env` na raiz de `backend/` baseado no `.env.example`:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta em que o servidor irá escutar |

---

## 📚 Rotas Disponíveis

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check do servidor (uptime + timestamp) |
| `GET` | `/tarefas` | Lista todas as tarefas |
| `GET` | `/tarefas/:id` | Busca uma tarefa pelo ID |
| `POST` | `/tarefas` | Cria uma nova tarefa (valida `titulo` obrigatório) |
| `PUT` | `/tarefas/:id` | Atualiza uma tarefa existente |
| `DELETE` | `/tarefas/:id` | Remove uma tarefa pelo ID |

---

## 🧪 Exemplos de Uso (curl)

**Listar tarefas:**
```bash
curl http://localhost:3000/tarefas
```

**Criar tarefa:**
```bash
curl -X POST http://localhost:3000/tarefas \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Nova tarefa","descricao":"Detalhes","data_limite":"2026-07-01"}'
```

**Atualizar tarefa:**
```bash
curl -X PUT http://localhost:3000/tarefas/1 \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Tarefa editada"}'
```

**Remover tarefa:**
```bash
curl -X DELETE http://localhost:3000/tarefas/1
```

---

## 🛠️ Stack

- **Node.js** + **Express 5**
- **CORS** habilitado para consumo do app Flutter (web e mobile)
- Armazenamento em memória (mock) — atende o requisito de "Persistência quando aplicável"

---

## ⚠️ Observações

- O armazenamento é em memória: os dados são **resetados** a cada restart do servidor.
- O `cors()` está aberto para qualquer origem por enquanto, suficiente para desenvolvimento.
