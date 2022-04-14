import fs from "fs"
import https from "https"
import express from "express";
import * as sqllib from "mysql-promise"
import config from "./config-loader.mjs"
import Canvas from "./canvas.mjs"

const canvas = new Canvas(20, 20)

const app = express();
let httpsServer;
if(config.usehttps) httpsServer = https.createServer(config.https, app);

const sql = sqllib.default()
sql.configure(config.sql)

app.use(express.static("htdocs")); // only for static files that dont change

if(config.usehttps) {
	// TODO: Add http redirect here

	httpsServer.listen(config.ports.https, () => {
		console.log("HTTPS Server is running on http://localhost:" + config.ports.https + "/");
	});
} else {
	console.warn("==== WARNING: HTTPS IS NOT ENABLED! ====");
	console.warn("IT IS HIGHLY RECOMMENDED TO ENABLE HTTPS");
	app.listen(config.ports.http, () => {
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
