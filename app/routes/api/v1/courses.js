const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');
const Promise = require('bluebird');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router();

// Utility
const isString = (string) => typeof string === 'string' || string instanceof String;
const NOT_FOUND = new throwjs.notFound();

// Process params
router.param('year', (req, res, next) => {
  const year = req.params.year;
  if (year === '_') req.year = 2016; // TODO: get current year
  else if (Number(year)) req.year = year;
  else return next(new throwjs.notAcceptable(`invalid year, got '${year}'`));
  next();
});

router.param('period', (req, res, next) => {
  const period = req.params.period;
  if (period === '_') req.period = 1; // TODO: get current period
  else if (Number(period)) req.period = period;
  else return next(new throwjs.notAcceptable(`invalid period, got '${period}'`));
  next();
});

function getCourses(req, res, next) {
  Course.findInitials(req.params.initials).then(courses => {
    if (courses.length > 0) {
      req.courses = courses;
      next();
    } else {
      next(NOT_FOUND);
    }
    return null;
  }).catch(next);
}

/**
 * @apiDefine NotFoundError
 *
 * @apiError CourseNotFound The requested course was not found.
 * @apiErrorExample {json} Error-Response:
 *   HTTP/1.1 404 Not Found
 *   {
 *     name: "notFound",
 *     message: "The requested resource couldn't be found",
 *     statusCode: 404,
 *     errorCode: 404
 *   }
 */

/**
 * @api {get} /courses Search sections
 * @apiName SearchSections
 * @apiGroup Section
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses?q=IIC # simple search
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses?name=Programación&initials=IIC&section=1 # strict search
 */
router.route('/')
  .get((req, res, next) => {
    const query = req.query;

    const limit = Math.min(Number(query.limit) || 50, 50);
    if (limit < 0) {
      return next(new throwjs.unprocessableEntity('invalid limit query param'));
    }

    const valid = isString(query.name);
    const search = (valid) ? {
      $text : { $search : query.name/*, $language: 'es'*/ },
    } : {};
    const score = (valid) ? {
      score : { $meta: 'textScore' }
    } : {};

    const where = {};
    if (Number(query.year)) where.year = query.year;
    if (Number(query.period)) where.period = query.period;
    if (Number(query.section)) where.section = query.section;
    if (Number(query.NRC)) where.NRC = query.NRC;
    if (isString(query.initials)) where.initials = new RegExp(query.initials, 'i');
    if (isString(query.school)) where.school = query.school;
    if (isString(query.campus)) where['schedule.location.campus'] = query.campus;
    if (query.places instanceof Array) where['schedule.location.place'] = { $in: query.places };
    if (query.teachers instanceof Array) where['teachers.name'] = { $in: query.teachers };

    Course.find(search, score).where(where).sort(score).limit(limit).lean()
      .then(sections => res.sendSections(sections))
      .catch(next);
  });

/**
 * @api {get} /courses/:initials Request courses with initials of every period
 * @apiName GetCourses
 * @apiGroup Course
 *
 * @apiParam {String} initials Course initials
 * @apiParamExample {json} Request-Example:
 *   {
 *     "initials": "MAT1630"
 *   }
 *
 * @apiSuccess {[Course](http://www.google.cl)[]} result Collection of [Course](http://www.google.cl) objects
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * [
 *     {
 *         "year": 2016,
 *         "period": 1,
 *         "initials": "MAT1630",
 *         "name": "Cálculo III",
 *         "credits": 10,
 *         "school": "Matemática",
 *         "information": "El curso proporciona al alumno los conocimientos básicos de cálculo diferencial de funciones escalares y vectoriales de varias variables, de integrales múltiples sobre regiones más generales, y los conceptos y métodos de integrales de línea y superficie.",
 *         "requisites": {
 *             "relation": null,
 *             "equivalences": [
 *                 "MAT1523",
 *                 "MAT230E",
 *                 "MLM1130"
 *             ],
 *             "restrictions": [],
 *             "requirements": [
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "MAT1202",
 *                         "MAT1512"
 *                     ]
 *                 },
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "MAT1202",
 *                         "MAT1620"
 *                     ]
 *                 },
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "MAT1203",
 *                         "MAT1512"
 *                     ]
 *                 },
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "MAT1203",
 *                         "MAT1620"
 *                     ]
 *                 }
 *             ]
 *         },
 *         "specialApproval": false,
 *         "english": false,
 *         "droppable": true,
 *         "links": {
 *             "self": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT1630"
 *             },
 *             "sections": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT1630/sections"
 *             },
 *             "requirements": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT1630/requirements"
 *             },
 *             "equivalences": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT1630/equivalences"
 *             }
 *         }
 *     }
 * ]
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/MAT1630
 */
