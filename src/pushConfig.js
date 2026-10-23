// Публичный ключ Web Push (VAPID). Не секрет, его можно хранить в коде.
// Как получить: на компьютере выполните `npx web-push generate-vapid-keys`; публичный ключ вставьте сюда,
// приватный сохраните только в секретах функции notify-partner (Supabase), нигде больше его не публикуйте.
// Пока строка пустая, переключатель push-уведомлений в приложении скрыт.
export const VAPID_PUBLIC_KEY = "BKwcn4cwDnfdy1A1ZymA3bLvy4JiQeJEBlfWC20o_2UEUz8spBSMZaKypBujAUmRFGu-tfRnaMnhzruf6R1pH-k";
