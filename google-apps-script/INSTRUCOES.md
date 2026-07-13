# Configuração rápida do Google Apps Script

1. Crie uma planilha privada no Google Sheets.
2. Copie o ID entre `/d/` e `/edit` na URL da planilha.
3. Na planilha, abra **Extensões → Apps Script**.
4. Substitua o conteúdo de `Code.gs` pelo arquivo deste diretório.
5. Preencha `SETTINGS.SPREADSHEET_ID` e confira limites, parcelas, método, taxa e percentual de entrada.
6. Execute `setupSheet()` uma vez e autorize o acesso solicitado.
7. Clique em **Implantar → Nova implantação → Aplicativo da web**.
8. Configure a execução como o proprietário e permita acesso ao público que usará o formulário.
9. Copie a URL final terminada em `/exec` para `js/config.js`.
10. Teste em uma janela anônima. A planilha deve continuar privada.

Após qualquer alteração no script, crie uma **nova versão da implantação**. Não basta salvar o editor. Instruções detalhadas e solução de problemas estão no `README.md` da raiz.
