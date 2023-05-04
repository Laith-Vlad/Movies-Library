'use strict';
const express = require('express')
const cors = require('cors')
const app = express()
const data = require('./Movie Data/data.json');

app.use(cors())
app.use(express.json())

app.listen(3000, () => console.log('up and running'));


app.get('/', handleHome)
app.get('/favorite', handleFav)


// handle 404 errors
app.use((req, res, next) => {
    res.status(404).json({
      statusCode: 404,
      message: 'Page not found!'
    });
  });
  
  // handle 500 errors
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error!'
    });
  });


function handleFav(req, res) {
    console.log('testing the favorite url')
    res.send('welcome to favorites')
}


function Movie(title, posterPath, overview) {
    this.title = title;
    this.posterPath = posterPath;
    this.overview = overview;
}
//error 500 test here in home
function handleHome(req ) {
    const newMovie = new Movie(data.title, data.poster_path, data.overview)
    res.json(
        { newMovie: newMovie }
    )
}


