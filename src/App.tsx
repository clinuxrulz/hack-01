import { Application, Assets, Sprite, Texture } from "pixi.js";
import { Component, createSignal, onCleanup, onMount } from "solid-js";

const App: Component = () => {
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  const app = new Application();
  let babyMeltySprite: Sprite | undefined = undefined;
  let [ isLoading, setIsLoading, ] = createSignal(true);
  onMount(() => {
    let canvas2 = canvas();
    if (canvas2 == undefined) {
      return;
    }
    let fixCanvasSize = () => {
      let rect = canvas2.getBoundingClientRect();
      canvas2.width = rect.width;
      canvas2.height = rect.height;
    };
    fixCanvasSize();
    let resizeObserver = new ResizeObserver(() => {
      fixCanvasSize();
    });
    resizeObserver.observe(canvas2);
    onCleanup(() => {
      resizeObserver.unobserve(canvas2);
      resizeObserver.disconnect();
    });
    (async () => {
      let rect = canvas2.getBoundingClientRect();
      app.init({
        canvas: canvas2,
        background: "lightblue",
        width: rect.width,
        height: rect.height,
      });
      const babyMeltyTexture = await Assets.load<Texture>("./baby_melty.png");
      babyMeltySprite = new Sprite(babyMeltyTexture);
      babyMeltySprite.position.set(200, 200);
      app.stage.addChild(babyMeltySprite);
      app.ticker.add((time) => {
        /**
         * Just for fun, let's rotate mr rabbit a little.
         * Time is a Ticker object which holds time related data.
         * Here we use deltaTime, which is the time elapsed between the frame callbacks
         * to create frame-independent transformation. Keeping the speed consistent.
         */
        babyMeltySprite!.rotation += 0.1 * time.deltaTime;
      });
      setIsLoading(false);
    })();
  });
  return (
    <canvas
      ref={setCanvas}
      style={{
        "width": "100%",
        "height": "100%",
      }}
    />
  );
};

export default App;
