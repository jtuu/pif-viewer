export const debounce = (ms, f) => {
    let lastValue = null;
    let timer = null;

    const callback = () => {
        f(lastValue);
        m.redraw();
    };

    return event => {
        lastValue = event;
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
        if (event && typeof event === "object") event.redraw = false;
    };
}
