import fs from "fs"
import https from "https"
import express from "express";
import * as sqllib from "mysql"
import config from "./config-loader.mjs"

const app = express();
let httpsServer;
if(config.usehttps) httpsServer = https.createServer(config.https, app);

const sql = sqllib.createConnection(config.sql)

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

sql.connect(e => {
	if(e) {
		console.error(e)
		process.kill(1) // exit if connect fails
	}

	sql.query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20) NOT NULL, creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, lastdraw DATETIME)") // users table
	sql.query("CREATE TABLE canvas (id INT NOT NULL, x SMALLINT NOT NULL, y SMALLINT NOT NULL, date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, color CHAR(6) NOT NULL DEFAULT \"ffffff\")") // canvas table
})
