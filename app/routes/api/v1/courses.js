const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');
const Promise = require('bluebird');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router();

// Utility
const reg = (exp) => new RegExp(exp, 'i');
const regs = (exps) => exps.map(reg);
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

// Strict query
function searchQuery(query) {
  const search = [];
  if (query.name) search.push({ name: reg(query.name) });
  if (query.initials) search.push({ initials: reg(query.initials) });
  if (query.year) search.push({ year: query.year });
  if (query.period) search.push({ period: query.period });
  if (query.section) search.push({ section: reg(query.section) });
  if (query.NRC) search.push({ NRC: reg(query.NRC) });
  if (query.school) search.push({ school: reg(query.school) });
  if (query.teacher) search.push({ teachers: { $elemMatch: { name: reg(query.teacher)} } });
  if (query.campus) {
    search.push({ $or: ['CAT','TALL','LAB','AYUD','PRAC','TERR','TES','OTRO'].map(type => {
      const obj = {};
      obj[`schedule.${type}.location.campus`] = reg(query.campus);
      return obj;
    })});
  }
  if (query.places) {
    search.push({ $or: ['CAT','TALL','LAB','AYUD','PRAC','TERR','TES','OTRO'].map(type => {
      const obj = {};
      obj[`schedule.${type}.location.place`] = { $in: regs(query.places) };
      return obj;
    })});
  }

  if (search.length === 0) {
    return null;
  }
  return { $and: search };
}

// Matching query
function fullSearchQuery(query) {
  const search = [
    { initials: reg(query.q) },
    { name: reg(query.q) },
  ];

  const NRC = Number(query.q);
  if (NRC) {
    search.push({ NRC: NRC });
  }

  if (query.year && query.period) {
    search.push({
      $and: [
        { year: query.year },
        { period: query.period },
      ],
    });
  }

  return { $or: search };
}

// Index route for searching
router.route('/')
  .get((req, res, next) => {
    const query = req.query;

    // Prepare search query
    const search = (query.q) ? fullSearchQuery(query) : searchQuery(query);

    // Do not allow empty search query
    if (!search) {
      return next(new throwjs.unprocessableEntity('empty search queries are not allowed'));
    }

    Course.find(search).limit(50).sort('initials').lean()
      .then(sections => res.sendSections(sections))
      .catch(next);
  });

// All courses with initials
router.route('/:initials')
  .get(getCourses, (req, res, next) => res.sendCourses(req.courses));

// Populate course equivalences
router.route('/:initials/equivalences')
  .get(getCourses, (req, res, next) => {
    const options = { // optionals
      year: req.query.year,
      period: req.query.period,
    };
    const equivalences = req.courses[0].requisites.equivalences;

    Course.findInitials(equivalences, options)
      .then(courses => {
        const year = req.query.year;
        const period = req.query.period;
        if (year && period) {
          courses = courses.filter(c => c.year === year && c.period === c.period);
        }
        // TODO: equivalences not found as courses?
        res.sendCourses(courses);
      })
      .catch(next);
  });

// Populate course requirements
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

// Course of year and period
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

// Get sections of specific course
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

// Apply middleware
router.route('/id/:_id')
  .get((req, res, next) => res.sendSections(req.section));

router.route('/NRC/:nrc')
  .get((req, res, next) => res.sendSections(req.section));

router.route('/:initials/:year/:period/sections/:section')
  .get((req, res, next) => res.sendSections(req.section));

// Router is complete
module.exports = router;
