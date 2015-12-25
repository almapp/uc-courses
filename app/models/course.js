const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Promise = require('bluebird');

const TeacherSchema = new Schema({
  name: {
    type: String,
    required: true,
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

const ScheduleSchema = new Schema({
  modules: {
    L: {
      type: [Number],
    },
    M: {
      type: [Number],
    },
    W: {
      type: [Number],
    },
    J: {
      type: [Number],
    },
    V: {
      type: [Number],
    },
    S: {
      type: [Number],
    },
    D: {
      type: [Number],
    },
  },
  location: {
    campus: {
      type: String,
    },
    place: {
      type: String,
    },
  },
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
    CAT: {
      type: ScheduleSchema,
    },
    TALL: {
      type: ScheduleSchema,
    },
    LAB: {
      type: ScheduleSchema,
    },
    AYUD: {
      type: ScheduleSchema,
    },
    PRAC: {
      type: ScheduleSchema,
    },
    TERR: {
      type: ScheduleSchema,
    },
    TES: {
      type: ScheduleSchema,
    },
    OTRO: {
      type: ScheduleSchema,
    },
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
].map(e => `-${e}`).join(' ');

CourseSchema.statics.findInitial = function(params) {
  params = params instanceof String ? { initials: params } : params;
  const query = {
    initials: params.initials,
  }
  if (params.year) query.year = params.year;
  if (params.period) query.period = params.period;

  return this.model('Course').findOne(query).select(exclude);
}

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;
