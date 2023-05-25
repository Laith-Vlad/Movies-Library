'use strict';
const express = require('express')
const cors = require('cors')
const app = express()
const data = require('./Movie Data/data.json'); // outdated data.json
const axios = require('axios'); // require axious to use it in the trend function
require('dotenv').config(); // to be able to use dotenv.config from .env file
const pg = require('pg');
const client = new pg.Client(process.env.DBURL); // Creating client from the database url


app.use(cors())
app.use(express.json())
const PORT = process.env.PORT || 3001; // port number from .env and backup port
client.connect().then(test => {

  app.listen(PORT, () => console.log('up and running'));
}
)


// app.get routes
app.get('/', handleHome)
app.get('/favorite', handleFav)
app.get('/trend', handleTrend)
app.get('/search', handleSearch)

app.get('/trend/image', imgHandler)
app.get('/trend/overview', handleTrendOverview)

app.get('/addmovie', seeMovieHandler)
app.post('/addmovie', addMovieHandler)
app.get('/addmovie/:id', getHandler)
app.put('/addmovie/:id', updateHandler)
app.delete('/addmovie/:id', deleteHandler)
// constructor to extract data
function Movie(id, title, release_date, posterPath, overview) {
  this.id = id;
  this.title = title
  this.release_date = release_date
  this.posterPath = posterPath
  this.overview = overview
}
// handle home and routes
//................................................................
function handleHome(req, res) {
  const newMovie = new Movie(data.id, data.title, data.release_date)
  res.json(
    { newMovie: newMovie }
  )
}

function handleFav(req, res) {

  res.send('welcome to favorites')
}
function handleSearch(req, res) {
  const searchQuery = req.query.laith;
  // https://api.themoviedb.org/3/search/movie?api_key=668baa4bb128a32b82fe0c15b21dd699&language=en-US&query=The&page=2
  axios.get(`${process.env.URLSEARCH}?api_key=${process.env.MOVKEY}&query=${searchQuery}`).then(result => {
    res.status(200).json(
      {
        code: 200,
        movie: result.data.results
      }
    );
  })
}

async function handleTrend(req, res) {

  const moveData = await axios.get(`${process.env.URLMOVIE}?api_key=${process.env.MOVKEY}`);

  const movieData = moveData.data.results.map(movie => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date,
    poster_path: movie.poster_path,
    overview: movie.overview
  }));

  res.json({
    code: 200,
    message: movieData
  });

}

// display pic of the first movie of trending 
async function imgHandler(req, res) {
  try { //used the try catch method to make debugging easier
    const movieData = await axios.get(`${process.env.URLMOVIE}?api_key=${process.env.MOVKEY}`);

    if (movieData.data.results.length === 0) {
      return res.status(404).send("No movies found.");
    }

    const posterPath = movieData.data.results[0].poster_path;
    const imagePath = `https://image.tmdb.org/t/p/w500/${posterPath}`;
    //used response type and chosen arraybuffer data type then used from to tell the client what type of data it is which is bvinary data so it can understand it and use it correctly

    const imageResponse = await axios.get(imagePath, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    res.type('jpg').send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
}


async function handleTrendOverview(req, res) {
  try {
    const movieData = await axios.get(`${process.env.URLMOVIE}?api_key=${process.env.MOVKEY}`);

    if (movieData.data.results.length === 0) {
      return res.status(404).send("No movies found.");
    }

    const firstMovieId = movieData.data.results[0].id;
    // console.log(firstMovieId)

    const overviewData = await axios.get(`https://api.themoviedb.org/3/movie/${firstMovieId}?api_key=${process.env.MOVKEY}`);
    console.log(overviewData)
    const overview = overviewData.data.overview;

    res.status(200).json({
      code: 200,
      overview: overview
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
}
// data base handler get post update delete
function seeMovieHandler(req, res) {
  const sql = `select * from added_movie`;
  client.query(sql).then(movie => {
    res.json(
      {
        count: movie.rowCount,
        data: movie.rows
      });
    // console.log(movie);

  }).catch(err => {
    handleErorr(err, req, res);
  });
}
function addMovieHandler(req, res) {
  const userInput = req.body;
  const sql = `insert into added_movie(title, overview,comment) values($1, $2, $3) returning *`;

  const handleValueFromUser = [userInput.title, userInput.overview,userInput.comment];

  client.query(sql, handleValueFromUser).then(data => {

    const insertedMovie = data.rows[0];
    const generatedId = insertedMovie.id; 
    // insertedMovie.generatedId = generatedId;
    res.status(201).json(insertedMovie);
  }).catch(err => handleErorr(err, req, res, next));
}
//................................................................

// Lab 14 get update and delete using sql
function getHandler(req, res) {
  const id = req.params.id;
  const sql = 'SELECT * FROM added_movie WHERE id = $1;';
  const params = [id];
  client.query(sql, params)
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).send(`Movie with ID ${id} not found`);
      } else {
        res.status(200).json({ data: data.rows[0] });
      }
    })
    .catch(err => {
      console.error('Error executing query', err.stack);
      res.status(500).send('Error executing query');
    });
}

function updateHandler(req, res) {
  const id = req.params.id;
  const updateData = req.body;
  const sql = `UPDATE added_movie
               SET title = $1, overview = $2, comment = $3
               WHERE id = $4
               RETURNING *;`;
  const updated = [updateData.title, updateData.overview,updateData.comment, id];
  client.query(sql, updated)
    .then(data => {
      res.status(202).json({ data });
    })
    .catch(err => {
      console.error('Error executing query', err.stack);
      res.status(500).send('Error executing query');
    });
}

function deleteHandler(req, res) {
  const id = req.params.id;
  const sql = 'DELETE FROM added_movie WHERE id = $1 RETURNING *;';
  const params = [id];
  client.query(sql, params)
    .then(data => {
      if (data.rowCount === 0) {
        res.status(404).send(`Movie with ID ${id} not found`);
      } else {
        res.status(204).send();
      }
    })
    .catch(err => {
      console.error('Error executing query', err.stack);
      res.status(500).send('Error executing query');
    });
}
//................................................


// error handling
// handle 404 errors
app.use('/*', (req, res, next) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Page not found!'
  });
});

//handle 500 errors
app.use(function handleErorr(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({
    statusCode: 500,
    message: 'Internal server error!'
  });
});