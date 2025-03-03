export const ConfirmingButton = {
    clicked_once: false,
    view(vnode) {
        const { onconfirm, label, confirm_label = "Confirm?" } = vnode.attrs;
        const class_name = vnode.state.clicked_once
            ? "confirming-button confirming-button-confirm"
            : "confirming-button";
        const text = vnode.state.clicked_once ? confirm_label : label;

        return m("button", {
            ...vnode.attrs,
            className: class_name,
            onclick: e => {
                if (vnode.state.clicked_once) {
                    onconfirm(e);
                    vnode.state.clicked_once = false;
                } else {
                    vnode.state.clicked_once = true;
                }
            },
            onmouseleave: e => {
                vnode.state.clicked_once = false;
            }
        }, text);
    }
};
