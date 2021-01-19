#!/usr/bin/env node
/* istanbul ignore file */
import { run } from './main';

// As run is async, we can use .catch to handling errors and .then if code is succeed.
run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