router.route('/:initials')
  .get(getCourses, (req, res, next) => res.sendCourses(req.courses));

/**
 * @api {get} /courses/:initials/equivalences Request course equivalences
 * @apiName GetCourseEquivalences
 * @apiGroup Course
 *
 * @apiParam {String} initials Course initials
 * @apiParam {Number} [year] Optionally filter by year and period, `period` must be set to work.
 * @apiParam {Number=1,2,3} [period] Optionally filter by period, where `1`: *First semester*, `2`: *Second semester* and `3`: *TAV*. `year` must be set too
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "initials": "MAT1630"
 *   }
 *
 * @apiSuccess {[Course](http://www.google.cl)[]} result Collection of [Course](http://www.google.cl) objects
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * [
 *     {
 *         "year": 2016,
 *         "period": 1,
 *         "initials": "MAT230E",
 *         "name": "Calculo III",
 *         "credits": 10,
 *         "school": "Matemática",
 *         "information": "Repaso de vectores. Curvas en R2 y R3. Límites y continuidad. Derivación parcial. Aplicaciones de derivadas. Ecuaciones diferenciales.  * Ecuaciones en diferencias.",
 *         "requisites": {
 *             "relation": null,
 *             "equivalences": [
 *                 "MAT1516",
 *                 "MAT1523",
 *                 "MAT1630"
 *             ],
 *             "restrictions": [],
 *             "requirements": [
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "MAT220E"
 *                     ]
 *                 }
 *             ]
 *         },
 *         "specialApproval": false,
 *         "english": false,
 *         "droppable": true,
 *         "links": {
 *             "self": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT230E"
 *             },
 *             "sections": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT230E/sections"
 *             },
 *             "requirements": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT230E/requirements"
 *             },
 *             "equivalences": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/MAT230E/equivalences"
 *             }
 *         }
 *     }
 * ]
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/MAT1630/equivalences?year=2016&period=1
 */
router.route('/:initials/equivalences')
  .get(getCourses, (req, res, next) => {
    const options = { // optionals
      year: req.query.year,
      period: req.query.period,
    };
    const equivalences = req.courses[0].requisites.equivalences;

    Course.findInitials(equivalences, options)
      .then(courses => res.sendCourses(courses)) // TODO: equivalences not found as courses?
      .catch(next);
  });

// Populate course requirements, not documented yet
router.route('/:initials/requirements')
  .get(getCourses, (req, res, next) => {
    const options = { // optionals
      year: req.query.year,
      period: req.query.period,
    };

    function make(initials) {
      return Course.findInitials(initials, options).then(courses => {
        return prepare.courses(req, courses);
      });
    }

    // TODO: requirements not found as courses?
    const requirements = req.courses[0].requisites.requirements;
    Promise.all(requirements.map(requirement => {
      return Promise.props({
        prerequisites: make(requirement.prerequisites),
        corequisites: make(requirement.corequisites),
      });
    })).then(results => {
      res.send(results);
    });
  });

/**
 * @api {get} /courses/:initials/:year/:period Request course of specific period
 * @apiName GetSpecificCourse
 * @apiGroup Course
 *
 * @apiParam {String} initials Course initials
 * @apiParam {Number} year Year to consider
 * @apiParam {Number=1,2,3} period Period to consider where `1`: *First semester*, `2`: *Second semester* and `3`: *TAV*
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "initials": "IIC2233",
 *     "year": 2016,
 *     "period": 1
 *   }
 *
 * @apiSuccess {[Course](http://www.google.cl)} result [Course](http://www.google.cl) object
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *     "year": 2016,
 *     "period": 1,
 *     "initials": "IIC2233",
 *     "name": "Programación Avanzada",
 *     "credits": 10,
 *     "school": "Ingeniería",
 *     "information": "Este curso enseña técnicas para el diseñar, códificar, probar y evaluar programas que resuelven problemas algorítmicos a partir de las especificaciones detalladas. En particular, el curso enseña algunas construcciones avanzadas de programación orientada a objetos no incluidas en el curso introductorio, algunas estructuras de datos fundamentales, diseño básico de algoritmos y técnicas de análisis. Los estudiantes deben usar una serie de herramientas de programación para desarrollar sus programas.",
 *     "requisites": {
 *         "relation": null,
 *         "equivalences": [
 *             "IIC1222"
 *         ],
 *         "restrictions": [],
 *         "requirements": [
 *             {
 *                 "corequisites": [],
 *                 "prerequisites": [
 *                     "IIC1103"
 *                 ]
 *             },
 *             {
 *                 "corequisites": [],
 *                 "prerequisites": [
 *                     "IIC1102"
 *                 ]
 *             }
 *         ]
 *     },
 *     "specialApproval": false,
 *     "english": false,
 *     "droppable": true,
 *     "links": {
 *         "self": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233"
 *         },
 *         "sections": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/sections"
 *         },
 *         "requirements": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/requirements"
 *         },
 *         "equivalences": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/equivalences"
 *         }
 *     }
 * }
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/IIC2233/2016/1
 */
