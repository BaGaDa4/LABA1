const chalk = require('chalk');
const c = new chalk.Instance({ level: process.stdout.isTTY ? 1 : 0 });

module.exports = {
  success: (m) => console.error(c.green('✔ ' + m)),
  warn: (m) => console.error(c.yellow('⚠ ' + m)),
  error: (m) => console.error(c.red('✖ ' + m)),
  info: (m) => console.error(c.blue('ℹ ' + m)),
};