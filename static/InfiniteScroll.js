export const InfiniteScroll = {
    oncreate(vnode) {
        const { load_more, has_more } = vnode.attrs;

        vnode.state.observer = new IntersectionObserver(entries => {
            const sentinel = entries[0];
            if (sentinel.isIntersecting && has_more) {
                load_more();
            }
        }, { root: null, threshold: 1 });

        vnode.state.observer.observe(vnode.dom);
    },
    onremove(vnode) {
        vnode.state.observer.disconnect();
    },
    view() {
        return m(".scroll-sentinel", { style: { height: "10px" } });
    }
};
