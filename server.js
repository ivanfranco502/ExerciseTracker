const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true, useUnifiedTopology: true}, () => console.log( mongoose.connection.readyState ) );

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

let Schema = mongoose.Schema;

let exerciseSchema = {
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
};

let exercisesSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [exerciseSchema]
});

let Exercise = mongoose.model('Exercise', exercisesSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  let exercise = new Exercise();
  exercise.username = username;
  exercise.exercises = [];
  
  exercise.save((err, data) => {
    if (err) console.log(err);
    res.json({username: data.username, _id: data._id});
  });
});

app.get('/api/exercise/users', (req, res) => {
  Exercise.find().select("username _id").exec((err, data) => {
    if (err) console.log(err);
    res.json(data);
  });
});

app.post('/api/exercise/add', (req, res) => {
  const userId = req.body.userId;
  Exercise.findById(userId, (err, data) => {
    if (err) console.log(err);
    let datetime = Date.now();
    if(req.body.date) datetime = new Date(req.body.date);
    let prevExercise = data.exercises ? data.exercises: [];
    data.exercises = [...prevExercise, {description:req.body.description, duration:req.body.duration, date: datetime}];
    
    data.save((err, saved) => {
      if(err) console.log(err);
      res.json({_id:saved._id, username:saved.username, description:req.body.description, duration:req.body.duration, date: datetime});
    });
  });
});

app.get('/api/exercise/log', (req, res) => {
  const userId = req.query.userId;
  let query = Exercise.findById(userId, (err, data) => {
    if (err) console.log(err);
    let responseLog = [...(data.exercises ? data.exercises : [])];
    
    if(req.query.from)
      responseLog = responseLog.filter(l => l.date > new Date(req.query.from));
    if(req.query.to)
      responseLog = responseLog.filter(l => l.date < new Date(req.query.to));
    
    //sort
    responseLog = responseLog.sort((a,b) => a.date - b.date);
    
    //limit
    if(req.query.limit)
      responseLog = responseLog.slice(0, req.query.limit);
    
    // retrieve the length of the updated array
    const { length: count } = responseLog;
    res.json({username: data.username, exercise: responseLog ? responseLog : [], count: responseLog ? responseLog.map(e => e.duration).reduce((a, b) => a + b, 0) : 0});
  });
  
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
