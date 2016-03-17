'use strict';

const mongoose = require('mongoose');
const Promise = require('bluebird');
const buscacursos = require('buscacursos-uc');
const argv = require('yargs').argv;

const database = require('./../../config/database');
const models = require('../../models');

const Course = mongoose.model('Course');

const settings = {
  concurrency: argv.concurrency || 5,
};
console.log('Settings:', settings);

// Handler per query
function fetch(query) {
  console.log('Requesting:', query);
  return buscacursos.fetch(query).then(courses => {
      console.log('Fetched:', query, courses.length);
      return Course.create(courses);
    }).catch(err => {
      console.log('Error:', query, err);
      return [];
    });
}

function scrap(options) {
  options = options || {}
  const initials = options.initials || require('./initials.json');
  const year = options.year || 2016;
  const period = options.period || 1;

  const queries = initials.map(initial => ({
    'cxml_semestre': `${year}-${period}`,
    'cxml_sigla': initial,
  }));

  return Course.remove({})
    .then(() => Promise.map(queries, fetch, { concurrency: settings.concurrency }));
}

// Start operation
scrap().then(result => {
  console.log('Scraping done! Batches:', result.length);
  process.exit();
});
