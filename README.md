# LFY Créditos

Site estático, responsivo e sem dependências para simulação e envio de solicitações de empréstimo particular. O fluxo tem três etapas: simulação, dados pessoais e confirmação. A persistência é feita em uma planilha privada por meio de Google Apps Script.

> **Importante:** o projeto vem em modo demonstrativo. Ele não deve ser divulgado para contratação antes do preenchimento dos dados legais, da revisão das condições financeiras e da implantação do Apps Script.

## Estrutura

```text
index.html                 Simulador e conteúdo institucional
solicitar.html             Formulário de solicitação
sucesso.html               Confirmação do servidor
privacidade.html           Aviso de Privacidade
termos.html                Termos de Uso
404.html                   Página de erro
robots.txt                 Orientação aos buscadores
assets/                    Logotipos, favicon e imagens
css/styles.css             Identidade visual e responsividade
css/mobile.css             Estado inicial seguro do menu mobile
js/config.js               Configurações centrais do navegador
js/utils.js                Cálculos, máscaras e validações reutilizáveis
js/simulador.js            Interações da página inicial
js/solicitacao.js          Validação e integração do formulário
google-apps-script/Code.gs Backend da planilha
google-apps-script/INSTRUCOES.md Guia rápido
tests/test-utils.js         Testes unitários dos cálculos e validações
```

Todos os links usam caminhos relativos e funcionam em um repositório de projeto do GitHub Pages, como `usuario.github.io/nome-do-repositorio/`.

## Abrir localmente

Você pode abrir `index.html` diretamente. Para reproduzir melhor o ambiente de publicação, use um servidor estático na raiz:

```bash
python -m http.server 4173
```

Depois visite `http://localhost:4173/`. O site não exige instalação ou processo de build.

## Configuração financeira

Edite `js/config.js`:

- `minAmount` e `maxAmount`: valores mínimo e máximo;
- `amountStep`: intervalo do seletor;
- `allowedInstallments`: parcelas exibidas e aceitas;
- `monthlyInterestRate`: taxa mensal em decimal (`0.008` = 0,80% a.m.);
- `downPaymentRate`: percentual obrigatório de entrada (`0.10` = 10%);
- `calculationMethod`: `PRICE` ou `SIMPLE`;
- `googleAppsScriptUrl`: URL `/exec` da implantação;
- `demoMode`: troque para `false` somente depois da revisão final;
- `company`: dados do responsável e contato de privacidade.

Repita os mesmos limites, parcelas, taxa, entrada e método em `google-apps-script/Code.gs`. O servidor recalcula tudo e não confia em valores de parcela, entrada ou total enviados pelo navegador.

Na configuração atual, o valor solicitado vai de R$ 1.000 a R$ 30.000, a taxa é de 0,80% ao mês, a entrada corresponde a 10% e o prazo máximo é de 48 parcelas. As parcelas incidem sobre os 90% restantes; o total estimado pago soma a entrada e todas as parcelas.

### Price e juros simples

No sistema Price, a prestação é constante e calculada por:

```text
parcela = valor × taxa / (1 - (1 + taxa)^(-parcelas))
```

Se a taxa for zero, a parcela é `valor / parcelas`.

Em juros simples:

```text
total = valor × (1 + taxa × parcelas)
parcela = total / parcelas
```

Os resultados são arredondados para centavos. O total exibido é a parcela arredondada multiplicada pelo número de parcelas, evitando divergência visual entre parcela e total.

## Conectar ao Google Sheets

### 1. Criar e preparar a planilha

1. Crie uma nova planilha no Google Sheets. Não a torne pública.
2. Na URL, copie o trecho entre `/d/` e `/edit`; esse é o ID da planilha.
3. Abra **Extensões → Apps Script**.
4. Cole o conteúdo de `google-apps-script/Code.gs` no editor.
5. Substitua `PREENCHER_COM_O_ID_DA_PLANILHA` pelo ID copiado.
6. Confira `MIN_AMOUNT`, `MAX_AMOUNT`, `AMOUNT_STEP`, `ALLOWED_INSTALLMENTS`, `CALCULATION_METHOD`, `MONTHLY_INTEREST_RATE` e `DOWN_PAYMENT_RATE` para que coincidam com `js/config.js`.
7. Selecione `setupSheet` no editor e clique em **Executar**.
8. Autorize o script com a conta proprietária. `setupSheet()` cria/formata a aba `Solicitacoes` e seus 18 cabeçalhos.

### 2. Publicar o aplicativo da web

1. Clique em **Implantar → Nova implantação**.
2. Escolha **Aplicativo da web**.
3. Em **Executar como**, escolha o proprietário do script.
4. Em **Quem pode acessar**, escolha a opção compatível com um formulário público na sua conta Google. A nomenclatura pode variar entre contas pessoais e Workspace.
5. Confirme a implantação e copie a URL terminada em `/exec` — não use a URL `/dev`.
6. Cole a URL em `googleAppsScriptUrl`, dentro de `js/config.js`.
7. Abra o site em janela anônima, envie uma solicitação de teste e confirme a nova linha na planilha.

A planilha continua privada; somente o aplicativo recebe os dados. O ID da planilha existe apenas no Apps Script. A resposta ao navegador contém somente sucesso/erro e o protocolo, nunca CPF, telefone, ID interno ou stack trace.

### CORS e formato do envio

