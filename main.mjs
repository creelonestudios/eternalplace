import fs from "fs"
import https from "https"
import http from "http"
import express from "express";
import * as sqllib from "mysql-promise"
import config from "./config-loader.mjs"
import Canvas from "./canvas.mjs"
import { Server } from "socket.io";
import fetch from "node-fetch"
import cookieParser from "cookie-parser";

const canvas = new Canvas(20, 20)

const app = express();
let io;
let server;
if(config.usehttps) server = https.createServer(config.https, app);
else server = http.createServer(app);
io = new Server(server);

const sql = sqllib.default()
sql.configure(config.sql)

app.use(cookieParser());
app.use(express.static("htdocs")); // only for static files that dont change

if(config.usehttps) {
	// TODO: Add http redirect here

	server.listen(config.ports.https, () => {
		console.log("HTTPS Server is running on http://localhost:" + config.ports.https + "/");
	});
} else {
	console.warn("==== WARNING: HTTPS IS NOT ENABLED! ====");
	console.warn("IT IS HIGHLY RECOMMENDED TO ENABLE HTTPS");
	server.listen(config.ports.http, () => {
		console.log("Server is running on http://localhost:" + config.ports.http + "/");
	});
}

function loadPixels() {
	sql.query("SELECT * FROM canvas").spread(rows => {
		rows.forEach(row => {
			canvas.setPixel(row.x, row.y, row.color)
		})
	})
}

function createTables() {
	sql.query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20) NOT NULL, creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, lastdraw DATETIME)") // users table
	sql.query("CREATE TABLE IF NOT EXISTS history (id INT NOT NULL, x SMALLINT NOT NULL, y SMALLINT NOT NULL, date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, color CHAR(6) NOT NULL DEFAULT \"ffffff\")") // canvas history table
	sql.query("CREATE TABLE IF NOT EXISTS canvas (x SMALLINT NOT NULL, y SMALLINT NOT NULL, color CHAR(6) NOT NULL DEFAULT \"ffffff\")") // canvas current state table
}

createTables();
loadPixels();

app.post("/api/*", (req, res) => {
	console.log(`[${req.ip}] API Request: ${req.url}`)
	let data = []
  req.on("data", chunk => data.push(chunk)) // construct body
  req.on("end", async () => {
    data = Buffer.concat(data).toString()
    try {
      data = JSON.parse(data)
    } catch(err) {}
    console.log(req.url, "data:", data)
    res.setHeader("Content-Type", "application/json")

		let resdata = {status: {code: "unknown_error"}}
		if(req.url == "/api/test") {
			resdata.status.code = "success"
		} else if(req.url == "/api/place") {
			resdata.status.code = "success"
			resdata.data = {}
			resdata.data.width = canvas.width
			resdata.data.height = canvas.height
			console.log("hi")
			resdata.data.pixels = canvas.pixelArray()
			console.log(resdata.data.pixels)
		} else if(req.url == "/api/draw") {
			resdata.status.code = "success"
			canvas.setPixel(data.x, data.y, data.color)
			sql.query("INSERT INTO history (id, x, y, date, color) VALUES (0, ?, ?, NOW(), ?)", [data.x, data.y, data.color])
			sql.query("SELECT color FROM canvas WHERE x=? AND y=?", [data.x, data.y]).spread((current) => {
				if(current.length == 0) sql.query("INSERT INTO canvas (x, y, color) VALUES (?, ?, ?)", [data.x, data.y, data.color])
				else sql.query("UPDATE canvas SET color=? WHERE x=? AND y=?", [data.color, data.x, data.y])
			})
		} else {
			resdata.status.code = "unknown_node"
		}
		console.log(resdata)
		res.end(JSON.stringify(resdata))
  })
})

function randomState() {
	let state = "";
	for(let i = 0; i < 32; i++) {
		state += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
	}
	return state;
}

app.get("/auth", (req, res) => { // ! make the random string actually random
	const state = randomState();
	res.cookie("state", state);
	res.redirect(`https://www.reddit.com/api/v1/authorize?client_id=${config.reddit.client_id}&response_type=code&state=${state}&redirect_uri=${config.reddit.redirect_uri}&duration=temporary&scope=mysubreddits`);
})

app.get("/reddit", (req, res) => {
	if(!req.cookies.state) return res.redirect("/auth");
	if(req.query.state !== req.cookies.state) return res.send("Invalid state");
	if(!req.query.code) return res.send("No code");
	// res.send(req.query.code);
	fetch("https://www.reddit.com/api/v1/access_token", {
		method: "POST",
		body: `grant_type=authorization_code&code=${req.query.code}&redirect_uri=${config.reddit.redirect_uri}`,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": "Basic " + btoa(config.reddit.client_id + ":" + config.reddit.client_secret)
		}
	})
	.then(token => token.json())
	.then(token => {
		if(token.token_type !== "bearer") return res.send("Invalid token type");
		if(!token.access_token) return res.send("No access token");
		// res.send(res.access_token);
		res.clearCookie("state");
		res.redirect("/reddittest?token=" + token.access_token);
	})
});

async function getRedditsPaged(token, after) {
	const subs = await fetch("https://oauth.reddit.com/subreddits/mine/subscriber/?after=" + after, {
		headers: {
			"Authorization": "bearer " + token
		}
	})
	.then(subs => subs.json())

	return {
		after: subs.data.after,
		subs: subs.data.children.map(sub => sub.data.display_name)
	}
}

async function getReddits(token) {
	let subs = [];

	let after = null;
	while(true) {
		let data = await getRedditsPaged(token, after);
		subs = subs.concat(data.subs);
		if(data.after == null) break;
		after = data.after;
	}

	return subs;
}

app.get("/redditsubs", async (req, res) => {
	if(!req.query.token) return res.send("No token");
	
	let subs = await getReddits(req.query.token);
	res.send(subs);
})

io.on("connection", (sock) => {
	console.log("🧦")
	sock.on("draw", (data) => {
    console.log("User is drawing", data);
		io.emit("draw", data);
  });
})
