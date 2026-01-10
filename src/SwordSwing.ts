export class SwordSwing {
  private swinging_: boolean = false;
  private swingTotalTime: number = 1.0;
  private swingArcSize = 45;
  faceAngle: number = 0.0;
  private t: number = 0.0;
  private angle_: number = 0.0;

  get swinging(): boolean {
    return this.swinging_;
  }

  get angle(): number {
    return this.angle_;
  }

  swing() {
    this.swinging_ = true;
    this.t = 0.0;
    this.update();
  }

  step(dt: number) {
    this.t += dt;
    if (this.t > this.swingTotalTime) {
      this.t = 0;
      this.swinging_ = false;
    }
    this.update();
  }

  private update() {
    this.angle_ = easeInOutQuad(
      this.t / this.swingTotalTime,
      this.faceAngle - 0.5 * this.swingArcSize,
      this.faceAngle + 0.5 * this.swingArcSize,
      1.0,
    );
  }
}

function easeInOutQuad(t: number, from: number, to: number, duration: number): number {
  let b = from;
  let c = to - from;
  let d = duration;
  if ((t/=d/2) < 1) return c/2*t*t + b;
  return -c/2 * ((--t)*(t-2) - 1) + b;
}
