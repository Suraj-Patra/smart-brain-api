const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')
const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'surajpatra',
      password : 'postgres',
      database : 'smart-brain'
    }
});

const app = express();

app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.send('success');
})

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if(isValid) {
                return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => res.json(user[0]))
                    .catch(err => res.status(400).json('Unable to get user'));
            } else {
                res.status(400).json('wrong credentials');        
            }
        })
        .catch(err => res.status(400).json('wrong credentials'));
})

app.post('/register', (req, res)=> {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                .returning('*')
                .insert({
                    name: name,
                    email: loginEmail[0].email,
                    joined: new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })

        .catch(err =>res.status(400).json('Unable to Register'));

})


app.get('/profile/:id', (req, res)=> {
    const { id } = req.params;

    // -> {id: id} => both are same so we can write as {id}
    db.select('*').from('users').where({id}) 
        .then(user => {
            // It will return empty array if not found
            (user.length)   
                ? res.json(user[0])
                : res.status(400).json('Not Found!');
        })
        .catch(err => res.status(400).json('Error getting user'))
})

app.put('/image', (req, res)=> {
    const { id } = req.body;

    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        })
        .catch(err => res.status(400).json('Unable to get entries'));
})



// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });



app.listen(3000, ()=> {
    console.log('app is running on port 3000');
})

/* 

/ --> res = this is working
/signin --> POST = success/fail
/register --> POST = user
/profile/:userId --> GET = user
/image --> PUT = user

*/