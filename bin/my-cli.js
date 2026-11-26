#!/usr/bin/env node
'use strict';
const { Command } = require('commander');
const pkg = require('../package.json');
const { handleFatal } = require('../utils/errorHandler');

process.on('uncaughtException', handleFatal);
process.on('unhandledRejection', handleFatal);

const program = new Command();
program
  .name('my-cli')
  .description('CLI-приложение ЛР №17 (ББМО-01-23)')
  .version(pkg.version)
  .showHelpAfterError();

require('../commands/init')(program);
require('../commands/build')(program);
require('../commands/test')(program);
require('../commands/deploy')(program);

program.parseAsync(process.argv).catch(handleFatal);