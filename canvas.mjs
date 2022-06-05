import canvaslib from "canvas"

export default class Canvas {

	#pixels; #width; #height; #canvas
	constructor(width, height) {
		this.#pixels = new Map()
		this.#width  = width
		this.#height = height
		this.#canvas = canvaslib.createCanvas(width, height)
		let ctx = this.#canvas.getContext("2d")
		ctx.fillStyle = "#ffffff"
		ctx.fillRect(0, 0, width, height)
	}

	get width() {
		return this.#width
	}

	get height() {
		return this.#height
	}

	set width(w) {
		if(w > this.#width) this.#width = w
	}

	set height(h) {
		if(h > this.#height) this.#height = h
	}

	getPixel(x, y) {
		if(x < 0 || y < 0 || x >= this.#width || y >= this.#height) return null
		if(this.#pixels.has(`${x};${y}`)) {
			return this.#pixels.get(`${x};${y}`)
		}
		return "ffffff" // white
	}

	setPixel(x, y, color) {
		if(x < 0 || y < 0 || x >= this.#width || y >= this.#height) return
		this.#pixels.set(`${x};${y}`, color)
		let ctx = this.#canvas.getContext("2d")
		ctx.fillStyle = "#" + color
		ctx.fillRect(x, y, 1, 1)
	}

	pixelArray() {
		let arr = []
		for(let y = 0; y < this.#height; y++) {
			for(let x = 0; x < this.#width; x++) {
				arr.push(this.getPixel(x, y))
			}
		}
		return arr
	}

	image(scale) {
		if(!isNaN(scale) && scale != 1 && scale >= 0.5 && scale <= 8) {
			return scaleCanvas(this.#canvas, scale, this.#pixels).toBuffer()
		}
		return this.#canvas.toBuffer()
	}

}

function scaleCanvas(source, scale, pixels) {
	let cnv = canvaslib.createCanvas(source.width * scale, source.height * scale)
	let ctx = cnv.getContext("2d")
	for(let x = 0; x < source.width; x++) {
		for(let y = 0; y < source.height; y++) {
			if(!pixels.has(`${x};${y}`)) continue
			ctx.fillStyle = "#" + pixels.get(`${x};${y}`)
			ctx.fillRect(x * scale, y * scale, scale, scale)
		}
	}
	return cnv
}
