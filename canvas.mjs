export default class Canvas {

	#pixels; #width; #height
	constructor(width, height) {
		this.#pixels = new Map()
		this.#width  = width
		this.#height = height
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
	}

	pixelArray() {
		let arr = []
		for(let x = 0; x < this.#width; x++) {
			for(let y = 0; y < this.#height; y++) {
				arr.push(this.getPixel(x, y))
			}
		}
		return arr
	}

}
