import models = require('../../src/models/models');
import userAuth = require('../../src/services/user-auth');
import errors = require('../../src/errors/errors');
import bcrypt = require("bcrypt");
import r = require('rethinkdb');
import query = require('../../src/dbutils/query');

class Session {
  [key: string] : any;
}

class Request {
  session: Session
}
class Restify {
  req: Request
}

describe('UserAuth', () => {

  var good =  new Restify();
  good.req = new Request()
  good.req.session = new Session();
  good.req.session["userID"] = 1;

  var bad = new Restify();
  bad.req = new Request();
  bad.req.session = new Session();
  
  var goodUser: models.User;
  var badUser: models.User;

  var password = "1234";
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);

  goodUser = {
        id: '123456789',
        firstName: 'Peter',
        lastName: 'Higgs',
        userName: 'pHiggs',
        email: 'higgs@lhc.com',
        isAccountActivated: false,
        passwordHash: hash,
        salt: salt
  };

  badUser = {
        id: null,
        firstName: 'Peter',
        lastName: 'Higgs',
        userName: 'pHiggs',
        email: 'thisEmailIsNotInTheDB@lhc.com',
        isAccountActivated: false,
        passwordHash: '12345',
        salt: 'andPepper'
  };

  var testFalse = (result) => {expect(result).toBe(false);}
  var testTrue = (result) => {expect(result).toBe(true);}

  function checkAuth(req){
    return userAuth.checkAuth(req);
  }

  function revokeSessions(req){
    return userAuth.revokeSessions(req)
  }

  function createUserSession(req, user){
    return userAuth.userSession(req,user);
  }

  function authUser(req, em, pass){
      return userAuth.authenticateUser(req, em, pass);
  }

  it('should verify a valid user session', (done) => {
      checkAuth(good.req)
      .then(testTrue)
      .error(fail)
      .finally(done);
  });

  it('should not verify an invalid user session', (done) => {
      checkAuth(bad.req)
      .then(testFalse)
      .error(fail)
      .finally(done);;
  });

  it('should create a user session when given a valid user object', (done) => {
      createUserSession(bad.req, goodUser)
        .then(testTrue)
        .error(fail)
        .finally(done);
  });

  it('should authenticate a valid user login', (done) => {

      query.run(
          r.db('froyo').table('users').insert(goodUser)
      )().then(() => {
        authUser(bad.req, goodUser.email, password)
          .then(testTrue)
          .error(fail)
          .finally(done);
      });

  });

  it('should reject an invalid user login', (done) => {
    authUser(bad.req, badUser.email, password)
      .then(testFalse)
      .error(fail)
      .finally(done);
  });

  it('should revoke all of the users sessions', (done) => {
    query.run(
      r.db('froyo').tableCreate('session')
    )().then(() =>{
      revokeSessions(good.req)
        .then(testTrue)
        .error(fail)
        .finally(done);
    });

  });

  it('should fail to create a user session when required fields are not defined in the user', (done) => {
      createUserSession(bad.req, badUser)
      .then(fail)
      .catch(errors.InvalidUserObject, done)
  });

  it('should fail to create a user session when the user is undefined', (done) => {
      createUserSession(bad.req, null)
        .then(fail)
        .catch(errors.UndefinedUserObject, done)
  });

});