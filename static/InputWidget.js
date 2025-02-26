export const InputWidget = {
    view(vnode) {
        const input_el = m("input", vnode.attrs);
        return m("span",
            input_el,
            m("button.input-clear-button", {
                onclick: e => {
                    if (vnode.attrs.set_value) {
                        vnode.attrs.set_value();
                    } else {
                        input_el.dom.value = "";
                    }
                }
            }, "🗙"));
    }
};
