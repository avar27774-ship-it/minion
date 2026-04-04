const https = require('https');

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';

function sendTg(chatId, text, opts = {}) {
  const token = BOT_TOKEN();
  if (!token || !chatId) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'HTML', ...opts });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => { r.resume(); resolve(); });
    req.on('error', () => resolve());
    req.setTimeout(5000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function name(user) {
  return user?.first_name || user?.firstName || user?.username || `ID:${user?.telegram_id || user?.telegramId || '?'}`;
}

// ── Регистрация ───────────────────────────────────────────────────────────────
async function notifyRegistered(user) {
  await sendTg(user.telegram_id || user.telegramId,
    `🎉 <b>Добро пожаловать в MINIONS!</b>\n\nАккаунт <b>@${user.username}</b> успешно создан.\n\n🛍 Покупай, продавай и зарабатывай безопасно!`
  );
}

// ── Пополнение баланса ────────────────────────────────────────────────────────
async function notifyDeposit(user, amount, currency, gateway) {
  await sendTg(user.telegram_id || user.telegramId,
    `💰 <b>Пополнение баланса</b>\n\n` +
    `Зачислено: <b>+$${parseFloat(amount).toFixed(2)}</b>\n` +
    `Способ: ${gateway || currency}\n` +
    `Новый баланс: <b>$${parseFloat(user.balance || 0).toFixed(2)}</b>\n\n` +
    `Удачных сделок! 🚀`
  );
}

// ── Вывод средств ─────────────────────────────────────────────────────────────
async function notifyWithdraw(user, amount, currency) {
  await sendTg(user.telegram_id || user.telegramId,
    `📤 <b>Вывод средств</b>\n\n` +
    `Сумма: <b>-$${parseFloat(amount).toFixed(2)} ${currency || 'USDT'}</b>\n` +
    `Статус: ⏳ В обработке\n\n` +
    `Средства придут в течение нескольких минут.`
  );
}

// ── Новая сделка (покупка) ────────────────────────────────────────────────────
async function notifyPurchase(buyer, seller, productTitle, amount) {
  await Promise.all([
    sendTg(buyer.telegram_id || buyer.telegramId,
      `🛒 <b>Покупка оформлена!</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n` +
      `💵 Сумма: <b>$${parseFloat(amount).toFixed(2)}</b>\n` +
      `🔒 Деньги в эскроу — защищены до подтверждения\n\n` +
      `⏳ Ожидайте передачи товара от продавца.\n` +
      `⚠️ Не подтверждайте пока не проверите товар!`
    ),
    sendTg(seller.telegram_id || seller.telegramId,
      `🔥 <b>Новая продажа!</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n` +
      `💵 Сумма: <b>$${parseFloat(amount).toFixed(2)}</b>\n` +
      `👤 Покупатель: @${name(buyer)}\n\n` +
      `⚡ Передайте товар как можно скорее!\n` +
      `⏱ У вас 72 часа на передачу.`
    ),
  ]);
}

// ── Товар передан покупателю ──────────────────────────────────────────────────
async function notifyDelivered(buyer, productTitle, sellerName) {
  await sendTg(buyer.telegram_id || buyer.telegramId,
    `📬 <b>Продавец передал товар!</b>\n\n` +
    `📦 Товар: <b>${productTitle}</b>\n` +
    `👤 Продавец: @${sellerName}\n\n` +
    `✅ Проверьте товар и подтвердите получение на сайте.\n` +
    `⏱ Если не подтвердите в течение <b>72 часов</b> — сделка закроется автоматически.\n` +
    `⚠️ Если что-то не так — откройте спор!`
  );
}

// ── Сделка завершена ──────────────────────────────────────────────────────────
async function notifyDealComplete(buyer, seller, productTitle, sellerAmount) {
  await Promise.all([
    sendTg(buyer.telegram_id || buyer.telegramId,
      `✅ <b>Сделка завершена!</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n\n` +
      `Спасибо за покупку! Оставьте отзыв продавцу 🌟`
    ),
    sendTg(seller.telegram_id || seller.telegramId,
      `✅ <b>Деньги зачислены!</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n` +
      `💰 Зачислено: <b>+$${parseFloat(sellerAmount).toFixed(2)}</b> (после комиссии 5%)\n\n` +
      `Отличная работа! 🎉`
    ),
  ]);
}

// ── Спор открыт ───────────────────────────────────────────────────────────────
async function notifyDealDispute(buyer, seller, productTitle) {
  await Promise.all([
    sendTg(buyer.telegram_id || buyer.telegramId,
      `⚠️ <b>Спор открыт</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n\n` +
      `Администратор рассмотрит ваш спор в ближайшее время.\n` +
      `Пожалуйста, опишите проблему в чате сделки.`
    ),
    sendTg(seller.telegram_id || seller.telegramId,
      `⚠️ <b>Покупатель открыл спор!</b>\n\n` +
      `📦 Товар: <b>${productTitle}</b>\n\n` +
      `Деньги заморожены до решения администратора.\n` +
      `Объясните ситуацию в чате сделки.`
    ),
  ]);
}

// ── Возврат средств ───────────────────────────────────────────────────────────
async function notifyDealRefund(buyer, productTitle, amount) {
  await sendTg(buyer.telegram_id || buyer.telegramId,
    `↩️ <b>Возврат средств!</b>\n\n` +
    `📦 Товар: <b>${productTitle}</b>\n` +
    `💰 Возвращено: <b>+$${parseFloat(amount).toFixed(2)}</b>\n\n` +
    `Деньги уже на вашем балансе.`
  );
}

// ── Бан ───────────────────────────────────────────────────────────────────────
async function notifyBanned(user, bannedUntil, reason) {
  const exp = bannedUntil ? `до ${new Date(bannedUntil).toLocaleString('ru')}` : 'навсегда';
  await sendTg(user.telegram_id || user.telegramId,
    `🚫 <b>Аккаунт заблокирован</b>\n\n` +
    `Срок: <b>${exp}</b>\n` +
    (reason ? `Причина: ${reason}\n` : '') +
    `\nЕсли считаете блокировку ошибочной — обратитесь в поддержку.`
  );
}

// ── Разбан ────────────────────────────────────────────────────────────────────
async function notifyUnbanned(user) {
  await sendTg(user.telegram_id || user.telegramId,
    `✅ <b>Аккаунт разблокирован</b>\n\n` +
    `Добро пожаловать обратно, @${user.username}!\n` +
    `Соблюдайте правила платформы.`
  );
}

// ── Заморозка аккаунта (freeze) ───────────────────────────────────────────────
async function notifyFrozen(user) {
  await sendTg(user.telegram_id || user.telegramId,
    `🧊 <b>Аккаунт временно заморожен</b>\n\n` +
    `Ваш аккаунт <b>@${user.username}</b> заморожен администратором.\n\n` +
    `Новые сделки и операции временно недоступны.\n` +
    `По вопросам обратитесь в поддержку.`
  );
}

// ── Разморозка аккаунта ───────────────────────────────────────────────────────
async function notifyUnfrozen(user) {
  await sendTg(user.telegram_id || user.telegramId,
    `✅ <b>Аккаунт разморожен</b>\n\n` +
    `Ваш аккаунт <b>@${user.username}</b> снова активен.\n\n` +
    `Все функции платформы доступны. Удачных сделок! 🚀`
  );
}

// ── Товар удалён администратором ──────────────────────────────────────────────
async function notifyProductDeleted(user, productTitle, reason) {
  await sendTg(user.telegram_id || user.telegramId,
    `🗑 <b>Ваш товар удалён</b>\n\n` +
    `📦 Товар: <b>${productTitle}</b>\n` +
    (reason ? `Причина: ${reason}\n` : '') +
    `\nЕсли считаете удаление ошибочным — обратитесь в поддержку.`
  );
}

// ── Товар продвинут администратором ──────────────────────────────────────────
async function notifyProductPromoted(user, productTitle, hours) {
  await sendTg(user.telegram_id || user.telegramId,
    `🚀 <b>Ваш товар продвинут!</b>\n\n` +
    `📦 Товар: <b>${productTitle}</b>\n` +
    `⏱ Продвижение активно: <b>${hours} часов</b>\n\n` +
    `Теперь ваш товар в топе выдачи!`
  );
}

// ── Получен отзыв ─────────────────────────────────────────────────────────────
async function notifyReview(user, fromUsername, rating, comment) {
  const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)));
  await sendTg(user.telegram_id || user.telegramId,
    `${stars} <b>Новый отзыв!</b>\n\n` +
    `От: @${fromUsername}\n` +
    `Оценка: ${stars} (${rating}/5)\n` +
    (comment ? `Комментарий: "${comment}"` : '')
  );
}

