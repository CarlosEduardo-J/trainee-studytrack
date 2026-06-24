const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para processar dados de formulários/JSON
app.use(express.json());

// Banco de dados temporário em memória (atende a "Persistência quando aplicável")
let tarefasMock = [
  { id: 1, titulo: "Estudar para a prova", descricao: "Matéria de Backend", data_limite: "2026-06-25" },
  { id: 2, titulo: "Finalizar o trabalho", descricao: "Enviar no prazo", data_limite: "2026-06-24" }
];

// Rota GET: Listar tarefas (Páginas/Respostas Dinâmicas)
app.get('/tarefas', (req, res) => {
  res.status(200).json(tarefasMock);
});

// Rota GET: Buscar tarefa por ID
app.get('/tarefas/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const tarefa = tarefasMock.find(t => t.id === id);

  if (!tarefa) {
    return res.status(404).json({
      error: "Tarefa não encontrada"
    });
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
    id: tarefasMock.length + 1,
    titulo,
    descricao: descricao || "",
    data_limite: data_limite || ""
  };

  tarefasMock.push(novaTarefa);

  res.status(201).json({
    message: "🚀 Tarefa criada com sucesso (Simulação)!",
    dados: novaTarefa
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});