router.route('/:initials/:year/:period')
  .get((req, res, next) => {
    const query = {
      initials: req.params.initials,
      year: req.year,
      period: req.period,
    };
    Course.findInitial(query)
      .then(course => course ? res.sendCourses(course) : next(NOT_FOUND))
      .catch(next);
  });

/**
 * @api {get} /courses/:initials/:year/:period/sections Request sections of course at specific period
 * @apiName GetSections
 * @apiGroup Section
 *
 * @apiParam {String} initials Course initials
 * @apiParam {Number} year Year to consider
 * @apiParam {Number=1,2,3} period Period to consider where `1`: *First semester*, `2`: *Second semester* and `3`: *TAV*
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "initials": "IIC2233",
 *     "year": 2016,
 *     "period": 1
 *   }
 *
 * @apiSuccess {[Section](http://www.google.cl)[]} result Collection of [Section](http://www.google.cl) objects
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * [
 *     {
 *         "_id": "568e8fc84487e41100305abe",
 *         "updatedAt": "2016-01-07T16:18:16.000Z",
 *         "createdAt": "2016-01-07T16:18:16.000Z",
 *         "year": 2016,
 *         "period": 1,
 *         "NRC": 10760,
 *         "initials": "IIC2233",
 *         "section": 1,
 *         "name": "Programación Avanzada",
 *         "credits": 10,
 *         "school": "Ingeniería",
 *         "information": "Este curso enseña técnicas para el diseñar, códificar, probar y evaluar programas que resuelven problemas algorítmicos a partir de las especificaciones detalladas. En particular, el curso enseña algunas construcciones avanzadas de programación orientada a objetos no incluidas en el curso introductorio, algunas estructuras de datos fundamentales, diseño básico de algoritmos y técnicas de análisis. Los estudiantes deben usar una serie de herramientas de programación para desarrollar sus programas.",
 *         "requisites": {
 *             "relation": null,
 *             "equivalences": [
 *                 "IIC1222"
 *             ],
 *             "restrictions": [],
 *             "requirements": [
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "IIC1103"
 *                     ]
 *                 },
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "IIC1102"
 *                     ]
 *                 }
 *             ]
 *         },
 *         "schedule": {
 *             "CAT": {
 *                 "location": {
 *                     "campus": "San Joaquin",
 *                     "place": null
 *                 },
 *                 "modules": {
 *                     "D": [],
 *                     "S": [],
 *                     "V": [],
 *                     "J": [
 *                         4,
 *                         5
 *                     ],
 *                     "W": [],
 *                     "M": [],
 *                     "L": []
 *                 }
 *             },
 *             "AYUD": {
 *                 "location": {
 *                     "campus": "San Joaquin",
 *                     "place": null
 *                 },
 *                 "modules": {
 *                     "D": [],
 *                     "S": [],
 *                     "V": [],
 *                     "J": [],
 *                     "W": [],
 *                     "M": [],
 *                     "L": [
 *                         6
 *                     ]
 *                 }
 *             }
 *         },
 *         "vacancy": {
 *             "total": 70,
 *             "available": 0
 *         },
 *         "teachers": [
 *             {
 *                 "name": "Pichara Karim",
 *                 "photoURL": "http://buscacursos.uc.cl/getFotoProfe.db.php?nombre=Pichara%20Karim&semestre=2016-1&sigla=IIC2233&seccion=1"
 *             }
 *         ],
 *         "specialApproval": false,
 *         "english": false,
 *         "droppable": true,
 *         "__v": 0,
 *         "links": {
 *             "self": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/NRC/10760"
 *             },
 *             "course": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233"
 *             },
 *             "requirements": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/requirements"
 *             },
 *             "equivalences": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/equivalences"
 *             }
 *         }
 *     },
 *     {
 *         "_id": "568e8fc84487e41100305abf",
 *         "updatedAt": "2016-01-07T16:18:16.000Z",
 *         "createdAt": "2016-01-07T16:18:16.000Z",
 *         "year": 2016,
 *         "period": 1,
 *         "NRC": 10754,
 *         "initials": "IIC2233",
 *         "section": 2,
 *         "name": "Programación Avanzada",
 *         "credits": 10,
 *         "school": "Ingeniería",
 *         "information": "Este curso enseña técnicas para el diseñar, códificar, probar y evaluar programas que resuelven problemas algorítmicos a partir de las especificaciones detalladas. En particular, el curso enseña algunas construcciones avanzadas de programación orientada a objetos no incluidas en el curso introductorio, algunas estructuras de datos fundamentales, diseño básico de algoritmos y técnicas de análisis. Los estudiantes deben usar una serie de herramientas de programación para desarrollar sus programas.",
 *         "requisites": {
 *             "relation": null,
 *             "equivalences": [
 *                 "IIC1222"
 *             ],
 *             "restrictions": [],
 *             "requirements": [
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "IIC1103"
 *                     ]
 *                 },
 *                 {
 *                     "corequisites": [],
 *                     "prerequisites": [
 *                         "IIC1102"
 *                     ]
 *                 }
 *             ]
 *         },
 *         "schedule": {
 *             "CAT": {
 *                 "location": {
 *                     "campus": "San Joaquin",
 *                     "place": null
 *                 },
 *                 "modules": {
 *                     "D": [],
 *                     "S": [],
 *                     "V": [],
 *                     "J": [
 *                         4,
 *                         5
 *                     ],
 *                     "W": [],
 *                     "M": [],
 *                     "L": []
 *                 }
 *             },
 *             "AYUD": {
 *                 "location": {
 *                     "campus": "San Joaquin",
 *                     "place": null
 *                 },
 *                 "modules": {
 *                     "D": [],
 *                     "S": [],
 *                     "V": [],
 *                     "J": [],
 *                     "W": [],
 *                     "M": [],
 *                     "L": [
 *                         6
 *                     ]
 *                 }
 *             }
 *         },
 *         "vacancy": {
 *             "total": 70,
 *             "available": 0
 *         },
 *         "teachers": [
 *             {
 *                 "name": "Pieringer Christian",
 *                 "photoURL": "http://buscacursos.uc.cl/getFotoProfe.db.php?nombre=Pieringer%20Christian&semestre=2016-1&sigla=IIC2233&seccion=2"
 *             }
 *         ],
 *         "specialApproval": false,
 *         "english": false,
 *         "droppable": true,
 *         "__v": 0,
 *         "links": {
 *             "self": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/NRC/10754"
 *             },
 *             "course": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233"
 *             },
 *             "requirements": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/requirements"
 *             },
 *             "equivalences": {
 *                 "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC2233/equivalences"
 *             }
 *         }
 *     }
 * ]
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/IIC2233/2016/1/sections
 */
