const express = require('express');
const mongoose = require('mongoose');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router({ caseSensitive: false, mergeParams: true });

router.use((req, res, next) => {
  res.sendSections = function(obj) {
    return this.send(prepare.sections(req, obj));
  }
  res.sendCourses = function(obj) {
    return this.send(prepare.courses(req, obj));
  }
  next();
});

router.param('year', (req, res, next, id) => {
  // const date = new Date();
  req.year = (req.params.year && req.params.year !== '_') ? req.params.year : 2016; // date.getFullYear();
  next();
});

router.param('period', (req, res, next, id) => {
  // const date = new Date();
  req.period = (req.params.period && req.params.period !== '_') ? req.params.period : 1;
  next();
});

router.use('/courses/:year/:period', require('./courses'));

module.exports = router;
