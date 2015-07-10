
import Promise = require('bluebird');
import r = require('rethinkdb');
import uuid = require('uuid');
import assert = require('assert');
import q = require('../dbutils/query');
import models = require('../models/models');
import errors = require('../errors/errors');
import userSvc = require('./user-service');
import v = require('../validation/carpoolname.validator');
import userService = require('../../src/services/user-service');

var db = 'froyo';
var table = 'carpools';
var carpoolNameIndex = 'name';

module CarpoolService {
  var carpoolNameValidator = new v.CarpoolNameValidator();
  export function createCarpool(name: string,
    campus: models.Campus, description: string, owner: string)
    :Promise<models.Carpool> {

    var carpool:models.Carpool = <models.Carpool>{};

    function buildCarpoolModel() {
      carpool.name = name;
      carpool.description = description;
      carpool.campus = campus;
      return userSvc.getUserByUserName(owner)
        .then((user) => {
          carpool.owner = user.id;
          carpool.participants = [user.id];
        });
    }

    function setCarpoolID(result) {
      assert.equal(result.generated_keys.length, 1,
        "expected only 1 object to be created");
      carpool.id = result.generated_keys[0];
      return carpool;
    }

    function insertCarpoolModel() {
      var ownerExistQuery = userSvc.userExistQuery(owner);
      var createCarpoolQuery = r.db(db)
        .table(table)
        .insert({
          'name': carpool.name,
          'owner': carpool.owner,
          'participants': [carpool.owner],
          'campus': carpool.campus,
          'description': carpool.description
        });
      var createCarpoolIfOwnerExistQuery = r.branch(
        ownerExistQuery, createCarpoolQuery, r.expr('user does not exist'));

      return q.run(createCarpoolIfOwnerExistQuery)()
        .then((result) => {
          if (result == 'user does not exist') {
            throw new errors.UserNotFoundException();
          } else {
            setCarpoolID(result);
            return carpool;
          }
        });
    }

    return carpoolNameValidator.isValid(name)
      .then(buildCarpoolModel)
      .then(insertCarpoolModel);
  }

  export function doesCarpoolExist(carpoolName: string): Promise<boolean> {
    var carpoolExistQuery = r.db(db)
      .table(table)
      .getAll(carpoolName, {index: carpoolNameIndex})
      .isEmpty().not();

    return q.run(carpoolExistQuery)()
      .then((result) => {
        return result === true
      });
  }

  // This should take an id as an argument and return the carpool it is associated with.
  export function getCarpoolByID(carpoolID: string) :  Promise<models.Carpool> {
    var query = r.db(db).table(table).filter({id:carpoolID}).coerceTo('array');
    return q.run(query)()
      .then((_carpool) => {
        assert.equal(_carpool.length, 1,
          "Exactly one carpool should have been found");
          var carpool:models.Carpool = _carpool[0];
          return carpool;
      })
  }

  export function getCarpools(limit: number) :  Promise<models.Carpool[]> {
    var query = r.db(db).table(table).limit(limit).coerceTo('array');
    return q.run(query)()
      .then((_carpools) => {
        return _carpools;
      });
  }

  // Gets all of the emails for the carpool with the provided id, minues the email provided
  // in the notThisUser string
  export function getUserEmails(carpoolID: string, notThisUser?:string) :  Promise<string> {
    return new Promise<string>((resolve, reject) => {
      getCarpoolByID(carpoolID)
        .then( (_carpool) => {
          var emails:Array<string> = [];

          function appendToArray(email, max){
            var length = (notThisUser ? max - 1 : max);
            if(email != notThisUser){
              emails.push(email);
            }
            if(emails.length == length){
              resolve(emails.join(", "));
            }
          }
          
          for (var i = 0; i < _carpool.participants.length; ++i){

            userSvc.getUserById(_carpool.participants[i])
              .then((user) => {
                appendToArray(user.email,_carpool.participants.length);
              })
              .catch(errors.UserNotFoundException, (err) => {});

          }
        });
    });

  }

  export function getOwnerEmail(carpoolID: string, notThisUser?:string) :  Promise<string> {
    return new Promise<string>((resolve, reject) => {
      getCarpoolByID(carpoolID)
        .then( (_carpool) => {
          var emails:Array<string> = [];

          userSvc.getUserById(_carpool.owner)
            .then((user) => {
              resolve(user.email);
            })
            .catch(errors.UserNotFoundException, (err) => {throw err;});

        });
    });
  }

  export function addUserToCarpool(carpoolID:string, owner:string, userToAdd:string) : Promise<models.Carpool> {
    return new Promise<models.Carpool>((resolve, reject) => {
      var query = r.db(db).table(table).get(carpoolID).update({
                    participants: r.row("participants").append(userToAdd)
                  });

      getCarpoolByID(carpoolID)
        .then( (_carpool) => {
            if(_carpool.owner == owner){
              q.run(query)()
                .then( (result) => {
                  getCarpoolByID(carpoolID)
                    .then((carpool) => {
                      resolve(carpool)
                    })
                })
            }
            else{
              throw new errors.NotCarpoolOwner("Must be carpool owner to add a user");
            }
        }).catch(Error, (err) => {reject(err);})

    });

  }

}

export = CarpoolService;