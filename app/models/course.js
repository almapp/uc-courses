const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Promise = require('bluebird');

const TeacherSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  photoURL: {
    type: String,
  },
}, {
  _id: false,
});

const RestrictionSchema = new Schema({
  type: {
    type: String,
  },
  value: {
    type: String,
  },
}, {
  _id: false,
});

const RequirementsSchema = new Schema({
  prerequisites: {
    type: [String],
  },
  corequisites: {
    type: [String],
  },
}, {
  _id: false,
});

const ModuleSchema = new Schema({
  day: {
    type: String,
    required: true,
    uppercase: true,
  },
  hours: {
    type: [Number],
  },
}, {
  _id: false,
});

const ScheduleSchema = new Schema({
  identifier: {
    type: String,
    required: true,
    uppercase: true,
  },
  location: {
    campus: {
      type: String,
    },
    place: {
      type: String,
    },
  },
  modules: {
    type: [ModuleSchema]
  }
}, {
  _id: false,
});

const CourseSchema = new Schema({
  NRC: {
    type: Number,
    required: true,
    index: true,
    unique: true,
  },
  initials: {
    type: String,
    required: true,
    index: true,
  },
  section: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true
  },
  school: {
    type: String
  },
  year: {
    type: Number,
    required: true,
    index: true,
    min: 0
  },
  period: {
    type: Number,
    required: true,
    index: true,
    min: 0,
  },
  droppable: {
    type: Boolean,
    default: false,
  },
  english: {
    type: Boolean,
    default: false,
  },
  specialApproval: {
    type: Boolean,
    default: false,
  },
  teachers: {
    type: [TeacherSchema],
  },
  credits: {
    type: Number,
    required: true,
    min: 0,
  },
  information: {
    type: String,
  },
  vacancy: {
    total: {
      type: Number,
      min: 0,
    },
    available: {
      type: Number,
      min: 0,
    },
  },
  schedule: {
    type: [ScheduleSchema],
  },
  requisites: {
    requirements: {
      type: [RequirementsSchema],
    },
    relation: {
      type: String,
    },
    restrictions: {
      type: [RestrictionSchema],
    },
    equivalences: {
      type: [String],
    },
  },
}, {
  timestamps: true,
});

const exclude = [
  '_id',
  '__v',
  'NRC',
  'section',
  'schedule',
  'vacancy',
  'teachers',
  'specialApproval',
  'english',
  'droppable',
  'updatedAt',
  'createdAt',
].map(e => `-${e}`).join(' ');

CourseSchema.index({ name: 'text' });

CourseSchema.statics.findInitials = function(initials, options) {
  const query = {
    initials: {
      $in: (initials instanceof Array) ? initials : [initials],
    },
  }
  const filter = (options && options.year && options.period) ? options : {};

  // Newest first
  return this.model('Course').find(query).where(filter).select(exclude).sort('-year -period').lean()
    .then(CourseSchema.statics.unique);
}

CourseSchema.statics.findInitial = function(query) {
  /*
  initials
  year
  period
  */
  return this.model('Course').findOne(query).select(exclude).lean();
}

CourseSchema.statics.unique = function(courses) {
  const f = (c) => `${c.year}-${c.period}`;
  const identifiers = {};
  const uniques = [];

  courses.forEach(course => {
    const ID = f(course);
    if (!identifiers[ID]) {
      uniques.push(course);
      identifiers[ID] = true;
    }
  });
  return uniques;
}

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;
