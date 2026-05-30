FROM node:25-alpine

# Ferramentas de desenvolvimento essenciais
RUN apk add --no-cache \
    git \
    curl \
    bash \
    vim \
    openssh-client \
    # Necessário para alguns pacotes npm com bindings nativos
    python3 \
    make \
    g++

# NestJS CLI + utilitários globais para o fluxo de desenvolvimento
RUN npm install -g \
    @nestjs/cli@10 \
    ts-node \
    tsconfig-paths

WORKDIR /workspace

# Criar node_modules antecipadamente com ownership do usuário node.
# Quando o Docker inicializa um volume nomeado vazio, ele copia os metadados
# (permissões e proprietário) do diretório correspondente na imagem.
# Sem isso, o volume é criado com root:root, impedindo que o usuário node escreva.
RUN mkdir -p /workspace/node_modules && chown node:node /workspace/node_modules

# Usar o usuário não-root padrão da imagem node
USER node
