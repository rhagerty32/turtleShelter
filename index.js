// Import required modules
let express = require("express");
let path = require("path");
let session = require("express-session");

// Initialize the Express application
let app = express();

// Set the port (use environment variable or default to 3000)
const port = process.env.PORT || 3000;

// Import configuration and routes
const knex = require("./config/db"); // Database connection
let pagesRouter = require("./routes/pageRoutes"); // Pages router for navigation

// Set the view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JavaScript, images) from the "public" folder
// Example usage in views: <link rel="stylesheet" href="/styles.css">
app.use(express.static("public"));

// Configure session management
app.use(
    session({
        secret: "abc123", // Secret used to sign the session ID cookie
        resave: false, // Do not save session if unchanged
        saveUninitialized: true, // Save uninitialized sessions
    })
);

// Middleware to check if the user is authenticated
app.use((req, res, next) => {
    req.isAuthenticated = () => req.session.authenticated; // Define isAuthenticated method 
    next();
});

app.get("/login", (req, res) => {
    res.render("pages/login", {
        originalUrl: req.session.originalUrl || "/",
    });
});

// Middleware to fetch events data and attach it to the request object before routing
app.use((req, res, next) => {
    if (req.path === '/events') {
        knex('events')
            .select()
            .orderBy('date', 'desc')
            .then(events => {
                req.events = events;
                next();
            })
            .catch(error => {
                console.error('Error querying database:', error);
                res.status(500).send('Internal Server Error');
            });
    } else if (req.path === '/volunteers') {
        knex('volunteer')
            .select()
            .orderBy('lastname', 'desc')
            .then(volunteers => {
                req.volunteers = volunteers;
                next();
            })
            .catch(error => {
                console.error('Error querying database:', error);
                res.status(500).send('Internal Server Error');
            });
    } else {
        next();
    }
});

// the routes are imported as pagesRouter and defined in /routes/pageRoutes.js
// example: if we get a request to /home, the pagesRouter will handle it and render the home page
app.use("/", pagesRouter);

let authenticated = false;

app.post("/login", async (req, res) => {
    const username = req.body.username.toLowerCase();
    const password = req.body.password.toLowerCase();
    const originalUrl = req.body.originalUrl || "/";
    try {
        // Query the user table to find the record
        const user = await knex("users")
            .select("*")
            .where({ username, password }) // Replace with hashed password comparison in production
            .first(); // Returns the first matching record

        if (user) {
            req.session.authenticated = true;
            req.session.user = {
                username: user.username,
                email: user.email,
                fullName: user.full_name, // Assuming the column name is full_name
            };
            res.redirect(originalUrl);
        } else {
            req.session.authenticated = false;
            res.redirect("/login");
        }
    } catch (error) {
        res.status(500).send("Database query failed: " + error.message);
    }
});

app.get('/events', (req, res) => {
    knex('events')
        .select(
            'email',
            'firstName',
            'lastName',
            'skillid',
            'city',
            'state',
            'availability',
            'discoveryMethod',
            'notes'
        )
        .orderBy('lastname', 'desc')
        .then(events => {
            res.render('layout', {
                title: "Events",
                page: "events",
                events: events
            });
        })
        .catch(error => {
            console.error('Error querying database:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.listen(port, () => {
    console.log("Listening on port " + port);
    console.log(`Click here to open: http://localhost:${port}`);
});
