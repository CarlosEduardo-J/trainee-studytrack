const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: habilita CORS para que o app Flutter (web e mobile) consiga consumir a API
app.use(cors());

// Middleware: processa dados de formulários/JSON
app.use(express.json());

// Middleware: logger simples de requisições (método, rota, status, tempo)
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - inicio;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Banco de dados temporário em memória (atende a "Persistência quando aplicável")
let tarefasMock = [
  { id: 1, titulo: "Estudar para a prova", descricao: "Matéria de Backend", data_limite: "2026-06-25" },
  { id: 2, titulo: "Finalizar o trabalho", descricao: "Enviar no prazo", data_limite: "2026-06-24" }
];

// Contador de IDs — sobrevive a deleções (length + 1 quebrava ao remover tarefas)
let proximoId = tarefasMock.length + 1;

// Rota GET: Health check (verifica se o servidor está vivo)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rota GET: Listar tarefas (Páginas/Respostas Dinâmicas)
app.get('/tarefas', (req, res) => {
  res.status(200).json(tarefasMock);
});

// Rota GET: Buscar tarefa por ID
app.get('/tarefas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const tarefa = tarefasMock.find(t => t.id === id);

  if (!tarefa) {
    return res.status(404).json({ error: "Tarefa não encontrada" });
  }

  res.status(200).json(tarefa);
});

// Rota POST: Processamento de Formulário com Validação de Dados
app.post('/tarefas', (req, res) => {
  const { titulo, descricao, data_limite } = req.body;

  // VALIDAÇÃO EXIGIDA PELO PROFESSOR
  if (!titulo || titulo.trim() === "") {
    return res.status(400).json({ error: "O título da tarefa é obrigatório!" });
  }

  // Cria o novo objeto simulando a inserção no banco
  const novaTarefa = {
    id: proximoId++,
    titulo: titulo.trim(),
    descricao: (descricao || "").trim(),
    data_limite: data_limite || ""
  };

  tarefasMock.push(novaTarefa);

  res.status(201).json({
    message: "🚀 Tarefa criada com sucesso (Simulação)!",
    dados: novaTarefa
  });
});

// Rota PUT: Atualizar uma tarefa existente
app.put('/tarefas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const tarefa = tarefasMock.find(t => t.id === id);

  if (!tarefa) {
    return res.status(404).json({ error: "Tarefa não encontrada" });
  }

  const { titulo, descricao, data_limite } = req.body;

  if (titulo !== undefined) {
    if (!titulo || titulo.trim() === "") {
      return res.status(400).json({ error: "O título da tarefa não pode ficar vazio!" });
    }
    tarefa.titulo = titulo.trim();
  }
  if (descricao !== undefined) tarefa.descricao = descricao.trim();
  if (data_limite !== undefined) tarefa.data_limite = data_limite;

  res.status(200).json({
    message: "✏️ Tarefa atualizada com sucesso (Simulação)!",
    dados: tarefa
  });
});

// Rota DELETE: Remover uma tarefa por ID
app.delete('/tarefas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const indice = tarefasMock.findIndex(t => t.id === id);

  if (indice === -1) {
    return res.status(404).json({ error: "Tarefa não encontrada" });
  }

  const [removida] = tarefasMock.splice(indice, 1);

  res.status(200).json({
    message: "🗑️ Tarefa removida com sucesso (Simulação)!",
    dados: removida
  });
});

// Middleware: 404 para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada` });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});
