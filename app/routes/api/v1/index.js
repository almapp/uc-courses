const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router({ caseSensitive: false, mergeParams: true });

router.route('/')
  .get((req, res, next) => {
    res.send({
      version: 'v1',
      routes: [
        {
          description: 'Search sections',
          resource: '[Section]',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/search`,
          queryParams: {
            name: {
              description: 'Find course by name',
              type: 'string',
              default: 'all',
            },
            initials: {
              description: 'Find course by initials',
              type: 'string',
              default: 'all',
            },
            section: {
              description: 'Find course by section',
              type: 'number',
              default: 'all',
            },
            NRC: {
              description: 'Find course by NRC',
              type: 'number',
              default: 'all',
            },
            school: {
              description: 'Find course by school',
              type: 'string',
              default: 'all',
            },
            teacher: {
              description: 'Find course matching at least this teacher',
              type: 'string',
              default: 'all',
            },
            campus: {
              description: 'Find course by campus',
              type: 'number',
              default: 'all',
            },
            places: {
              description: 'Find course by matching at least one of the modules located in one on this places',
              type: '[string]',
              default: 'all',
            },
          },
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/search?initials=MAT&teacher=Torres&campus=San+Joaquin&places[]=BC25`,
          ],
        },
        {
          description: 'Get course by initials',
          resource: 'Course',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/:initials`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/IIC2233`,
          ],
        },
        {
          description: 'Get sections of course',
          resource: '[Section]',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/:initials/sections`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/IIC2233/sections`,
          ],
        },
        {
          description: 'Get course equivalences',
          resource: '[Course]',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/:initials/equivalences`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/IIC2233/equivalences`,
          ],
        },
        {
          description: 'Get course requirements (prerequisites and corequisites)',
          resource: 'Custom schema',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/:initials/requirements`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/IIC2233/requirements`,
          ],
        },
        {
          description: 'Get single section',
          resource: 'Section',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/id/:_id`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/id/567dcb18e14692e53b299353`,
          ],
        },
        {
          description: 'Get single section',
          resource: 'Section',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/NRC/:nrc`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/NRC/10760`,
          ],
        },
        {
          description: 'Get single section',
          resource: 'Section',
          method: 'GET',
          url: `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/:initials/sections/:section`,
          examples: [
            `${req.protocol}://${req.headers.host}/api/v1/courses/_/_/IIC2233/sections/1`,
          ],
        },
      ],
    });
  });

router.use((req, res, next) => {
  res.sendSections = function(obj) {
    return this.send(prepare.sections(req, obj));
  }
  res.sendCourses = function(obj) {
    return this.send(prepare.courses(req, obj));
  }
  next();
});

router.param('year', (req, res, next) => {
  const year = req.params.year;
  if (year === '_') req.year = 2016;
  else if (Number(year)) req.year = year;
  else return next(new throwjs.notAcceptable(`invalid year, got '${year}'`));
  next();
});

router.param('period', (req, res, next) => {
  const period = req.params.period;
  if (period === '_') req.period = 1;
  else if (Number(period)) req.period = period;
  else return next(new throwjs.notAcceptable(`invalid period, got '${period}'`));
  next();
});

router.use('/courses/:year/:period', require('./courses'));

router.use((err, req, res, next) => {
  if (process.env.NODE_ENV && process.env.NODE_ENV.toUpperCase() === 'PRODUCTION') {
    delete err.stack;
  }
  res.status(err.statusCode || 500).json(err);
});

module.exports = router;
