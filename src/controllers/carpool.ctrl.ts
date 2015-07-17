import restify = require('restify')
import carpoolService = require('../services/carpool.svc')
import userCtrl = require('./create-user.ctrl');
import models = require('../models/models');
import errors = require('../errors/errors');

module CarpoolController {
  export interface OutputJSON {
    name: string;
    description: string;
    owner: userCtrl.OutputJSON;
    campus: any; // This should be of type CampusController.OutputJSON
    participants: Array<userCtrl.OutputJSON>;
    href: string;
  }

  export function toOutputJSON(carpool:models.Carpool):OutputJSON {
    return {
      'name': carpool.name,
      'description': carpool.description,
      'owner': userCtrl.toOutputJSON(carpool.owner),
      'campus': carpool.campus, // TODO: shoudl be campusCtrl.toOutputJSON
      'participants': carpool.participants.map(userCtrl.toOutputJSON),
      'href': '/carpools/' + carpool.id
    };
  }
  export function createCarpool(
    req:restify.Request, res:restify.Response, next:restify.Next) {
      var carpoolName:string = req.body.name;
      var campusName:string = req.body.campus;
      var description:string = req.body.description;
      var owner:string = req.body.owner;

      carpoolService.createCarpool(
        carpoolName, campusName, description, owner)
        .then((carpool) => {
          res.send(201, toOutputJSON(carpool));
        })
        .catch(errors.CarpoolOwnerNotFoundException,
          errors.CampusNotFoundException, (err) => {
          next(new restify.NotAcceptableError(err.message));
        })
        .catch(errors.CarpoolExistException, (err) => {
          next(new restify.ConflictError(err.message));
        })
        .catch((err) => {
          next(new restify.InternalServerError(err.message));
        })
        .error((err) => {
          next(new restify.InternalServerError(err.message));
        })
        .then(next);
  }

  export function getCarpool(
    req:restify.Request, res:restify.Response, next:restify.Next) {
    var carpoolid = req.params.carpoolid;

    carpoolService.getCarpoolByID(carpoolid)
      .then((carpool) => {
        res.send(200, toOutputJSON(carpool));
      })
      .catch(errors.CarpoolNotFoundException, (err) => {
        next(new restify.NotFoundError(err.message));
      })
      .catch((err) => {
        next(new restify.InternalServerError(err.message));
      })
      .error((err) => {
        next(new restify.InternalServerError(err.message));
      })
      .then(next);
  }

  export function getCarpools(
    req:restify.Request, res:restify.Response, next:restify.Next) {

    function getCarpoolList() {
      return carpoolService.getCarpools(10);
    }

    getCarpoolList()
      .then((_carpools) => {
        res.send(200, _carpools);
        next();
      })
      .catch((err) => {
        next(new restify.InternalServerError(err.message))
      });
  }
}

export = CarpoolController;