/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
import Promise = require('bluebird');
import v = require('./validation');

module Validation {
  export class EmailValidator implements v.Validator {
    isValid(s: string) {
      return new Promise<boolean>((resolve, reject) => {
        if (s != '') {
          resolve(true);
        } else {
          reject(new Error("email cannot be empty"));
        }
      });
    }
  }
}

export = Validation;