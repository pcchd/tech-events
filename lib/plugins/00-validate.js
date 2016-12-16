const debug = require('debug')('app:validator');
const Ajv = require('ajv');
const schema = require('../../data/_event-schema.json');

const validate = new Ajv().compile(schema);

module.exports = (events$) => {
  const validatedEvents$ = events$
        .do(event => debug('Validating event: %s', event.name))
        .map((event) => {
          const valid = validate(event);

          if (valid) {
            return event;
          }

          throw new Error(`ValidtionFailure: ${JSON.stringify(validate.errors, null, '  ')}`);
        });

  return validatedEvents$;
};
