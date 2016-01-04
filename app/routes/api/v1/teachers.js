const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');
const Promise = require('bluebird');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router();

// Utility
const NOT_FOUND = new throwjs.notFound();

router.route('/')
  .get((req, res, next) => {
    // Course.distinct('teachers.name').then(names => {
    //   res.send(names)
    // }).catch(next);

    const query = (req.query.year && req.query.period) ? {
      year: req.query.year,
      period: req.query.period,
    } : null;

    Course.find(query).select('teachers').then(courses => {
      if (!courses.length) {
        return next(NOT_FOUND);
      }

      const teachers = courses.map(c => c.teachers).reduce(function(a, b) {
        return a.concat(b);
      });
      const identifiers = {};
      const uniques = teachers.filter(teacher => {
        console.log(teacher.name);
        if (identifiers[teacher.name]) {
          return false;
        } else {
          identifiers[teacher.name] = true;
          return true;
        }
      });
      res.send(uniques);
    });
  });

// Router is complete
module.exports = router;
