'use strict';

const mongoose = require('mongoose');
const database = require('./../../config/database');
const scraper = require('buscacursos-uc-scraper');
require('../../models');

const Course = mongoose.model('Course');

const initials = scraper.initials;

module.exports = function scrap(callback) {
  Course.remove({}).then(_ => {
    scraper.deepSearch(initials, (err, courses) => {
      if (err) return callback(err);

      Course.create(courses).then(value => {
        callback(null, value.length);
      }).catch(callback);
    });
  }).catch(callback);
}
