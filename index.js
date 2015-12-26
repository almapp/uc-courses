'use strict';

const schedule = require('node-schedule');

const scrap = require('./app/tasks/scrap');

const app = require('./app/app');
const server = app.server;
const config = app.config;

function startScraping() {
  console.log('scraping started');
  scrap((err, ammount) => {
    console.log('result', err, ammount);
    if (err) console.error(err);
    else console.log('Scraped:', ammount);
  });
}

const job = schedule.scheduleJob('0 0 2 ? * SAT *', () => {
  startScraping();
});

if (config.get('scrap:secret')) {
  server.get(`/${config.get('scrap:secret')}`, (req, res, next) => {
    startScraping();
    res.send('scraping started');
  });
}

// Start server
server.listen(config.get('port'), () => {
  console.log('App listening at:', config.get('port'));
});
