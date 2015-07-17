// import models = require('../../src/models/models');
// import errors = require('../../src/errors/errors');
// import r = require('rethinkdb');
// import utils = require('../utils');
// import carpoolCtrl = require('../../src/controllers/carpools');

// class Session {
//   [key: string] : any;
// }

// class Request {
//   session: Session;
//   params: Params;
// }


// class Params{
//   carpoolID: any;
// }

// class Response {
//   session: Session;
// }

// class Restify {
//   req: Request;
//   res: Response;
// }

// describe('CarpoolControllers', () => {

//   var good =  new Restify();
//   good.req = new Request();
//   good.req.session = new Session();
//   good.req.session["userID"] = 1;
//   good.req.session["firstName"] = "Peter";
//   good.req.session["lastName"] = "Higgs";
//   good.req.session["userName"] = "pHiggs";
//   good.req.session["email"] = utils.validEmail("pHiggs");

//   good.req.params  = new Params();
//   good.req.params.carpoolID  = "someCarpoolID";



//   var notLoggedIn = new Restify();
//   notLoggedIn.req = new Request();
//   notLoggedIn.req.session = new Session();


//   notLoggedIn.req.params  = new Params();
//   notLoggedIn.req.params.carpoolID  = "someCarpoolID";


//   var bad = new Restify();
//   bad.req = new Request();
//   bad.req.session = new Session();
//   bad.req.session["userID"] = 1;
//   bad.req.session["firstName"] = "Peter";
//   bad.req.session["lastName"] = "Higgs";
//   bad.req.session["userName"] = "pHiggs";
//   bad.req.session["email"] = utils.validEmail("pHiggs");

//   bad.req.params  = new Params();

//   var test201 = (result) => {expect(result).toBe(201);}
//   var test400 = (result) => {expect(result).toBe(400);}
//   var test401 = (result) => {expect(result).toBe(401);}
//   var test409 = (result) => {expect(result).toBe(409);}
//   var test500 = (result) => {expect(result).toBe(500);}

//   function requestToJoin(req){
//     return carpoolCtrl.joinRequest(req);
//   }


//   it('it should create a request', (done) => {
//       requestToJoin(good.req)
//       .then(test201)
//       .error(fail)
//       .finally(done);
//   });

//   it('it should fail when parameters are missing.', (done) => {
//       requestToJoin(bad.req)
//       .then(test400)
//       .error(fail)
//       .finally(done);
//   });

//   it('it should fail when the user is not logged in', (done) => {
//       requestToJoin(notLoggedIn.req)
//       .then(test401)

import restify = require('restify');
import Promise = require('bluebird');
import utils = require('../utils');
import campusSvc = require('../../src/services/campus.svc');
import userSvc = require('../../src/services/user-service');
import models = require('../../src/models/models');
import userService = require('../../src/services/user-service');
import CarpoolSvc = require('../../src/services/carpool.svc');
import CarpoolCtrl = require('../../src/controllers/carpool.ctrl');
import UserCtrl = require('../../src/controllers/create-user.ctrl');


function createCarpool(req:restify.Request, res:restify.Response)
:Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function next(err) {
      if (err) {
        reject(err)
      } else {
        resolve(null)
      }
    };
    CarpoolCtrl.createCarpool(req, res, next)
  });
}

function getCarpool(req:restify.Request, res:restify.Response)
:Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function next(err) {
      if (err) {
        reject(err)
      } else {
        resolve(null)
      }
    };
    CarpoolCtrl.getCarpool(req, res, next)
  });
}

function getCarpools(req:restify.Request, res:restify.Response)
:Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function next(err) {
      if (err) {
        reject(err)
      } else {
        resolve(null)
      }
    };
    CarpoolCtrl.getCarpools(req, res, next)
  });
}

