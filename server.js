import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import guests from './data/guests.json'
import { Guest } from './models/guest'

// MONGOOSE SETUP
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/guest-list'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// SEEDING FOR ADDING NEW DATA
if (process.env.RESET_DB) {
  console.log('Resetting database')
  const seedDatabase = async () => {
    await Guest.deleteMany({})

    guests.forEach((guestData) => {
      new Guest(guestData).save()
    })
  }
  seedDatabase()
}

// PORT & APP SETUP
const port = process.env.PORT || 8000 // Default 8000, can be overridden e.g PORT=5000 npm run dev
const app = express()

// MIDDLEWARES
app.use(cors())
app.use(bodyParser.json())
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service unavailabale' })
  }
})

// ROUTES FOR GET
app.get('/', (req, res) => {
  res.send('Endpoints: GET/guests GET/guests/:id GET/guests?name= GET/guests?attending=true/false')
})

// QUERYBUILDER TO HAVE MULTIPLE QUERIES IN SAME ROUTE
const queryBuilder = (req, res) => {
  const { name, attending } = req.query // Query params
  const nameRegex = new RegExp(name, 'i') // To be able to search in the whole string and not depending on upper/lowercase
  let query = {}
  // Query to search for first or last name
  if (name) {
    query = { $or: [{ 'first_name': nameRegex }, { 'last_name': nameRegex }] }
  }
  // Query to search for isAttending true or false
  if (attending) {
    query['isAttending'] = { $eq: attending } //Adds isAttending to query if name is also applied
  }
  return query
}

// GET ROUTE FOR GUESTS
app.get('/guests', async (req, res) => {
  // Gets the query from queryBuilder
  const query = queryBuilder(req, res)

  // If query is true: filter on that query, if false: return all guests
  const guests = query
    ? await Guest.find(query)
    : await Guest.find().sort('last_name').sort('first_name') // .sort({ 'added': -1 })

  // If there are any matching guests, return them. Else return error.
  if (guests) {
    res.json({
      guests: guests
    })
  } else {
    res.status(404).json({ error: 'No guests found' })
  }
})

// GET ROUTE FOR SPECIFIC ID
app.get('/guests/:id', async (req, res) => {
  const guest = await Guest.findById(req.params.id)
  if (guest) {
    res.json(guest)
  } else {
    res.status(404).json({ error: 'Guest not found' })
  }
})


// ROUTES FOR POST
app.post('/guests', async (req, res) => {
  // Retrieve info sent by the client to our API endpoint
  const { first_name, last_name, email, phone, allergies, other, isAttending } = req.body
  // Use my mongoose model to create the database entry
  const guest = new Guest({ first_name, last_name, email, phone, allergies, other, isAttending })
  // Using try/catch instead of if/else
  try {
    //Sucess
    const savedGuest = await guest.save()
    res.status(201).json(savedGuest)
  } catch (err) {
    // Failed
    res.status(400).json({ message: 'Could not save guest', error: err.errors })
  }
})

// ROUTES FOR PUT
// app.put('/guests/:id', (req, res) => {
// try {
//   //Sucess
//   const updatedGuest = await guest.save()
//   res.status(201).json(updatedGuest)
// } catch (err) {
//   // Failed
//   res.status(400).json({ message: 'Could not update guest', error: err.errors })
// }
// })

//ROUTES FOR DELETE
// app.delete('/guests/:id', (req, res) => {
// try {
//   //Sucess
//   const deletedGuest = await guest.save()
//   res.status(201).json(deletedGuest)
// } catch (err) {
//   // Failed
//   res.status(400).json({ message: 'Could not delete guest', error: err.errors })
// }// })

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
