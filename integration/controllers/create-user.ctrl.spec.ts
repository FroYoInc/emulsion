
import Restify = require('restify');
import Promise = require('bluebird');
import utils = require('../utils');
import CreateUserController = require('../../src/controllers/create-user.ctrl');
import userService = require('../../src/services/user-service');

function createUser(req:Restify.Request, res:Restify.Response):Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function next(err) {
      if (err) {
        reject(err)
      } else {
        resolve(null)
      }
    };
    CreateUserController.createUser(req, res, next);
  });
}

beforeAll(() => {
  userService.setDomainWhiteList([])
})

describe('CreateUserController', () => {
  it('should create a user', (done) => {

    var userName = utils.rs();
    var email = utils.em();

    var inputJSON = {
      'firstName': 'John',
      'lastName': 'Doe',
      'userName': userName,
      'email': email,
      'password': 'somePassword'
    }

    function test0(status, outputJson) {
      expect(status).toBe(201);
      expect(outputJson.firstName).toBe('John');
      expect(outputJson.lastName).toBe('Doe');
      expect(outputJson.userName).toBe(userName);
      expect(outputJson.email).toBe(email);
      expect(outputJson.href).toBeDefined();
      var hasHref = (outputJson.href.indexOf('/users/') > -1);
      expect(hasHref).toEqual(true);
    }


    var res = <Restify.Response> {send: test0};
    var req = <Restify.Request> {};
    req.body = inputJSON;

    createUser(req, res)
      .then(() => {
        res.send = () => {}
        return createUser(req, res);
      })
      .catch(Restify.ConflictError, (err) => {
        expect(err.statusCode).toBe(409);
        var msg = 'UserExistException: user already exist';
        expect(err.message).toBe(msg);
        expect(err.body.message).toBe(msg);
        expect(err.body.code).toBe('ConflictError');

        inputJSON.userName = utils.rs()
        req.body = inputJSON;

        return createUser(req, res)
      })
      .catch(Restify.ConflictError, (err) => {
        expect(err.statusCode).toBe(409);
        var msg = 'EmailExistException: email already exist';
        expect(err.message).toBe(msg);
        expect(err.body.message).toBe(msg);
        expect(err.body.code).toBe('ConflictError');
      })
      .catch(fail)
      .error(fail)
      .finally(done);
  });
});
