export const RangeSliderInput = {
    view(vnode) {
        const percent1 = (vnode.attrs.left_value / vnode.attrs.max) * 100;
        const percent2 = (vnode.attrs.right_value / vnode.attrs.max) * 100;
        const gradient = `background: linear-gradient(to right, #e5e7eb ${percent1}%, #2563eb ${percent1}%, #2563eb ${percent2}%, #e5e7eb ${percent2}%)`;
        return m("div.range-slider-container",
            m("div.range-slider-track",
                {
                    style: gradient,
                    onmousedown: e => {
                        // Replicate native behavior of clicking on the track to set the value
                        const left_slider = e.target.parentElement.querySelector(".range-slider-left");
                        const right_slider = e.target.parentElement.querySelector(".range-slider-right");
                        const rect = e.target.getBoundingClientRect();
                        const click_pos = (e.clientX - rect.left) / rect.width;
                        const click_value = Math.round(click_pos * (vnode.attrs.max - vnode.attrs.min));
                        // Move nearest thumb
                        const dist_left = Math.abs(click_value - left_slider.value);
                        const dist_right = Math.abs(click_value - right_slider.value);
                        if (dist_left < dist_right) {
                            vnode.attrs.on_left_input(click_value);
                        } else {
                            vnode.attrs.on_right_input(click_value);
                        }
                    }
                }),
            m("input.range-slider-left",
                {
                    oninput: e => {
                        const left_slider = e.target;
                        let left_value = parseInt(left_slider.value);
                        const right_slider = left_slider.parentElement.querySelector(".range-slider-right");
                        const right_value = parseInt(right_slider.value);

                        // Prevent handles from crossing
                        if (left_value >= right_value) {
                            left_value = right_value - 1;
                        }

                        vnode.attrs.on_left_input(left_value);
                    },
                    type: "range",
                    min: vnode.attrs.min,
                    max: vnode.attrs.max,
                    value: vnode.attrs.left_value
                }),
            m("input.range-slider-right",
                {
                    oninput: e => {
                        const right_slider = e.target;
                        const right_value = parseInt(right_slider.value);
                        const left_slider = right_slider.parentElement.querySelector(".range-slider-left");
                        const left_value = parseInt(left_slider.value);

                        // Prevent handles from crossing
                        if (left_value >= right_value) {
                            vnode.attrs.on_left_input(right_value - 1);
                        }

                        vnode.attrs.on_right_input(right_value);
                    },
                    type: "range",
                    min: vnode.attrs.min,
                    max: vnode.attrs.max,
                    value: vnode.attrs.right_value
                }));
    }
}