describe('Carpool controller', () => {

  var campus:models.Campus;
  var owner:models.User;

  beforeAll((done) => {
    // Create a user and a campus
    Promise.resolve()
      .then(() => {
        var p1 = campusSvc.createCampus('PSU', {
          address: '1825 SW Broadway, Portland, OR 97201',
          geoCode: {lat: 45.511490, long: -122.683357}
        });
        var p2 = utils.getSomeUser();
        return [p1, p2]
      })
      .spread((_campus:models.Campus, _user:models.User) => {
        campus = _campus;
        owner = _user;
      })
      .catch(fail)
      .error(fail)
      .finally(done);
  })

  it('should create a carpool', (done) => {
    var inputJSON = {
      'name': 'Corpool',
      'campus': 'PSU',
      'description': 'first carpool',
      'owner': owner.userName
    };

    function test (status, outputJSON) {
      expect(status).toBe(201);
      expect(outputJSON.name).toBe(inputJSON.name);
      expect(outputJSON.description).toBe(inputJSON.description);
      expect(outputJSON.owner).toEqual(UserCtrl.toOutputJSON(owner));
      /*TODO: expect(outputJSON.campus).toBe(CampusCtrl.toOutputJSON(campus));*/
      expect(outputJSON.participants).toEqual([UserCtrl.toOutputJSON(owner)]);
      var hasHref = (outputJSON.href.indexOf('/carpools/') > -1);
      expect(hasHref).toEqual(true);
    }

    var req = <restify.Request> {};
    var res = <restify.Response> {send: test};
    req.body = inputJSON;

    createCarpool(req, res)
      // Test carpool cannot be created with an invalid owner
      .then(() => {
        res.send = () => {};
        req.body.owner = 'non-existant-username';
        return createCarpool(req, res);
      })
      .catch(restify.NotAcceptableError, (err) => {
        expect(err.message).toBe('CarpoolOwnerNotFoundException:' +
         ' carpool owner user not found');
        return utils._catch();
      })
      .then(utils.checkCaught)
      // Test carpool cannot be created with an invalid campus
      .then(() => {
        req.body.owner = owner.userName;
        req.body.campus = 'non-existant-campus';
        return createCarpool(req, res);
      })
      .catch(restify.NotAcceptableError, (err) => {
        expect(err.message).toBe('CampusNotFoundException: ' +
        'No campus found with the specified name or ID.');
        return utils._catch();
      })
      .then(utils.checkCaught)
      // Test carpool cannot be created if carpool already exist
      .then(() => {
        req.body.campus = campus.name;
        return createCarpool(req, res);
      })
      .catch(restify.ConflictError, (err) => {
        expect(err.message).toBe('CarpoolExistException:' +
        ' carpool already exist');
        return utils._catch();
      })
      .then(utils.checkCaught)
      .catch(fail)
      .error(fail)
      .finally(done);

  });

  it('should retrieve carpool by id', (done) => {
    var carpool:models.Carpool;
    function test(status, outputJSON) {
      expect(status).toBe(200);
      expect(outputJSON).toEqual(CarpoolCtrl.toOutputJSON(carpool));
    }
    var req = <restify.Request> {params: {}};
    var res = <restify.Response> {send: test};

    CarpoolSvc.createCarpool('corpool2', 'PSU', '_', owner.userName)
      .then((_carpool) => {
        carpool = _carpool;
        req.params.carpoolid = _carpool.id;
      })
      // Test a carpool can be retrived by its id
      .then(() => {
        return getCarpool(req, res);
      })
      // Test a 404 error is returned when getting invalid carpool
      .then(() => {
        req.params.carpoolid = 'non-existant-carpool-id';
        res.send = () => {};
        return getCarpool(req, res);
      })
      .catch(restify.NotFoundError, (err) => {
        expect(err.message).toBe('CarpoolNotFoundException:' +
        ' carpool not found');
        return utils._catch();
      })
      .then(utils.checkCaught)
      .catch(fail)

  });


  it('it should fail when the same request already exists', (done) => {
      requestToJoin(good.req)
      .then(test409)
      .error(fail)
      .finally(done);
  });

});

  it('should retrieve a list of carpools', (done) => {
    var carpoolList:models.Carpool[];

    function test(status, outputJSON) {
      expect(status).toBe(200);
      expect(outputJSON.length > 0).toEqual(true);
      expect(carpoolList.length).toEqual(outputJSON.length);
    }
    var req = <restify.Request> {params: {}};
    var res = <restify.Response> {send: test};

    CarpoolSvc.getCarpools(10)
      .then((_carpoolList) => {
        carpoolList = _carpoolList;
      })
      .then(() => {return getCarpools(req, res)})
      .catch(fail)
      .error(fail)
      .finally(done);
  });
})

