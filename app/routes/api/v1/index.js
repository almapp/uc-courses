const express = require('express');
const mongoose = require('mongoose');
const throwjs = require('throw.js');

const Course = mongoose.model('Course');

const prepare = require('./helpers/hateoas');

const router = express.Router({ caseSensitive: false });

router.use((req, res, next) => {
  res.sendSections = function(obj) {
    return this.send(prepare.sections(req, obj));
  }
  res.sendCourses = function(obj) {
    return this.send(prepare.courses(req, obj));
  }
  next();
});

router.use('/courses', require('./courses'));
router.use('/teachers', require('./teachers'));

router.use((err, req, res, next) => {
  if (process.env.NODE_ENV && process.env.NODE_ENV.toUpperCase() === 'PRODUCTION') {
    delete err.stack;
  }
  res.status(err.statusCode || 500).json(err);
});

module.exports = router;
