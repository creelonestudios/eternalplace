import API from "./api.mjs"
import { $ } from "./util.mjs"

let width  = 0
let height = 0

const canvas = $("#place")

const mouse = {
	x: 0, y: 0
}

let pixels = []

API.place().then(o => {
	if(o.status.code != "success") {
		console.log(o.status)
		return
	}
	console.log(o.data)
	width  = o.data.width  || 0
	height = o.data.height || 0
	pixels = o.data.pixels

	requestAnimationFrame(draw)
})

function draw() {
	console.log("draw!", width, height)
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight
	let ctx = canvas.getContext("2d")
	ctx.fillStyle = "#000000"
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	for(let x = 0; x < width; x++) {
		for(let y = 0; y < height; y++) {
			let i = y * width + x
			ctx.fillStyle = "#" + pixels[i]
			ctx.fillRect(x*40, y*40, 40, 40)
		}
	}
	let x = Math.floor(mouse.x /40) *40
	let y = Math.floor(mouse.y /40) *40
	ctx.strokeStyle = `#ffffff`
	ctx.beginPath()
	ctx.rect(x-0.5, y-0.5, 40 +1, 40 +1)
	ctx.stroke()
}

window.addEventListener("resize", () => requestAnimationFrame(draw))
canvas.addEventListener("mousemove", e => {
	mouse.x = e.offsetX
	mouse.y = e.offsetY
	requestAnimationFrame(draw)
})
