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
	// console.log("draw!", width, height)
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
	drawColorPicker(ctx);
}

const COLORS = ["#00ccc0", "#e4abff", "#009eaa", "#5eb3ff", "#6a5cff", "#004b6f", "#de0a7f", "#6d001a", "#333434", "#fff8b8", "#313ac1", "#00cc4e", "#6d302f", "#b44ac0", "#ff2651", "#ffb446", "#9c451a", "#d4d7d9", "#7eed38", "#598d5a", "#00a344", "#245aea", "#ff63aa", "#ffa800", "#511e9f", "#33e9f4", "#be0027", "#ffd623", "#1832a4", "#ff2d00", "#ffffff", "#000000"];

function drawColorPicker(ctx) {
	const PICKER_HEIGHT = 70;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, canvas.height-PICKER_HEIGHT, canvas.width, PICKER_HEIGHT);
	for(let i = 0; i < COLORS.length; i++) {
		ctx.fillStyle = COLORS[i];
		ctx.fillRect(i*(canvas.width/COLORS.length), canvas.height-PICKER_HEIGHT, (canvas.width/COLORS.length)-1, PICKER_HEIGHT);
	}
}

window.addEventListener("resize", () => requestAnimationFrame(draw))
canvas.addEventListener("mousemove", e => {
	mouse.x = e.offsetX
	mouse.y = e.offsetY
	requestAnimationFrame(draw)
})
canvas.addEventListener("click", e => {
	const arri = (Math.ceil(mouse.y / 40) * width - width) +
								Math.ceil(mouse.x / 40) - 1 // i have no idea why i have to subtract 1 here and subtract width above. But it works so whatever
	if(pixels[arri] == "ffffff") pixels[arri] = "000000"
	else pixels[arri] = "ffffff"
	requestAnimationFrame(draw)
})
