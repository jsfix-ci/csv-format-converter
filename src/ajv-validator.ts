import * as Ajv from 'ajv';
import * as userSchema from './schemas/config-file-schema.json';
import * as defsSchema from './schemas/csv-format-schema.json';

/**
 * Function that validates a Json through param with JsonSchema and returns this Json if it's valid.
 * If it's not valid, throws an exception.
 * This function modifies data. If there is a key in user's Json file that is not declared this function
 * declares it as default value specified in csv-format-schema.json
 * @param {object} data - Json that must be validated.
 */
export function checkConfigFile(data: object): void {
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  const validate = ajv.addSchema(defsSchema).compile(userSchema);
  // This call modifies data
  const valid = validate(data);
  if (!valid && validate.errors) {
    let messages: string = '';
    for (const message of validate.errors) {
      messages += `\n${message.dataPath}: ${message.message}`;
    }
    throw new Error(messages);
  }
}
