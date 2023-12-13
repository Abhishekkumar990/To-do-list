const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/user');
const path = require('path')

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://abhishek:project@project.go8fhed.mongodb.net/bookstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')))
app.set('view engine', 'ejs');
app.use(
    session({
        secret: 'your-secret-key',
        resave: true,
        saveUninitialized: true,
    })
);
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(
    new LocalStrategy(async(username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) return done(null, false, { message: 'Incorrect username.' });

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) return done(null, false, { message: 'Incorrect password.' });

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    try {
        const user = await User.findById(id);
        return done(null, user);
    } catch (error) {
        return done(error);
    }
});

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post(
    '/login',
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
    })
);

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async(req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal error');
    }
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', {
        username: req.user.username,
        titles: req.user.titles,
        descriptions: req.user.descriptions,
    });
});
app.post('/dashboard/update', requireAuth, async(req, res) => {
    try {
        const newTitle = req.body.titles;
        const newDescription = req.body.descriptions;

        // Ensure that titles and descriptions are initialized as arrays
        req.user.titles = req.user.titles || [];
        req.user.descriptions = req.user.descriptions || [];

        // Push new title and description to the user's arrays
        req.user.titles.push(newTitle);
        req.user.descriptions.push(newDescription);

        await req.user.save();

        res.render('dashboard', {
            username: req.user.username,
            titles: req.user.titles,
            descriptions: req.user.descriptions,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal error');
    }
});



function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Assuming you have the necessary middleware and setup for your routes
app.post('/dashboard/delete/all-titles-and-descriptions', requireAuth, async(req, res) => {
    try {
        // Clear the titles and descriptions arrays
        req.user.titles = [];
        req.user.descriptions = [];

        // Save the user object to persist the changes
        await req.user.save();

        // Redirect to the dashboard or send a success response
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal error');
    }
});
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});