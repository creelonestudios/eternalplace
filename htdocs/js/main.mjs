import API from "./api.mjs"
import { $ } from "./util.mjs"
import Dialog from "./dialog.mjs";

let width   = 0
let height  = 0
let zoom    = 1
let offsetX = 0
let offsetY = 0
const sock  = io();
let authed  = false;

let authDialog = new Dialog("#authdialog").hideButton("#authdialog-hide").disappear();

const canvas = $("#place")

const mouse = {
	x: 0, y: 0, pressed: false, drag: false, pressTime: -1
}

let pixels = []

API.place().then(o => {
	if(o.status.code != "success") {
		console.log(o.status)
		return
	}
	console.log(o.data)
	width   = o.data.width  || 0
	height  = o.data.height || 0
	pixels  = o.data.pixels
	offsetX = o.data.width /2
	offsetY = o.data.height/2

	requestAnimationFrame(draw)
})

// for benchmarking
//let drawingTime = 0
//let frames      = 0

function draw() {
	//let time = Date.now()
	// console.log("draw!", width, height)
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight
	let pixelsize = 40*zoom
	let offX = Math.floor((offsetX-width)  * pixelsize + canvas.width /2)
	let offY = Math.floor((offsetY-height) * pixelsize + canvas.height/2)
	let ctx = canvas.getContext("2d")
	ctx.fillStyle = "#404040"
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.translate(offX, offY) // offset/zoom and centering
	let fromX = Math.max(Math.floor((width*pixelsize  - ((offsetX)*pixelsize) - canvas.width /2) / pixelsize), 0)
	let fromY = Math.max(Math.floor((height*pixelsize - ((offsetY)*pixelsize) - canvas.height/2) / pixelsize), 0)
	let toX   = Math.ceil((width*pixelsize  - ((offsetX)*pixelsize) + canvas.width /2) / pixelsize)
	let toY   = Math.ceil((height*pixelsize - ((offsetY)*pixelsize) + canvas.height/2) / pixelsize)
	//console.log(fromX, toX, fromY, toY)
	//return
	if(toX < fromX || toY < fromY || toX == Infinity || toY == Infinity) return
	/*let fromX = 0
	let fromY = 0
	let toX = width
	let toY = height // */
	for(let x = fromX; x < toX && x < width; x++) {
		for(let y = fromY; y < toY && y < height; y++) {
			let i = y * width + x
			ctx.fillStyle = "#" + pixels[i]
			ctx.fillRect(x * pixelsize, y * pixelsize, pixelsize, pixelsize)
		}
	}
	if(zoom >= 0.5) {
		let {x, y} = getMousePixel()
		ctx.strokeStyle = `#808080`
		ctx.beginPath()
		ctx.rect(x-0.5, y-0.5, pixelsize +1, pixelsize +1)
		ctx.stroke()
	}
	//drawingTime += Date.now() - time
	//frames++
	//console.log("draw avg:", drawingTime / frames)
}