// ── Новое личное сообщение ────────────────────────────────────────────────────
async function notifyMessage(user, fromName, dealTitle) {
  await sendTg(user.telegram_id || user.telegramId,
    `💬 <b>Новое сообщение</b>\n\n` +
    `От: @${fromName}\n` +
    `Сделка: ${dealTitle}\n\n` +
    `Откройте сайт чтобы ответить.`
  );
}

// ── Корректировка баланса ─────────────────────────────────────────────────────
async function notifyBalanceAdjust(user, amount, reason) {
  const sign = amount >= 0 ? '+' : '';
  const icon = amount >= 0 ? '💰' : '💸';
  await sendTg(user.telegram_id || user.telegramId,
    `${icon} <b>Корректировка баланса</b>\n\n` +
    `Изменение: <b>${sign}$${parseFloat(amount).toFixed(2)}</b>\n` +
    `Причина: ${reason || 'Действие администратора'}\n\n` +
    `Проверьте баланс на сайте.`
  );
}

// ── Код подтверждения ─────────────────────────────────────────────────────────
async function sendCode(telegramId, code, type) {
  const action = type === 'reset' ? 'сброса пароля' : 'регистрации';
  await sendTg(telegramId,
    `🔐 <b>Код ${action} MINIONS</b>\n\nВаш одноразовый код:\n\n<code>${code}</code>\n\n⏱ Действителен 10 минут.\n❗ Никому не сообщайте этот код!`
  );
}

module.exports = {
  sendTg,
  notifyRegistered,
  notifyDeposit,
  notifyWithdraw,
  notifyPurchase,
  notifyDelivered,
  notifyDealComplete,
  notifyDealDispute,
  notifyDealRefund,
  notifyBanned,
  notifyUnbanned,
  notifyFrozen,
  notifyUnfrozen,
  notifyProductDeleted,
  notifyProductPromoted,
  notifyReview,
  notifyMessage,
  notifyBalanceAdjust,
  sendCode,
};
