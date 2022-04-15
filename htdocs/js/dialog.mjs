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

  disappear() {
    this.el.style.display = "none";
    $("#darken").style.display = "none";
    return this;
  }

  async hide() {
    this.el.style.display = "none";
    $("#darken").id = "darkenOut";
    await new Promise(resolve => setTimeout(resolve, 500));
    $("#darkenOut").id = "darken";
    $("#darken").style.display = "none";
    return this;
  }

  hideButton(sel) {
    $(sel).addEventListener("click", () => this.hide());
    return this;
  }

}