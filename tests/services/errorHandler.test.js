const { handleFatal } = require('../../utils/errorHandler');
const { CliError } = require('../../utils/errors');

test('handleFatal пишет в stderr и вызывает process.exit(1)', () => {
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  handleFatal(new CliError('boom', { hint: 'подсказка' }));
  expect(exit).toHaveBeenCalledWith(1);
  expect(err).toHaveBeenCalled();
  exit.mockRestore();
  err.mockRestore();
});