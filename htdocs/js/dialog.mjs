import { $ } from "./util.mjs";

export default class Dialog {

  el;

  constructor(sel) {
    this.el = $(sel);
  }

  show() {
    this.el.style.display = "";
    $("#darken").style.display = "";
    return this;
  }

  hide() {
    this.el.style.display = "none";
    $("#darken").style.display = "none";
    return this;
  }

  hideButton(sel) {
    $(sel).addEventListener("click", () => this.hide());
    return this;
  }

}