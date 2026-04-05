const https = require('https');
const { run } = require('../models/db');

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';

// ── Уведомление в БД (центр уведомлений) ─────────────────────────────────────
async function pushNotification(userId, { type, title, body, icon = '🔔', link }) {
  if (!userId) return;
  try {
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, icon, link, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW())::BIGINT)`,
      [userId, type, title, body || null, icon, link || null]
    );
    // Чистим старые — храним последние 50 на пользователя
    await run(
      `DELETE FROM notifications WHERE user_id = $1 AND id NOT IN (
         SELECT id FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
       )`,
      [userId]
    ).catch(() => {});
  } catch(e) {
    console.error('[notify] pushNotification error:', e.message);
  }
}

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
  await pushNotification(user.id || user._id, { type:'welcome', icon:'🎉', title:'Добро пожаловать!', body:`Аккаунт @${user.username} создан. Удачных сделок!`, link:'/' });
  await sendTg(user.telegram_id || user.telegramId,
    `🎉 <b>Добро пожаловать в MINIONS!</b>\n\nАккаунт <b>@${user.username}</b> успешно создан.\n\n🛍 Покупай, продавай и зарабатывай безопасно!`
  );
}

// ── Пополнение баланса ────────────────────────────────────────────────────────
async function notifyDeposit(user, amount, currency, gateway) {
  await pushNotification(user.id || user._id, { type:'deposit', icon:'💰', title:'Баланс пополнен', body:`+$${parseFloat(amount).toFixed(2)} через ${gateway || currency}`, link:'/wallet' });
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
  await pushNotification(user.id || user._id, { type:'withdraw', icon:'📤', title:'Вывод средств', body:`$${parseFloat(amount).toFixed(2)} ${currency || 'USDT'} — в обработке`, link:'/wallet' });
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
    pushNotification(buyer.id || buyer._id, { type:'deal_new', icon:'🛒', title:'Покупка оформлена', body:`${productTitle} — $${parseFloat(amount).toFixed(2)}`, link:'/deals' }),
    pushNotification(seller.id || seller._id, { type:'deal_new', icon:'🔥', title:'Новая продажа!', body:`${productTitle} — $${parseFloat(amount).toFixed(2)}`, link:'/deals' }),
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
  await pushNotification(buyer.id || buyer._id, { type:'delivered', icon:'📬', title:'Продавец передал товар', body:`${productTitle} — проверьте и подтвердите`, link:'/deals' });
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
    pushNotification(buyer.id || buyer._id, { type:'deal_complete', icon:'✅', title:'Сделка завершена', body:`${productTitle}`, link:'/deals' }),
    pushNotification(seller.id || seller._id, { type:'deal_complete', icon:'💰', title:'Деньги зачислены!', body:`+$${parseFloat(sellerAmount).toFixed(2)} за ${productTitle}`, link:'/wallet' }),
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
    pushNotification(buyer.id || buyer._id, { type:'dispute', icon:'⚠️', title:'Спор открыт', body:`По сделке: ${productTitle}`, link:'/deals' }),
    pushNotification(seller.id || seller._id, { type:'dispute', icon:'⚠️', title:'Покупатель открыл спор', body:`${productTitle} — ответьте в чате сделки`, link:'/deals' }),
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
  await pushNotification(buyer.id || buyer._id, { type:'refund', icon:'↩️', title:'Возврат средств', body:`+$${parseFloat(amount).toFixed(2)} — ${productTitle}`, link:'/wallet' });
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
  await pushNotification(user.id || user._id, { type:'ban', icon:'🚫', title:'Аккаунт заблокирован', body:reason || `Срок: ${exp}`, link:'/' });
  await sendTg(user.telegram_id || user.telegramId,
    `🚫 <b>Аккаунт заблокирован</b>\n\n` +
    `Срок: <b>${exp}</b>\n` +
    (reason ? `Причина: ${reason}\n` : '') +
    `\nЕсли считаете блокировку ошибочной — обратитесь в поддержку.`
  );
}

// ── Разбан ────────────────────────────────────────────────────────────────────
async function notifyUnbanned(user) {
  await pushNotification(user.id || user._id, { type:'unban', icon:'✅', title:'Аккаунт разблокирован', body:'Добро пожаловать обратно!', link:'/' });
  await sendTg(user.telegram_id || user.telegramId,
    `✅ <b>Аккаунт разблокирован</b>\n\n` +
    `Добро пожаловать обратно, @${user.username}!\n` +
    `Соблюдайте правила платформы.`
  );
}

// ── Заморозка аккаунта (freeze) ───────────────────────────────────────────────
async function notifyFrozen(user) {
  await pushNotification(user.id || user._id, { type:'freeze', icon:'🧊', title:'Аккаунт заморожен', body:'Обратитесь в поддержку', link:'/' });
  await sendTg(user.telegram_id || user.telegramId,
    `🧊 <b>Аккаунт временно заморожен</b>\n\n` +
    `Ваш аккаунт <b>@${user.username}</b> заморожен администратором.\n\n` +
    `Новые сделки и операции временно недоступны.\n` +
    `По вопросам обратитесь в поддержку.`
  );
}

// ── Разморозка аккаунта ───────────────────────────────────────────────────────
async function notifyUnfrozen(user) {
  await pushNotification(user.id || user._id, { type:'unfreeze', icon:'✅', title:'Аккаунт разморожен', body:'Все функции снова доступны!', link:'/' });
  await sendTg(user.telegram_id || user.telegramId,
    `✅ <b>Аккаунт разморожен</b>\n\n` +
    `Ваш аккаунт <b>@${user.username}</b> снова активен.\n\n` +
    `Все функции платформы доступны. Удачных сделок! 🚀`
  );
}

// ── Товар удалён администратором ──────────────────────────────────────────────
async function notifyProductDeleted(user, productTitle, reason) {
  await pushNotification(user.id || user._id, { type:'product_deleted', icon:'🗑', title:'Товар удалён', body:reason || productTitle, link:'/profile' });
  await sendTg(user.telegram_id || user.telegramId,
    `🗑 <b>Ваш товар удалён</b>\n\n` +
    `📦 Товар: <b>${productTitle}</b>\n` +
    (reason ? `Причина: ${reason}\n` : '') +
    `\nЕсли считаете удаление ошибочным — обратитесь в поддержку.`
  );
}

// ── Товар продвинут администратором ──────────────────────────────────────────
async function notifyProductPromoted(user, productTitle, hours) {
  await pushNotification(user.id || user._id, { type:'promoted', icon:'🚀', title:'Товар в топе!', body:`${productTitle} — ${hours}ч продвижения`, link:'/profile' });
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
  await pushNotification(user.id || user._id, { type:'review', icon:'⭐', title:`Новый отзыв ${stars}`, body:comment || `@${fromUsername} оценил вас на ${rating}/5`, link:'/profile' });
  await sendTg(user.telegram_id || user.telegramId,
    `${stars} <b>Новый отзыв!</b>\n\n` +
    `От: @${fromUsername}\n` +
    `Оценка: ${stars} (${rating}/5)\n` +
    (comment ? `Комментарий: "${comment}"` : '')
  );
}

// ── Новое личное сообщение ────────────────────────────────────────────────────
async function notifyMessage(user, fromName, dealTitle) {
  await pushNotification(user.id || user._id, { type:'message', icon:'💬', title:`Сообщение от @${fromName}`, body:dealTitle, link:'/deals' });
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
  await pushNotification(user.id || user._id, { type:'balance', icon, title:'Корректировка баланса', body:`${sign}$${parseFloat(amount).toFixed(2)} — ${reason || 'Действие администратора'}`, link:'/wallet' });
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
