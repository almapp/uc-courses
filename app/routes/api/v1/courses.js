const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');
const Promise = require('bluebird');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router({ mergeParams: true });

function getCourse(req, res, next) {
  const query = {
    initials: req.params.initials,
    year: req.year,
    period: req.period,
  };
  Course.findOne(query).lean().then(course => {
    req.course = course;
    course ? next() : next(new throwjs.notFound());
    return null;
  }).catch(next);
}

router.route('/search')
  .get((req, res, next) => {
    const query = req.query;
    const reg = (exp) => new RegExp(exp, 'i');
    const regs = (exps) => exps.map(reg);

    // Prepare search query
    const search = [];
    if (query.name) search.push({ name: reg(query.name) })
    if (query.initials) search.push({ initials: reg(query.initials) })
    if (query.section) search.push({ section: reg(query.section) })
    if (query.NRC) search.push({ NRC: reg(query.NRC) })
    if (query.school) search.push({ school: reg(query.school) })
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

    // Do not allow empty search query
    if (search.length === 0) {
      return next(new throwjs.unprocessableEntity('empty search queries are not allowed'));
    }

    Course.find({ $and: search }).limit(50).sort('initials').lean()
      .then(sections => res.sendSections(sections))
      .catch(next);
  });

router.route('/fullsearch')
  .get((req, res, next) => {
    const query = req.query;
    const reg = (exp) => new RegExp(exp, 'i');

    const search = [
      { initials: reg(query.q) },
      { name: reg(query.q) },
    ];

    const NRC = Number(query.q);
    if (NRC) {
      search.push({ NRC: NRC });
    }

    Course.find({ $or: search }).limit(50).sort('initials').lean()
      .then(sections => res.sendSections(sections))
      .catch(next);
  });

router.route('/:initials')
  .get((req, res, next) => {
    const query = {
      initials: req.params.initials,
      year: req.year,
      period: req.period,
    };
    Course.findInitial(query).lean()
      .then(course => course ? res.sendCourses(course) : next(new throwjs.notFound()))
      .catch(next);
  });

router.route('/:initials/sections')
  .get((req, res, next) => {
    const query = {
      initials: req.params.initials,
      year: req.year,
      period: req.period,
    };
    Course.find(query).sort('section').lean()
      .then(sections => sections.length ? res.sendSections(sections) : next(new throwjs.notFound()))
      .catch(next);
  });


router.route('/:initials/equivalences')
  .get(getCourse, (req, res, next) => {
    const query = {
      initials: {
        $in: req.course.requisites.equivalences,
      },
    };
    Course.find(query).lean()
      .then(courses => res.sendCourses(courses))
      .catch(next);
  });

router.route('/:initials/requirements')
  .get(getCourse, (req, res, next) => {
    function make(initials) {
      const queries = initials.map(i => {
        return {
          initials: i,
          year: req.year,
          period: req.period,
        };
      });
      return Promise.all(queries.map(q => {
        return Course.findInitial(q).lean().then(course => {
          return (course) ? prepare.courses(req, course) : { initials: q.initials };
        });
      }));
    }

    const requirements = req.course.requisites.requirements;
    Promise.all(requirements.map(requirement => {
      return Promise.props({
        prerequisites: make(requirement.prerequisites),
        corequisites: make(requirement.corequisites),
      });
    })).then(results => {
      res.send(results);
    });
  });

// Find single course
router.use(['/id/:_id', '/NRC/:nrc', '/:initials/sections/:section'], (req, res, next) => {
  const query = {
    year: req.year,
    period: req.period
  };
  const params = req.params;
  if (params.nrc) query.NRC = params.nrc;
  else if (params.id) query._id = params._id;
  else if (params.initials && params.section) {
    query.initials = params.initials;
    query.section = params.section;
  }
  if ((query.NRC && !Number(query.NRC)) || (query.section && !Number(query.section))) {
    return next(new throwjs.notAcceptable('invalid identifier type, expected number'));
  }

  Course.findOne(query).lean().then(section => {
    req.section = section;
    section ? next() : next(new throwjs.notFound());
    return null;
  }).catch(next);
});

router.route('/id/:_id')
  .get((req, res, next) => res.sendSections(req.section));

router.route('/NRC/:nrc')
  .get((req, res, next) => res.sendSections(req.section));

router.route('/:initials/sections/:section')
  .get((req, res, next) => res.sendSections(req.section));

module.exports = router;
