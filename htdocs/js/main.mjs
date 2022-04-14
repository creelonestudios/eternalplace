import API from "./api.mjs"
import { $ } from "./util.mjs"

let width  = 0
let height = 0
const sock = io();

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
	ctx.fillStyle = "#404040"
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
}

// function drawColorPicker(ctx) {
// 	const PICKER_HEIGHT = 70;
// 	ctx.fillStyle = "#ffffff";
// 	ctx.fillRect(0, canvas.height-PICKER_HEIGHT, canvas.width, PICKER_HEIGHT);
// 	for(let i = 0; i < COLORS.length; i++) {
// 		ctx.fillStyle = COLORS[i];
// 		ctx.fillRect(i*(canvas.width/COLORS.length), canvas.height-PICKER_HEIGHT, (canvas.width/COLORS.length)-1, PICKER_HEIGHT);
// 	}
// }

window.addEventListener("resize", () => requestAnimationFrame(draw))
canvas.addEventListener("mousemove", e => {
	mouse.x = e.offsetX
	mouse.y = e.offsetY
	requestAnimationFrame(draw)
})
canvas.addEventListener("click", e => {
	let x = Math.floor(e.offsetX /40)
	let y = Math.floor(e.offsetY /40)
	if(x >= width || y >= height) return
	let i = y * width + x
	pixels[i] = selectedColor
	API.draw(x, y, selectedColor).then(o => {
		if(o.status.code != "success") {
			console.log(o.status)
			return
		}
	});
	sock.emit("draw", {x, y, color: selectedColor});
	requestAnimationFrame(draw)
})

sock.on("draw", function(data) {
	let x = data.x
	let y = data.y
	let color = data.color
	let i = y * width + x
	pixels[i] = color
	requestAnimationFrame(draw)
	console.log("someone drew");
});

canvas.addEventListener("contextmenu", e => {
	e.preventDefault()
})
