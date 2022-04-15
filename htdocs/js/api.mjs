export default class API {

	static test(username, x, y, color) {
    console.log("test", {username, x, y, color})
    return fetch("/api/test", {
      method: "POST",
      body: JSON.stringify({username, x, y, color})
    }).then(res => res.json())
    .catch(console.error)
  }

	static place(token) {
		console.log("place", {token})
    return fetch("/api/place", {
      method: "POST",
      body: JSON.stringify({token})
    }).then(res => res.json())
    .catch(console.error)
	}

  static draw(x, y, color, token) {
    return fetch("/api/draw", {
      method: "POST",
      body: JSON.stringify({x, y, color, token})
    }).then(res => res.json())
    .catch(console.error);
  }

}
