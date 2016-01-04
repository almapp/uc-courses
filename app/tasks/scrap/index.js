'use strict';

const mongoose = require('mongoose');
const Promise = require('bluebird');
const scraper = require('buscacursos-uc-scraper');

const scrap = Promise.promisify(scraper.deepSearch);
const database = require('./../../config/database');
const models = require('../../models');

const Course = mongoose.model('Course');

const initials = scraper.initials;

module.exports = function(options) {
  return Course.remove({})
    .then(_ => {
      return scrap(initials, options)
    }).then(courses => {
      return Course.create(courses);
    }).then(created => {
      return created.length;
    });
}
