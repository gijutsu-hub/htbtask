require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const cron = require("node-cron");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3001;

// Configure AWS SDK for DynamoDB
AWS.config.update({
    region: "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

const docClient = new AWS.DynamoDB.DocumentClient();

app.use(cors({ credentials: true, origin: "http://localhost:5500" }));
app.use(bodyParser.json());
app.use(express.static("public"));

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Store active cron jobs
const activeCronJobs = {};

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const params = {
        TableName: "UsersTable",
        Key: { username }
    };

    try {
        const { Item } = await docClient.get(params).promise();
        if (!Item) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, Item.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT Token
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });

        // Store Session in DynamoDB
        const sessionParams = {
            TableName: "SessionTable",
            Item: {
                username,
                token,
                expiresAt: Math.floor(Date.now() / 1000) + 3600 // 1-hour expiration (UNIX timestamp)
            }
        };
        await docClient.put(sessionParams).promise();

        res.json({ message: "Login successful", token, redirect: "/" });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 🔹 **Authentication Middleware**
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check session in DynamoDB
        const params = {
            TableName: "SessionTable",
            Key: { username: decoded.username }
        };

        const { Item } = await docClient.get(params).promise();
        if (!Item || Item.token !== token) {
            return res.status(401).json({ message: "Unauthorized: Invalid session" });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
};

// 🔹 **Verify Session & Create Cron Job**
app.post("/verify-session-and-create-cron", authenticate, async (req, res) => {
    const { cronSchedule = "*/5 * * * *", custom_command } = req.body;

    if (!custom_command) {
        return res.status(400).json({ message: "Custom command is required" });
    }

    // Ensure scripts directory exists
    const scriptDir = "./scripts";
    if (!fs.existsSync(scriptDir)) {
        fs.mkdirSync(scriptDir, { recursive: true });
    }

    // Create the shell script
    const scriptPath = `/home/bugxploit/Desktop/htbtask/backend/scripts/${req.user.username}_task.sh`; // Update for your system
    const scriptContent = `#!/bin/bash\nexec /bin/bash -c '${custom_command}'`;

    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, "755");

    // Prepare cron command
    const cronJob = `${cronSchedule} /bin/bash ${scriptPath} >> /tmp/cron_debug.log 2>&1`;

    // Add the cron job
    exec(`(crontab -l 2>/dev/null; echo "${cronJob}") | crontab -`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error adding cron job: ${error.message}`);
            return res.status(500).json({ message: "Failed to add cron job" });
        }

        console.log(`Cron job added for ${req.user.username}: ${cronJob}`);
        res.json({
            message: `Cron job created successfully for ${req.user.username}`,
            cronSchedule,
            custom_command
        });
    });
});


// 🔹 **Admin Dashboard Route (Protected)**
app.get("/dashboard", authenticate, (req, res) => {
    res.json({ message: `Welcome, ${req.user.username}`, username: req.user.username });
});

// 🔹 **Logout Route - Securely Remove Session**
app.post("/logout", authenticate, async (req, res) => {
    try {
        // Remove session from DynamoDB
        const params = {
            TableName: "SessionTable",
            Key: { username: req.user.username }
        };

        await docClient.delete(params).promise();

        // Stop and delete cron job
        if (activeCronJobs[req.user.username]) {
            activeCronJobs[req.user.username].stop();
            delete activeCronJobs[req.user.username];
        }

        res.json({ message: "Logged out successfully", redirect: "/" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
