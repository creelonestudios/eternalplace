import API from "./api.mjs"
import { $ } from "./util.mjs"

// will be polled from server later
const width  = 20
const height = 20

const canvas = $("#place")

const mouse = {
	x: 0, y: 0
}

function draw() {
	console.log("draw!")
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight
	let ctx = canvas.getContext("2d")
	ctx.fillStyle = "#000000"
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	for(let i = 0; i < width; i++) {
		for(let j = 0; j < height; j++) {
			ctx.fillStyle = `rgb(${i*255/20}, 0, ${j*255/20})`
			ctx.fillRect(i*40, j*40, 40, 40)
		}
	}
	let x = Math.floor(mouse.x /width /2) *40
	let y = Math.floor(mouse.y /height /2) *40
	ctx.strokeStyle = `#ffffff`
	ctx.beginPath();
	ctx.rect(x-0.5, y-0.5, 40 +1, 40 +1);
	ctx.stroke();
}

requestAnimationFrame(draw)

window.addEventListener("resize", () => requestAnimationFrame(draw))
canvas.addEventListener("mousemove", e => {
	mouse.x = e.offsetX
	mouse.y = e.offsetY
	requestAnimationFrame(draw)
})
