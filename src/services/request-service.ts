import Promise = require('bluebird');
import r = require('rethinkdb');
import uuid = require('uuid');
import EmailService = require('./email-service');
import nodemailer = require('nodemailer');
import q = require('../dbutils/query');
import models = require('../models/models');
import errors = require('../errors/errors');
import config = require('../config');


module RequestService {
    var db = "froyo";
    var table = "requests";

    export function createRequest(userID:string, carpoolID:string) : Promise<boolean> {

        var createRequestIfItDoesNotExist =
        r.db(db).table(table).insert({id: userID + carpoolID, userID: userID,carpoolID: carpoolID},{conflict:"error"});

        return q.run(
          createRequestIfItDoesNotExist, 'createRequest')()
          .then((result) => {
            if (result.errors > 0) {
                throw new errors.CarpoolRequestConflictException();
            }
            else {
                return (result.inserted === 1);
            }
          });

    }

    export function removeRequest(userID:string, carpoolID:string) : Promise<boolean> {

        var removeRequestQuery = r.db(db).table(table).get(userID + carpoolID).delete();

        return q.run(
          removeRequestQuery, 'removeRequest')()
          .then((result) => {
            if (result.deleted === 0) {
                throw new errors.CarpoolRequestNotFoundException();
            }
            else {
                return (result.deleted === 1);

            }
          });

    }

    export function getRequestByUserID(userID:string){

        var getByUserID = r.db(db).table(table).filter({userID: userID}).coerceTo('array');

        return q.run(getByUserID, 'getRequestByUserID')();
    }

    export function getRequestByCarpoolID(carpoolID:string){

        var getByCarpoolID = r.db(db).table(table).filter({carpoolID: carpoolID}).coerceTo('array');

        return q.run(getByCarpoolID, 'getRequestByCarpoolID')();
    }
}

export = RequestService;
