# Documentação

Bem-vindo à documentação oficial do projeto. Aqui você encontrará as informações essenciais para entender, instalar, contribuir e evoluir com a base de código.

---

## 🚀 Visão Geral

Este projeto tem como objetivo [**fornecer uma alternativa ao Avell Custom Control**] para a base de clientes da Avell que utilizam sistemas GNU/Linux em seus notebooks.

---

## ⚙️ Requisitos

- [x] Git  
- [x] gcc/g++  
- [x] make
- [x] nodejs
- [x] npm
- [x] libudev-dev

---

## 📦 Instalação do ambiente de desenvolvimento

1. Instale as dependencias do projeto:
    Ex (deb):
    ```bash
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    
    sudo apt install -y git gcc g++ make nodejs libudev-dev
    ```
2. Clone e instale as bibliotecas
```bash
git clone https://github.com/avell-labs/avell-control-center

cd avell-control-center

npm install
```
**Nota:** Não continue com `npm audit fix`. Essa ação é conhecida por causar vários problemas.
3. Instale os serviços em sua máquina, ou, use os mesmos serviços configurados na instalação oficial.
    Instruções manuais:
    - Copie os arquivos `accd.service` e `accd-sleep.service` (de src/dist-data) para `/etc/systemd/system/`;
    - Edite o arquivo `accd.service` (exec start/stop) para apontar para `caminho do projeto/dist/avell-control-center/data/service/accd`;
    - Copie o arquivo `com.tuxedocomputers.tccd.conf` para `/usr/share/dbus-1/system.d/`;
    - Inicie o serviço `systemctl start accd` e ative para iniciar automaticamente `systemctl enable accd accd-sleep`.
    
## Scripts NPM
`npm run <nome-do-script>`

| Nome do Script                   | Descrição                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| build                          | Builda todos os apps service/electron/angular                         |
| start                          | Inicialização normal do app após a build                        |
| start-watch                    | Inicia o GUI com carregamento automático em modificações no diretório do angular |
| test-common                    | Testa arquivos comuns (jasmine)                                     |
| gen-lang                       | Gera a base para traduções (`ng-app/assets/locale/lang.xlf`) |
| pack-prod -- all \| deb \| rpm | Builda e empacota para o(s) target(s)                          |
| inc-version-patch              | Aumenta a versão do patch (atualiza o package.json files)             |
| inc-version-minor              | Aumenta a versão minor (atualiza o package.json files)             |
| inc-version-major              | Aumenta a versão major (atualiza o package.json files)             |

## Debugging
Debug do projeto está configurado apenas para o VSCode no arquivo .vscode/launch.json
