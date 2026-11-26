const { parseConfig, outputPath } = require('../../services/buildService');
const { validateName, validateType } = require('../../services/projectService');
const { CliError } = require('../../utils/errors');

describe('buildService', () => {
  test('parseConfig разбирает корректный JSON', () => {
    expect(parseConfig('{"name":"app","entry":"src/index.js"}').name).toBe('app');
  });
  test('parseConfig бросает CliError на битом JSON', () => {
    expect(() => parseConfig('{')).toThrow(CliError);
  });
  test('parseConfig требует name и entry', () => {
    expect(() => parseConfig('{"name":"app"}')).toThrow(/entry/);
  });
  test('outputPath строит путь dist/<name>.js', () => {
    expect(outputPath({ name: 'app' })).toMatch(/dist[\\/]app\.js$/);
  });
});

describe('projectService', () => {
  test('validateName принимает нормальное имя', () => {
    expect(() => validateName('my-app_1')).not.toThrow();
  });
  test('validateName отклоняет пробелы и спецсимволы', () => {
    expect(() => validateName('my app!')).toThrow(CliError);
  });
  test('validateType отклоняет неизвестный тип', () => {
    expect(() => validateType('foo')).toThrow(CliError);
  });
});