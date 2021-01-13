export default class Rect {
  top = 0;

  left = 0;

  bottom = 0;

  right = 0;

  get width() {
    return this.right - this.left;
  }

  get height() {
    return this.bottom - this.top;
  }
}
