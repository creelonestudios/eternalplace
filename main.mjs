import fs from "fs"
import https from "https"
import express from "express";
import config from "./config-loader.mjs"

const app = express();
let httpsServer;
if(config.usehttps) httpsServer = https.createServer(config.https, app);

app.use(express.static("public")); // only for static files that dont change

// app.get("/", (req, res) => {
// 	res.send("Hello world!");
// })

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