import { Chalk } from 'chalk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const chalk = require('chalk') as Chalk;

export const log = console.log;
export const cerr = chalk.bold.red;
export const cuy = chalk.underline.yellow;
export const cb = chalk.blue;
export const chb = chalk.hex('#c99176'); // hex brown
export const cg = chalk.green;
export const cgray = chalk.gray;

export function logEnv(variable: string, value: string) {
  log(`${cb(variable)}=${chb('"' + value + '"')}`);
}

export function logErr(message: string) {
  log(cerr('ERROR:'), message);
}