router.route('/:initials/:year/:period/sections')
  .get((req, res, next) => {
    const query = {
      initials: req.params.initials,
      year: req.year,
      period: req.period,
    };
    Course.find(query).sort('section').lean()
      .then(sections => sections.length ? res.sendSections(sections) : next(NOT_FOUND))
      .catch(next);
  });

// Find single section middleware
router.use(['/id/:_id', '/NRC/:nrc', '/:initials/:year/:period/sections/:section'], (req, res, next) => {
  const query = {};
  const params = req.params;
  if (params.nrc) query.NRC = params.nrc;
  else if (params.id) query._id = params._id;
  else if (params.initials && params.section) {
    query.year = params.year;
    query.period = params.period;
    query.initials = params.initials;
    query.section = params.section;
  }
  if ((query.NRC && !Number(query.NRC)) || (query.section && !Number(query.section))) {
    return next(new throwjs.notAcceptable('invalid identifier type, expected number'));
  }

  Course.findOne(query).lean().then(section => {
    req.section = section;
    section ? next() : next(NOT_FOUND);
    return null;
  }).catch(next);
});

/**
 * @apiDefine SingleSection
 *
 * @apiSuccess {[Section](http://www.google.cl)} result [Section](http://www.google.cl) object
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *     "_id": "568e8fc84487e41100305ad8",
 *     "updatedAt": "2016-01-07T16:18:16.000Z",
 *     "createdAt": "2016-01-07T16:18:16.000Z",
 *     "year": 2016,
 *     "period": 1,
 *     "NRC": 15168,
 *     "initials": "IIC3695",
 *     "section": 1,
 *     "name": "Tópicos Avanzados en Inteligencia de Máquina",
 *     "credits": 10,
 *     "school": "Ingeniería",
 *     "information": "Descripción no disponible para este curso.",
 *     "requisites": {
 *         "relation": "or",
 *         "equivalences": [],
 *         "restrictions": [
 *             {
 *                 "type": "Carrera",
 *                 "value": "Mag.En Cs Ingenieria"
 *             },
 *             {
 *                 "type": "Carrera",
 *                 "value": "Doct Cs Ingenieria"
 *             },
 *             {
 *                 "type": "Carrera",
 *                 "value": "Mag Ingenieria"
 *             }
 *         ],
 *         "requirements": [
 *             {
 *                 "corequisites": [],
 *                 "prerequisites": [
 *                     "EYP1113",
 *                     "IIC1103"
 *                 ]
 *             }
 *         ]
 *     },
 *     "schedule": {
 *         "CAT": {
 *             "location": {
 *                 "campus": "San Joaquin",
 *                 "place": null
 *             },
 *             "modules": {
 *                 "D": [],
 *                 "S": [],
 *                 "V": [],
 *                 "J": [],
 *                 "W": [],
 *                 "M": [
 *                     4,
 *                     5
 *                 ],
 *                 "L": []
 *             }
 *         }
 *     },
 *     "vacancy": {
 *         "total": 30,
 *         "available": 14
 *     },
 *     "teachers": [
 *         {
 *             "name": "Pichara Karim",
 *             "photoURL": "http://buscacursos.uc.cl/getFotoProfe.db.php?nombre=Pichara%20Karim&semestre=2016-1&sigla=IIC3695&seccion=1"
 *         }
 *     ],
 *     "specialApproval": false,
 *     "english": false,
 *     "droppable": true,
 *     "__v": 0,
 *     "links": {
 *         "self": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/NRC/15168"
 *         },
 *         "course": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC3695"
 *         },
 *         "requirements": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC3695/requirements"
 *         },
 *         "equivalences": {
 *             "href": "http://uc-courses.lopezjuri.com/api/v1/courses/2016/1/IIC3695/equivalences"
 *         }
 *     }
 * }
 */

