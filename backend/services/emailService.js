const { BrevoClient } = require('@getbrevo/brevo');

const brevoApiKey = process.env.BREVO_API_KEY || process.env.CHAVE_API_BREVO;

if (!brevoApiKey) {
  throw new Error('BREVO_API_KEY não definido. Defina em .env.');
}

const fromEmail = process.env.BREVO_FROM_EMAIL;
if (!fromEmail) {
  throw new Error('BREVO_FROM_EMAIL não definido. Defina em .env com um remetente verificado no Brevo.');
}

const brevo = new BrevoClient({ apiKey: brevoApiKey });

/**
 * @param {string} email
 * @param {string} codigo
 */
const enviarCodigo = async (email, codigo) => {
  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: 'Bet Hotel', email: fromEmail },
      to: [{ email }],
      subject: 'Código de verificação - Bet Hotel',
      htmlContent: `
        <html>
          <body style="font-family: sans-serif; max-width: 600px; margin: 0; padding: 0;">
            <h2>Bem-vindo ao Bet Hotel!</h2>
            <p>Use o código abaixo para completar seu cadastro:</p>
            <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f0f0f0; display: inline-block;">
              ${codigo}
            </div>
            <p>Ele expira em 10 minutos.</p>
          </body>
        </html>
      `,
      textContent: `Seu código de verificação é: ${codigo}`,
    });

    console.log('E-mail enviado com sucesso:', response);
    return response;
  } catch (error) {
    const err = /** @type {any} */ (error);
    const responseData = err?.body || err;
    const message = responseData?.message || err.message || 'Falha no envio do e-mail de verificação';
    console.error('Erro Brevo:', responseData);
    throw new Error(`Falha no envio do e-mail de verificação: ${message}`);
  }
};

module.exports = { enviarCodigo };