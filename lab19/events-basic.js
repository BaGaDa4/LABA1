const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const emitter = new EventEmitter();

emitter.on('greet', (name) => console.log(`[greet] Привет, ${name}!`));
emitter.on('info', () => console.log(`[info] Группа: ${GROUP}`));
emitter.on('bye', () => console.log('[bye] До свидания!'));

console.log('=== Демонстрация EventEmitter ===\n');

emitter.emit('greet', 'Иван');
emitter.emit('info');
emitter.emit('bye');

console.log('');
const unknownResult = emitter.emit('unknown');
console.log(`Событие "unknown" без слушателей: ${unknownResult}`);

const greetResult = emitter.emit('greet', 'Мария');
console.log(`Событие "greet" со слушателями: ${greetResult}`);