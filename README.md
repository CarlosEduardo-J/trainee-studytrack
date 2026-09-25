# 📚 StudyTrack - Sistema de Gestão Acadêmica

## 🎯 Objetivo do Projeto

O objetivo do projeto **StudyTrack** é desenvolver um aplicativo mobile que permita aos estudantes organizar e gerenciar sua rotina de estudos de forma centralizada, prática e eficiente.

A proposta integra o cadastro de matérias, criação de tarefas, controle de prazos e acompanhamento do progresso acadêmico em uma única plataforma.

O sistema busca melhorar a produtividade dos usuários, facilitando o planejamento e promovendo maior disciplina e autonomia no processo de aprendizagem.

---

## 📂 Gestão e Planejamento

Toda a documentação de planejamento e acompanhamento do projeto está centralizada na pasta `/docs`.

### Documentações disponíveis:

- **Backlog do Produto**  
  Lista de funcionalidades planejadas e priorizadas.

- **Roadmap Executivo**  
  Cronograma de desenvolvimento dividido por Sprints.

- **Acompanhamento**  
  Evidências de quadros Kanban e diagramas de Gantt para a Sprint 1.

- **Fluxo de Trabalho**  
  Documentação do processo baseado na metodologia Scrum.

---

## ⚙️ Fluxo de Trabalho (GitFlow)

Para garantir a estabilidade do código e a colaboração organizada entre a equipe, adotamos uma metodologia GitFlow adaptada.

### Estrutura das Branches

- **`main` (Produção)**  
  Reservada para versões estáveis, testadas e validadas do sistema.

- **`develop` (Desenvolvimento)**  
  Responsável pela integração das funcionalidades entregues pela equipe antes da produção.

- **`feature/*` ou `nome/*` (Funcionalidades)**  
  Ramificações isoladas para desenvolvimento individual de tarefas.

  Exemplo:
  ```bash
  Samuel/estilizacao
  ```

### Code Review

Todo código só entra na branch `develop` por meio de um **Pull Request**, que deve ser revisado e aprovado por outro integrante da equipe.

---

## 💻 Como Executar (versão do 3º bimestre)

A versão funcional é o **app web responsivo (PWA)** servido pela API em `backend/`.

```bash
git clone https://github.com/CarlosEduardo-J/trainee-studytrack.git
cd trainee-studytrack/backend
npm install
cp .env.example .env
npm run seed    # dados de demonstração (opcional)
npm start       # http://localhost:3000
```

Detalhes de rotas, variáveis e segurança em [`backend/README.md`](backend/README.md).

O projeto Flutter da raiz (`lib/`) continua como base para a versão mobile nativa, planejada para um
próximo ciclo; ele consumirá a mesma API.

---

## 🚀 Tecnologias Utilizadas

### 🧩 Frameworks e Linguagens

- **Flutter**  
  Framework multiplataforma utilizado para construção da interface do aplicativo.

- **Dart**  
  Linguagem principal utilizada no desenvolvimento do sistema.

- **Node.js + Express 5 + SQLite**  
  API REST com autenticação JWT e banco de dados.

- **HTML, CSS e JavaScript (PWA)**  
  App web responsivo instalável no celular.

### 🛠️ Ferramentas

- **Visual Studio Code**  
  IDE utilizada para desenvolvimento e gerenciamento do terminal Git.

- **Git & GitHub**  
  Controle de versão e colaboração entre os integrantes.

---

## 👥 Equipe e Contribuições

As responsabilidades detalhadas estão registradas na pasta:

```bash
/docs/integrantes
```

### Integrantes

| Nome | Responsabilidade |
|------|------------------|
| Carlos Eduardo Jaquis Alexandria | Product Owner (PO), Gestão de Versionamento e Desenvolvedor Full Stack |
| Samuel Stefano Teixeira do Carmo | Desenvolvedor Backend e Estilização |
| João Italo Moreira Pamplona | Desenvolvedor Frontend |
| João Vitor Melo | Infraestrutura e Banco de Dados |

---

## 📌 Status do Projeto

🚧 Projeto em desenvolvimento acadêmico.

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos e educacionais.