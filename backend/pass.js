const bcrypt = require("bcryptjs");

const password = "HTBBUGXPLOIT";
bcrypt.hash(password, 10, (err, hash) => {
    console.log("Hashed Password:", hash);
});
