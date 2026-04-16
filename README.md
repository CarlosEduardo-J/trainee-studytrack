## Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando tecnologias modernas voltadas para a criação de aplicações multiplataforma, priorizando desempenho, produtividade e organização do código.

* **Flutter**: Framework desenvolvido pelo Google utilizado para a construção da interface do aplicativo. Com ele, foi possível criar uma aplicação multiplataforma (Android, iOS, Web, etc.) a partir de um único código-fonte, garantindo consistência visual e boa performance.

* **Dart**: Linguagem de programação utilizada no desenvolvimento do projeto. O Dart foi escolhido por sua integração nativa com o Flutter, além de oferecer uma sintaxe simples, tipagem segura e boa performance na execução.

* **Visual Studio Code (VS Code)**: Editor de código utilizado durante o desenvolvimento. Foi escolhido por ser leve, eficiente e possuir diversas extensões que facilitam o trabalho com Flutter e Dart, como suporte a debugging, formatação automática e gerenciamento de pacotes.

* **Estilização do projeto (styles.css)**: Integrante que produziu: Samuel Stefano
## Integração

A estilização é referenciada em `web/index.html` via `<link rel="stylesheet" href="styles.css">`.

## Observação técnica

No Flutter, a maior parte da UI é desenhada pelo **motor de renderização** (não por CSS direto nos widgets). O CSS aqui atua no **entorno Web** (página e host do canvas). Ajustes finos de telas e componentes continuam em **Dart** (`ThemeData`, `TextStyle`, etc.), podendo espelhar as cores definidas em `:root` para consistência.
