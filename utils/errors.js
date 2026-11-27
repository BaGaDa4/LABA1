class CliError extends Error {
  constructor(message, { hint } = {}) {
    super(message);
    this.name = 'CliError';
    this.hint = hint;
  }
}
module.exports = { CliError };