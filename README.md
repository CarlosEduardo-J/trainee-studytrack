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

## 💻 Ambiente de Desenvolvimento

Siga os passos abaixo para configurar e executar o projeto localmente utilizando o **Visual Studio Code**.

### 📌 Pré-requisitos

- Git instalado
- Flutter SDK (versão estável)
- VS Code instalado
- Emulador Android ou dispositivo físico configurado

---

## 🚀 Passo a Passo para Execução

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/CarlosEduardo-J/trainee-studytrack.git
```

### 2️⃣ Acessar a pasta do projeto

```bash
cd trainee-studytrack
```

### 3️⃣ Acessar a branch de desenvolvimento

```bash
git checkout develop
```

### 4️⃣ Instalar as dependências

```bash
flutter pub get
```

### 5️⃣ Executar a aplicação

```bash
flutter run
```

---

## 🚀 Tecnologias Utilizadas

### 🧩 Frameworks e Linguagens

- **Flutter**  
  Framework multiplataforma utilizado para construção da interface do aplicativo.

- **Dart**  
  Linguagem principal utilizada no desenvolvimento do sistema.

- **CSS**  
  Utilizado para estilização da versão Web (`index.html`).

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