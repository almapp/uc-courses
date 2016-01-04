'use strict';

const schedule = require('node-schedule');

const scrap = require('./app/tasks/scrap');

const app = require('./app/app');
const server = app.server;
const config = app.config;

function startScraping(options) {
  console.log('Scraping started');
  scrap(options).then(ammount => {
    console.log('Scraped:', ammount);
  }).catch(err => {
    console.error(err);
  })
}

const job = schedule.scheduleJob('0 0 2 ? * SAT *', () => {
  startScraping({ year: 2016, period: 1 });
});

if (config.get('scrap:secret')) {
  server.get(`/${config.get('scrap:secret')}`, (req, res, next) => {
    const options = {
      year: req.query.year || 2016,
      period: req.query.period || 1,
      initials: req.query.initials, // null if not present
    };
    startScraping(options);
    res.send(`Scraping started on ${options.year}-${options.period}`);
  });
}

// Start server
server.listen(config.get('port'), () => {
  console.log('App listening at:', config.get('port'));
});
