'use strict';

const mongoose = require('mongoose');
const Promise = require('bluebird');
const scraper = require('buscacursos-uc-scraper');

const database = require('./../../config/database');
const models = require('../../models');

const Course = mongoose.model('Course');


module.exports = function(options) {
  const initials = options.initials || scraper.initials;
  return Course.remove({})
    .then(() => {
      function handler(initial) {
        return scraper.deepSearch([initial], options).then(courses => {
          return Course.create(courses);
        });
      }
      return Promise.map(initials, handler, { concurrency: 1 });
    }).then(created => {
      return created.length;
    });
}
