'use strict';

(() => {
    const actions = window.energyFlowViewActions;
    const navigation = document.getElementById('view-navigation');
    const picker = document.getElementById('view-picker');
    const management = document.getElementById('view-management');
    const liveLink = document.getElementById('view-live-link');
    const frameView = document.getElementById('frame_view');

    function refresh() {
        const views = actions.views;
        navigation.hidden = !views.length || (!management && views.length === 1);
        picker.replaceChildren(...views.map(view => new Option(view.name || translateWord('view_default'), view.id)));
        picker.value = actions.activeId;
        if (management) {
            management.setAttribute('aria-label', translateWord('view_manage'));
            management.querySelector('[value="remove"]').disabled = actions.activeId === 'default';
            liveLink.href = actions.url('index.html');
            const destinations = views.filter(view => view.id !== actions.activeId);
            document.getElementById('frame_view_picker').hidden = destinations.length === 0;
            frameView.replaceChildren(new Option(translateWord('opt_please_choose'), ''), ...destinations.map(
                view => new Option(view.name || translateWord('view_default'), view.id)
            ));
        }
    }

    picker.addEventListener('change', () => actions.select(picker.value));
    if (management) {
        // Keep the browser's "Copy link address" available inside the editor.
        liveLink.addEventListener('contextmenu', event => event.stopPropagation());
        frameView.addEventListener('change', () => {
            if (frameView.value) {
                $('#elm_url').val('?' + new URLSearchParams({ view: frameView.value })).trigger('change');
                $('#elm_frame').val('_overlay').trigger('change');
                frameView.value = '';
            }
        });
        management.addEventListener('change', () => {
            const action = management.value;
            management.value = '';
            const currentName = picker.selectedOptions[0].text;
            if (action === 'remove') {
                if (window.confirm(translateWord('view_confirm_delete').replace('%s', () => currentName))) {
                    actions.remove();
                }
            } else if (action === 'create' || action === 'rename') {
                const name = window.prompt(translateWord('view_name'), action === 'rename' ? currentName : '')?.trim();
                if (name) {
                    actions[action](name);
                }
            }
        });
    }
    document.addEventListener('energyflow-views-changed', refresh);
    refresh();
})();
