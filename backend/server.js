require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configura o backend para entender quando o Flutter enviar dados em formato JSON
app.use(express.json());

// Conexão com o Supabase usando as variáveis do arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CRITÉRIO DO PROFESSOR: ROTA GET (Busca de dados dinâmicos) ---
app.get('/tarefas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tarefas').select('*');
    if (error) throw error;
    
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar tarefas do banco.' });
  }
});

// --- CRITÉRIO DO PROFESSOR: ROTA POST e VALIDAÇÃO DE DADOS ---
app.post('/tarefas', async (req, res) => {
  const { titulo, descricao, data_limite } = req.body;

  // Validação explícita em código (o professor exige isso!)
  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ error: 'O título da tarefa é obrigatório.' });
  }
  if (titulo.length < 3) {
    return res.status(400).json({ error: 'O título deve ter pelo menos 3 caracteres.' });
  }

  try {
    // Persistindo os dados no Supabase através do backend
    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ titulo, descricao, data_limite }])
      .select();

    if (error) throw error;

    return res.status(201).json({ message: 'Tarefa criada com sucesso!', data });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar a tarefa no banco.' });
  }
});

// Liga o servidor na porta 3000
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});