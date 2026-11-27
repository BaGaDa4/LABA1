const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor({ group = 'ББМО-01-23' } = {}) {
    super();
    this.group = group;
    this._handlers = new Map();   // event -> [{ listener, priority, once, seq }]
    this._any = [];               // wildcard-слушатели
    this._seq = 0;                // порядок добавления
    this._metrics = { events: {}, errors: {}, lastCall: {}, total: 0, lastEventAt: null };
  }

  // ---- подписка ----
  on(event, listener, priority = 0) {
    return this._add(event, listener, priority, false);
  }

  once(event, listener, priority = 0) {
    return this._add(event, listener, priority, true);
  }

  addListener(event, listener, priority = 0) {
    return this.on(event, listener, priority);
  }

  onAny(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener должен быть функцией');
    this._any.push(listener);
    return this;
  }

  offAny(listener) {
    this._any = this._any.filter((fn) => fn !== listener);
    return this;
  }

  // ---- отписка ----
  off(event, listener) {
    const list = this._handlers.get(event);
    if (!list) return this;
    const entry = list.find((e) => e.listener === listener);
    if (entry) this._removeEntry(event, entry);
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  removeAllListeners(event) {
    if (event === undefined) {
      this._handlers.clear();
      this._any = [];
    } else {
      this._handlers.delete(event);
    }
    return this;
  }

  listenerCount(event) {
    return (this._handlers.get(event) || []).length;
  }

  // ---- вызов ----
  emit(event, ...args) {
    this._record(event);
    if (event !== 'error') {
      for (const fn of [...this._any]) this._safe(fn, event, [event, ...args]);
    }
    return this._dispatch(event, args);
  }

  // ---- метрики ----
  getMetrics() {
    const listeners = {};
    for (const [event, list] of this._handlers) {
      if (list.length) listeners[event] = list.length;
    }
    return {
      group: this.group,
      events: { ...this._metrics.events },
      errors: { ...this._metrics.errors },
      total: this._metrics.total,
      lastEventAt: this._metrics.lastEventAt,
      lastCall: { ...this._metrics.lastCall },
      listeners,
    };
  }

  // ---- внутренняя кухня ----
  _add(event, listener, priority, once) {
    if (typeof listener !== 'function') throw new TypeError('listener должен быть функцией');
    const list = this._handlers.get(event) || [];
    list.push({ listener, priority, once, seq: this._seq++ });
    // приоритет по убыванию, при равенстве — в порядке добавления
    list.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
    this._handlers.set(event, list);
    return this;
  }

  _removeEntry(event, entry) {
    const list = this._handlers.get(event);
    if (!list) return;
    const i = list.indexOf(entry);
    if (i !== -1) list.splice(i, 1);
    if (list.length === 0) this._handlers.delete(event);
  }

  _dispatch(event, args) {
    const list = this._handlers.get(event);
    if (!list || list.length === 0) return false;
    for (const entry of [...list]) {
      if (entry.once) this._removeEntry(event, entry);   // once-кэш: удаляем до вызова
      this._safe(entry.listener, event, args);
    }
    return true;
  }

  _safe(fn, event, args) {
    try {
      const result = fn(...args);
      if (result && typeof result.then === 'function') {
        result.catch((err) => this._handleError(event, err));   // async-слушатели
      }
    } catch (err) {
      this._handleError(event, err);
    }
  }

  _handleError(event, err) {
    this._metrics.errors[event] = (this._metrics.errors[event] || 0) + 1;
    if (event === 'error') {
      console.error(`[ERROR] [${this.group}] Сбой в обработчике error: ${err.message}`);
      return;
    }
    if (!this._dispatch('error', [err, event])) {
      console.error(`[ERROR] [${this.group}] Ошибка в слушателе "${event}": ${err.message}`);
    }
  }

  _record(event) {
    if (event === 'error') return;   // служебное событие в общий счётчик не входит
    const m = this._metrics;
    const now = new Date().toISOString();
    m.events[event] = (m.events[event] || 0) + 1;
    m.total++;
    m.lastCall[event] = now;
    m.lastEventAt = now;
  }
}

module.exports = EventBus;