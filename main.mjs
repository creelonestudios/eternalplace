import fs from "fs"
import https from "https"
import express from "express";

const app = express();
let httpsServer;
if(USEHTTPS) httpsServer = https.createServer({cert: CERTPATH,key: KEYPATH}, app);

app.use(express.static("public")); // only for static files that dont change

// app.get("/", (req, res) => {
// 	res.send("Hello world!");
// })

if(USEHTTPS) {
	// TODO: Add http redirect here

	httpsServer.listen(HTTPSPORT, () => {
		console.log("HTTPS Server is running on http://localhost:" + HTTPSPORT + "/");
	});
} else {
	console.warn("==== WARNING: HTTPS IS NOT ENABLED! ====");
	console.warn("IT IS HIGHLY RECOMMENDED TO ENABLE HTTPS");
	app.listen(PORT, () => {
		console.log("Server is running on http://localhost:" + PORT + "/");
	});
}