function getCookie(name) {
	let value = "; " + document.cookie;
	let parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

const COLORS = ["00ccc0", "e4abff", "009eaa", "5eb3ff", "6a5cff", "004b6f", "de0a7f", "6d001a", "333434", "fff8b8", "313ac1", "00cc4e", "6d302f", "b44ac0", "ff2651", "ffb446", "9c451a", "d4d7d9", "7eed38", "598d5a", "00a344", "245aea", "ff63aa", "ffa800", "511e9f", "33e9f4", "be0027", "ffd623", "1832a4", "ff2d00", "ffffff", "000000"];
let selectedColor = "000000"

populateColorPicker();

function populateColorPicker() {
	let picker = $("#picker")
	for(let i = 0; i < COLORS.length; i++) {
		let color = COLORS[i]
		let div = document.createElement("div")
		div.className = "color"
		div.style.backgroundColor = "#" + color
		div.addEventListener("click", () => {
			selectedColor = color
		})
		picker.appendChild(div)
	}
	let div = document.createElement("input")
	div.className = "color"
	div.type = "color"
	div.addEventListener("change", () => {
		selectedColor = div.value.substr(1)
	})
	picker.appendChild(div)
}

window.addEventListener("resize", () => requestAnimationFrame(draw))
canvas.addEventListener("mousemove", e => {
	if(mouse.pressed && (Date.now() - mouse.pressTime) > 100) { // prevent tiny mouse movements from causing drag
		mouse.drag = true
		offsetX += e.movementX / (40*zoom)
		offsetY += e.movementY / (40*zoom)
		if(offsetX < 0) offsetX = 0
		if(offsetY < 0) offsetY = 0
		if(offsetX > width)  offsetX = width
		if(offsetY > height) offsetY = height
	}
	mouse.x = e.offsetX
	mouse.y = e.offsetY
	if(zoom >= 0.5 || mouse.drag) requestAnimationFrame(draw)
})
canvas.addEventListener("mousewheel", async e => {
	let before = zoom
	if(e.deltaY > 0 && zoom > Math.max(20 / Math.min(width, height), 0.1)) zoom *= 0.5
	else if(e.deltaY < 0 && zoom < 4) zoom *= 2
	else return

	console.log(zoom, before);
	if(zoom < 0.5) {
		if($("#picker")) {
			$("#picker").id = "picker-hide";
			await new Promise(resolve => setTimeout(resolve, 500));
			$("#picker-hide").style.display = "none"
		}
	} else {
		if($("#picker-hide")) {
			$("#picker-hide").style.display = ""
			canvas.height = 1
			$("#picker-hide").id = "picker";
		}
	}

	if(zoom != before) requestAnimationFrame(draw)
}, { passive: true})
window.addEventListener("mousedown", e => {
	mouse.pressed = true
	mouse.pressTime = Date.now()
})
window.addEventListener("mouseup", e => {
	mouse.pressed = false
	if(mouse.drag || zoom < 0.5) {
		mouse.drag = false
		return
	}
	let {x, y} = getMousePixel(e.offsetX, e.offsetY, false)
	if(x < 0 || y < 0 || x >= width || y >= height) return
	let i = y * width + x
	if(!authed) {
		authDialog.show();
		return;
	}
	pixels[i] = selectedColor
	API.draw(x, y, selectedColor, getCookie("token")).then(o => {
		if(o.status.code != "success") {
			console.log(o.status)
			return
		}
	});
	sock.emit("draw", {x, y, color: selectedColor});
})

window.m = mouse

function getMousePixel(x, y, scale = true) {
	x = x || mouse.x
	y = y || mouse.y
	let pixelsize = 40*zoom
	let offX = (offsetX-width)  * pixelsize + canvas.width /2
	let offY = (offsetY-height) * pixelsize + canvas.height/2
	return {
		x: Math.floor((mouse.x - offX) / (40*zoom)) * (scale ? 40*zoom : 1),
		y: Math.floor((mouse.y - offY) / (40*zoom)) * (scale ? 40*zoom : 1)
	}
}

sock.on("draw", function(data) {
	let x = data.x
	let y = data.y
	let color = data.color
	let i = y * width + x
	pixels[i] = color
	let ctx = canvas.getContext("2d")
	ctx.fillStyle = "#" + pixels[i]
	ctx.fillRect(x * 40*zoom, y * 40*zoom, 40*zoom, 40*zoom)
	console.log("someone drew");
});

sock.on("auth", (data) => {
	if(data.status.code == "invalid_token") {
		// not logged in
		console.log("not logged in");
		$("#auth").innerHTML = "<a href='/auth'>Log in using Reddit</a>"
	} else if(data.status.code == "success") {
		// logged in, may draw now
		console.log("logged in")
		$("#auth").innerText = "Logged in as " + data.username
		authed = true;
	} else {
		// unknown error
		console.log("unknown error")
		$("#auth").innerHTML = "<a href='/auth'>Relog using Reddit</a>"
	}
})

if(getCookie("token")) {
	$("#auth").innerText = "Authenticating..."
	sock.emit("auth", getCookie("token"));
}

canvas.addEventListener("contextmenu", e => {
	e.preventDefault()
})
