export default class API {

	static test(username, x, y, color) {
    console.log("test", {username, x, y, color})
    return fetch("/api/test", {
      method: "POST",
      body: JSON.stringify({username, x, y, color})
    }).then(res => res.json())
    .catch(console.error)
  }

}