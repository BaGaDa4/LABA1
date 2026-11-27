const { GROUP, getNetworkInfo, getUserInfo } = require('./collectors');

const net = getNetworkInfo();

console.log('=== Сетевые интерфейсы ===');
for (const i of net.interfaces) {
  console.log(`Интерфейс: ${i.name}`);
  for (const a of i.addresses) {
    console.log(`  ${a.family}:\t${a.address}`);
  }
  console.log(`  MAC:\t${i.addresses[0].mac}`);
  console.log(`  Внутренний:\t${i.addresses[0].internal ? 'да' : 'нет'}`);
  console.log('');
}
console.log(`Всего интерфейсов:\t${net.interfaces.length}`);
console.log(`Основной интерфейс:\t${net.main ? `${net.main.name} (${net.main.address})` : 'не найден'}`);

const u = getUserInfo();
console.log('');
console.log('=== Информация о пользователе ===');
console.log(`Имя пользователя:\t${u.username}`);
console.log(`UID:\t\t\t${u.isWin ? 'недоступно в Windows' : u.uid}`);
console.log(`GID:\t\t\t${u.isWin ? 'недоступно в Windows' : u.gid}`);
console.log(`Домашняя директория:\t${u.homedir}`);
console.log(`Оболочка по умолчанию:\t${u.shell || 'н/д'}`);

console.log('');
console.log(`Группа:\t\t\t${GROUP}`);
console.log(`Проверка root:\t\t${u.isRoot ? 'ДА (запуск от root не рекомендуется)' : 'нет'}`);