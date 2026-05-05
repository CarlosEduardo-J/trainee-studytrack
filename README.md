## 🎯 Objetivo do Projeto

O objetivo do projeto **StudyTrack** é desenvolver um aplicativo mobile que permita aos estudantes organizar e gerenciar sua rotina de estudos de forma centralizada, prática e eficiente.

A proposta é oferecer uma solução que integre o cadastro de matérias, criação de tarefas, controle de prazos e acompanhamento do progresso acadêmico em uma única plataforma, reduzindo a desorganização causada pelo uso de múltiplas ferramentas.

Com isso, o sistema busca melhorar a produtividade dos usuários, facilitar o planejamento dos estudos e proporcionar uma visão clara da evolução acadêmica ao longo do tempo, promovendo maior disciplina, consistência e autonomia no processo de aprendizagem.

## Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando tecnologias modernas voltadas para a criação de aplicações multiplataforma, priorizando desempenho, produtividade e organização do código.

* **Flutter**: Framework desenvolvido pelo Google utilizado para a construção da interface do aplicativo. Com ele, foi possível criar uma aplicação multiplataforma (Android, iOS, Web, etc.) a partir de um único código-fonte, garantindo consistência visual e boa performance.

* **Dart**: Linguagem de programação utilizada no desenvolvimento do projeto. O Dart foi escolhido por sua integração nativa com o Flutter, além de oferecer uma sintaxe simples, tipagem segura e boa performance na execução.

* **Visual Studio Code (VS Code)**: Editor de código utilizado durante o desenvolvimento. Foi escolhido por ser leve, eficiente e possuir diversas extensões que facilitam o trabalho com Flutter e Dart, como suporte a debugging, formatação automática e gerenciamento de pacotes.

* **Estilização do projeto (styles.css)**: Integrante que produziu: Samuel Stefano
## Integração da estlização

A estilização é referenciada em `web/index.html` via `<link rel="stylesheet" href="styles.css">`.

## Observação técnica da estilização

No Flutter, a maior parte da UI é desenhada pelo **motor de renderização** (não por CSS direto nos widgets). O CSS aqui atua no **entorno Web** (página e host do canvas). Ajustes finos de telas e componentes continuam em **Dart** (`ThemeData`, `TextStyle`, etc.), podendo espelhar as cores definidas em `:root` para consistência.