/**
 * @api {get} /courses/id/:_id Request sections by database id
 * @apiName GetSectionByID
 * @apiGroup Section
 *
 * @apiParam {String} _id Section id
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "_id": "568e8fc84487e41100305ad8"
 *   }
 *
 * @apiUse SingleSection
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/id/568e8fc84487e41100305ad8
 */
router.route('/id/:_id')
  .get((req, res, next) => res.sendSections(req.section));

/**
 * @api {get} /courses/NRC/:NRC Request sections by unique NRC number
 * @apiName GetSectionByNRC
 * @apiGroup Section
 *
 * @apiParam {Number} NRC Section NRC unique number
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "NRC": 15168
 *   }
 *
 * @apiUse SingleSection
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/NRC/15168
 */
router.route('/NRC/:nrc')
  .get((req, res, next) => res.sendSections(req.section));

/**
 * @api {get} /courses/:initials/:year/:period/sections/:section Request section of course by it's number
 * @apiName GetSectionByNumber
 * @apiGroup Section
 *
 * @apiParam {String} initials Course initials
 * @apiParam {Number} year Year to consider
 * @apiParam {Number=1,2,3} period Period to consider where `1`: *First semester*, `2`: *Second semester* and `3`: *TAV*
 * @apiParam {Number} section Section number
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *     "initials": "IIC3695",
 *     "year": 2016,
 *     "period": 1,
 *     "section": 1
 *   }
 *
 * @apiUse SingleSection
 *
 * @apiUse NotFoundError
 *
 * @apiExample {curl} Example usage:
 *   curl -i http://uc-courses.lopezjuri.com/api/v1/courses/IIC3695/2016/1/sections/1
 */
router.route('/:initials/:year/:period/sections/:section')
  .get((req, res, next) => res.sendSections(req.section));

// Router is complete
module.exports = router;
