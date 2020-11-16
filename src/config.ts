import { env } from '@trans/config';

/**
 * Module that works with arguments given to the program throgh console.
 */

// Loads .env param.
env.load();

/**
 * Interface that takes available options
 */
export interface Options {
  configFile: string;
}

/**
 * Client Arguments
 */
const cliArguments = [
  {
    name: 'config-file',
    type: String,
    description: 'Json file path',
    defaultValue: 'Valor por defecto',
  },
];

/**
 * Available options
 */
const options = env.getArguments(cliArguments, process.argv, {
  handleHelp: true,
  handleUnknown: true,
});

/**
 * Function that add command from user.
 * @return {Options} - Available options
 */
export function setup(): Options {
  const configFile: string = options['config-file'];

  const scriptParameters: Options = {
    configFile,
  };

  return scriptParameters;

}