O formulário envia `application/x-www-form-urlencoded` com `URLSearchParams`, formato compatível com `doPost(e)` e que evita preflight desnecessário. O código segue redirecionamentos e exige uma resposta JSON válida com `ok: true`; não usa `no-cors`, pois esse modo impediria confirmar a gravação. Se uma política corporativa bloquear o domínio `script.google.com`, libere o domínio no ambiente ou hospede o endpoint em uma conta autorizada; não desative a confirmação de sucesso.

### Atualizar o Apps Script

Depois de editar `Code.gs`, abra **Implantar → Gerenciar implantações**, edite a implantação, selecione **Nova versão** e confirme. Apenas salvar o código não atualiza a versão pública. Teste novamente em janela anônima.

## Testes

Com Node.js disponível, execute na raiz:

```bash
node tests/test-utils.js
node --check js/config.js
node --check js/utils.js
node --check js/simulador.js
node --check js/solicitacao.js
node --check google-apps-script/Code.gs
```

### Roteiro manual obrigatório

1. Teste os valores mínimo e máximo e entradas fora deles (devem ser ajustadas aos limites).
2. Altere o valor pelo slider e pelo campo monetário.
3. Selecione todas as parcelas configuradas.
4. Em uma cópia local da configuração, teste taxa zero, `PRICE` e `SIMPLE`.
5. Continue, use “Alterar simulação” e confirme que valor/parcelas permanecem selecionados após atualizar a página.
6. Teste CPF válido e inválido, CPF repetido, nome com uma palavra/números, data de nascimento de adulto/menor e telefone sem celular/DDD.
7. Tente enviar sem marcar cada aceite; eles nunca devem vir marcados.
8. Clique duas vezes no envio; o botão deve permanecer bloqueado durante a requisição.
9. Com a URL de exemplo, confirme a mensagem de canal não configurado.
10. Simule offline, timeout e resposta de erro; os campos devem permanecer preenchidos.
11. Com o endpoint implantado, confirme sucesso, protocolo, linha correta na planilha e duplicidade do mesmo CPF+telefone em 24 horas.
12. Na página de sucesso, confirme que a simulação e dados pessoais foram removidos do `sessionStorage` e que nenhum CPF é exibido.
13. Navegue somente com teclado e verifique foco, acordeão, slider, opções, formulário e links.
14. Verifique em 320, 360, 390, 768, 1024 e 1440 px, sem rolagem horizontal.
15. Publique em um repositório de projeto e confirme os caminhos no subdiretório do GitHub Pages.

O registro real na planilha só pode ser validado depois que o proprietário preencher o ID e implantar o endpoint. Até lá, os testes locais cobrem o bloqueio seguro da configuração incompleta.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie todo o conteúdo da raiz.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, pasta `/ (root)`, e salve.
5. Aguarde o endereço `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/` ficar disponível.
6. Teste o fluxo completo nessa URL e confirme o endpoint em janela anônima.

O arquivo `.nojekyll` evita processamento desnecessário pelo Jekyll. Não há segredos na parte publicada; o ID da planilha permanece no Apps Script.

## Revisão obrigatória antes de publicar

- [ ] Substituir `monthlyInterestRate` e `MONTHLY_INTEREST_RATE` pelo valor real e idêntico.
- [ ] Revisar limites, intervalo, parcelas e método nos dois arquivos de configuração.
- [ ] Revisar a entrada obrigatória em `downPaymentRate` e `DOWN_PAYMENT_RATE`.
- [ ] Preencher `SPREADSHEET_ID` somente no Apps Script.
- [ ] Implantar o Apps Script e preencher `googleAppsScriptUrl` com a URL `/exec`.
- [ ] Trocar `demoMode` para `false` apenas quando as condições estiverem prontas.
- [ ] Preencher razão/nome do responsável, documento e contato em `js/config.js`.
- [ ] Substituir todos os textos `PREENCHER ANTES DE PUBLICAR` em `privacidade.html` e `termos.html`.
- [ ] Informar a data de atualização dos documentos legais.
- [ ] Revisar prazo de retenção e compartilhamentos com orientação jurídica adequada.
- [ ] Testar o formulário em janela anônima e confirmar a gravação na planilha privada.
- [ ] Testar duplicidade, falha de conexão, timeout e nova versão do Apps Script.
- [ ] Revisar o site publicado em celular e desktop.

## Solução de problemas

- **“Canal de envio ainda não foi configurado”**: a URL em `js/config.js` ainda é o placeholder ou não termina em `/exec`.
- **Resposta inválida ou falha de internet**: confirme se a implantação é um Aplicativo da web, se o acesso permite o público pretendido e se a URL é da versão implantada.
- **Nenhuma linha é criada**: execute `setupSheet()`, confira o ID e o nome `Solicitacoes`, depois crie uma nova versão da implantação.
- **Pedido duplicado**: o mesmo CPF e telefone ficam bloqueados pelo período configurado em `DUPLICATE_WINDOW_HOURS`.
- **Valores do navegador e planilha diferem**: alinhe taxa, método, limites e parcelas entre `js/config.js` e `Code.gs`.
- **Alteração do script não aparece**: publique uma nova versão em **Gerenciar implantações**.
- **GitHub Pages retorna 404**: confirme branch/pasta em Settings → Pages e mantenha os arquivos na raiz selecionada.

## Segurança e manutenção

O backend valida novamente nome, CPF, telefone, aceites, limites e parcelas; recalcula valores; neutraliza conteúdo com risco de fórmula; usa `LockService`; gera protocolo único; limita duplicidades recentes e não retorna dados pessoais. Esses controles reduzem riscos, mas não constituem proteção absoluta. Restrinja o acesso à planilha e revise periodicamente as pessoas e integrações autorizadas.
