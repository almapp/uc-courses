module.exports.sections = function(req, object) {
  if (object instanceof Array) {
    return object.map(s => section(req, s));
  } else {
    return section(req, object);
  }
}

function section(req, s) {
  s.links = {
    self: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${s.year}/${s.period}/NRC/${s.NRC}`,
    },
    course: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${s.year}/${s.period}/${s.initials}`,
    },
    requirements: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${s.year}/${s.period}/${s.initials}/requirements`,
    },
    equivalences: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${s.year}/${s.period}/${s.initials}/equivalences`,
    }
  };
  return s;
}

module.exports.courses = function(req, object) {
  if (object instanceof Array) {
    return object.map(c => course(req, c));
  } else {
    return course(req, object);
  }
}

function course(req, c) {
  c.links = {
    self: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${c.year}/${c.period}/${c.initials}`,
    },
    sections: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${c.year}/${c.period}/${c.initials}/sections`,
    },
    requirements: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${c.year}/${c.period}/${c.initials}/requirements`,
    },
    equivalences: {
      href: `${req.protocol}://${req.headers.host}/api/v1/courses/${c.year}/${c.period}/${c.initials}/equivalences`,
    }
  };
  return c;
}
