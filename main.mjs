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
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const canvas = new Canvas(200, 200)

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
	sql.query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20) NOT NULL UNIQUE, creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, lastaction DATETIME, token VARCHAR(100) NOT NULL)") // users table
	sql.query("CREATE TABLE IF NOT EXISTS history (id INT NOT NULL, x SMALLINT NOT NULL, y SMALLINT NOT NULL, date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, color CHAR(6) NOT NULL DEFAULT \"ffffff\")") // canvas history table
	sql.query("CREATE TABLE IF NOT EXISTS canvas (x SMALLINT NOT NULL, y SMALLINT NOT NULL, color CHAR(6) NOT NULL DEFAULT \"ffffff\")") // canvas current state table
	sql.query("CREATE TABLE IF NOT EXISTS zones (id INT AUTO_INCREMENT NOT NULL PRIMARY KEY, name VARCHAR(20) NOT NULL, creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, position JSON NOT NULL)") // canvas current state table
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
			resdata.data.pixels = canvas.pixelArray()
			if(data.token) {
				const user = await spread(sql.query("SELECT * FROM users WHERE token = ?", [data.token]))
				if(user.length > 0) {
					resdata.data.lastaction = user[0].lastaction.getTime()
				}
			}
		} else if(req.url == "/api/draw") {
			resdata.status.code = "success"
			if(!data.token) {
				resdata.status.code = "invalid_token"
				resdata.status.message = "No token provided"
				return;
			}
			const user = await spread(sql.query("SELECT * FROM users WHERE token = ?", [data.token]));
			if(user.length == 0) {
				resdata.status.code = "invalid_token"
				resdata.status.message = "Invalid token"
				return;
			}
			let t = user[0].lastaction.getTime()
			//console.log(Date.now(), t, Date.now() -t)
			if(Date.now() - t < 5*60*1000) { // 5 minutes
				resdata.status.code = "timeout"
				resdata.status.message = "You have to wait 5 minutes."
				resdata.data = {lastaction: t}
			} else {
				canvas.setPixel(data.x, data.y, data.color)
				sql.query("INSERT INTO history (id, x, y, date, color) VALUES (0, ?, ?, NOW(), ?)", [data.x, data.y, data.color])
				sql.query("SELECT color FROM canvas WHERE x=? AND y=?", [data.x, data.y]).spread((current) => {
					if(current.length == 0) sql.query("INSERT INTO canvas (x, y, color) VALUES (?, ?, ?)", [data.x, data.y, data.color])
					else sql.query("UPDATE canvas SET color=? WHERE x=? AND y=?", [data.color, data.x, data.y])
				})
				sql.query("UPDATE users SET lastaction=NOW() WHERE token=?", [data.token])
				io.emit("draw", data);
				resdata.data = {lastaction: Date.now()}
			}
		} else {
			resdata.status.code = "unknown_node"
		}
		console.log(resdata)
		res.end(JSON.stringify(resdata))
  })
})

async function spread(p) {
	return new Promise((resolve, reject) => {
		p.spread(data => {
			resolve(data)
		});
	});
}

function randomState() {
	let state = "";
	for(let i = 0; i < 32; i++) {
		state += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
	}
	return state;
}

app.get("/auth", (req, res) => {
	const state = randomState();
	res.cookie("state", state);
	res.redirect(`https://www.reddit.com/api/v1/authorize?client_id=${config.reddit.client_id}&response_type=code&state=${state}&redirect_uri=${config.reddit.redirect_uri}&duration=temporary&scope=mysubreddits%20identity`);
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
	.then(async token => {
		if(token.token_type !== "bearer") return res.send("Invalid token type");
		if(!token.access_token) return res.send("No access token");
		// res.send(res.access_token);
		res.clearCookie("state");
		res.cookie("token", token.access_token);
		await sql.query("INSERT INTO users (username, creation, token) VALUES (?, NOW(), ?) ON DUPLICATE KEY UPDATE token=?;" , [await getRedditUsername(token.access_token), token.access_token, token.access_token]);
		res.redirect("/");
	})
});

app.get("/place.png", (req, res) => {
	res.setHeader("Content-Type", "image/png")
	res.end(canvas.image())
})

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

async function getRedditUsername(token) {
	const user = await fetch("https://oauth.reddit.com/api/v1/me", {
		headers: {
			"Authorization": "bearer " + token
		}
	})
	.then(user => user.json())

	return user.name;
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

app.get("*", (req, res) => {
	res.sendFile(__dirname + "/404.html");
})

io.on("connection", (sock) => {
	console.log("🧦")
	let authed = false;
	sock.on("auth", async (token) => {
		const user = await spread(sql.query("SELECT * FROM users WHERE token = ?", [token]));
		if(user.length == 0) {
			sock.emit("auth", {
				status: {
					code: "invalid_token",
					message: "Invalid token"
				}
			});
			return;
		}
		authed = true;
		sock.emit("auth", {
			status: {
				code: "success",
				message: "Success"
			},
			username: await getRedditUsername(token)
		});
	});
})
