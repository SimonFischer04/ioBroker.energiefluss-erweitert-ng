'use strict';

const energyFlowViewRuntime = (() => {
    let model;
    let latestData;
    let drawn = false;
    let generation = 0;

    function url(page, id = model?.activeId) {
        const current = new URL(window.location.href);
        const target = page ? new URL(page, current) : current;
        target.search = current.search;
        if (id && id !== 'default') {
            target.searchParams.set('view', id);
        } else {
            target.searchParams.delete('view');
        }
        return target;
    }

    function notify() {
        document.dispatchEvent(new Event('energyflow-views-changed'));
    }

    function updateAddress() {
        const address = url();
        if (address.href !== window.location.href && address.protocol !== 'file:') {
            history.replaceState(history.state, '', address);
        }
    }

    function clearEditor() {
        // Cancel tools that still refer to a selection or a line in the previous view.
        $('.connect_elements.red').trigger('click');
        $('#align_elements').trigger('click');
        $('#config_bar').removeClass('show skeleton');
        $('.elm_config').off();
        $('#mouse_contextmenu').hide();
        $('#svg_config_div').removeClass('noscroll');
        globalSelection.clear();
        globalClipboard.clear();
        globalUndoStack = [];
        globalRedoStack = [];
        $('#edit_undo, #edit_redo, #duplicate_elements, #stack_action').addClass('not_active');
        document.dispatchEvent(new Event('energyflow-clear-selection'));
    }

    function load(fullConfig) {
        if (model && !displayMode) clearEditor();
        model = new EnergyFlowViews(fullConfig, new URL(window.location.href).searchParams.get('view'));
        drawn = false;
        generation++;
        oldRefreshObj = {};
        updateAddress();
        return model.current;
    }

    function draw() {
        generation++;
        $('.placeholders').empty();
        const byPosition = (left, right) => (left.position ?? Infinity) - (right.position ?? Infinity);
        // The SVG has separate stacking contexts for shapes, text, icons and lines.
        for (const element of Object.values(configuration.elements).sort(byPosition)) svgElement(element);
        for (const path of Object.values(configuration.defs)) svgElement(path);
        for (const line of Object.values(configuration.lines).sort(byPosition)) svgElement(line);
        for (const animation of Object.values(configuration.animations)) svgElement(animation);
        drawn = true;
        if (latestData) refreshData(latestData, true);
        notify();
    }

    function edit(action, value) {
        if (!model || displayMode) return false;
        const previousId = model.activeId;
        if (!model[action](value)) return false;
        if (action !== 'select') globalConfigChanged = true;
        if (model.activeId !== previousId) {
            clearEditor();
            oldRefreshObj = {};
            updateAddress();
            draw();
        } else {
            notify();
        }
        return true;
    }

    window.energyFlowViewActions = {
        get views() { return model?.views || []; },
        get activeId() { return model?.activeId; },
        select(id) {
            if (!displayMode) return edit('select', id);
            if (id !== model?.activeId && model?.views.some(view => view.id === id)) {
                window.location.assign(url(undefined, id));
            }
        },
        create(name) { return edit('create', name); },
        rename(name) { return edit('rename', name); },
        remove() { return edit('remove'); },
        url
    };

    return {
        load,
        draw,
        snapshot: () => model.snapshot(),
        nextElementId: () => model.nextElementId(),
        get generation() { return generation; },
        canvasFits(width, height) {
            let right = 0;
            let bottom = 0;
            let metrics;
            for (const element of Object.values(model.snapshot().elements)) {
                let { width = 1, height = 1 } = element;
                const { type, id, pos_x, pos_y, stroke = 0 } = element;
                if (type === 'circle') {
                    width = height = element.radius;
                } else if (type === 'text') {
                    if (Object.hasOwn(configuration.elements, id) && document.getElementById(id)) {
                        const size = getElementCoords(id);
                        width = size.width / 2;
                        height = size.height / 2;
                    } else {
                        // Hidden views have no SVG nodes to measure.
                        metrics ??= document.createElement('canvas').getContext('2d');
                        const fontSize = Number(element.font_size) || 16;
                        metrics.font = `${fontSize}px ${element.font_family || 'sans-serif'}`;
                        const value = element.source_display === 'own_text' ? element.text : latestData?.values?.[id] ?? element.text;
                        const text = [element.prepend, value, element.append, element.unit].join('');
                        const lines = text.split(/<br>|\n/);
                        width = Math.max(...lines.map(line => metrics.measureText(line).width)) / 2;
                        height = lines.length * fontSize / 2;
                    }
                }
                right = Math.max(right, Number(pos_x) + Number(width) + Number(stroke));
                bottom = Math.max(bottom, Number(pos_y) + Number(height) + Number(stroke));
            }
            return { width: width > right, height: height > bottom };
        },
        filterData(data, preview) {
            // A preview response contains just one element. Keep the latest instance-wide
            // data so switching canvases can immediately populate all its saved elements.
            if (!preview) latestData = data;
            if (!drawn) return;
            const { elements, lines, animations } = configuration;
            const visible = id => Object.hasOwn(elements, id) || Object.hasOwn(lines, id) || Object.hasOwn(animations, id);
            return Object.fromEntries(Object.entries(data).map(([key, entries]) => [
                key, Object.fromEntries(Object.entries(entries).filter(([id]) => visible(id)))
            ]));
        },
        reconnectUrl(hash) {
            const target = url();
            target.searchParams.set('hash', hash);
            return target;
        },
        resolveFrameUrl(value) {
            // Same-instance links are stored without a hostname, instance number or proxy prefix.
            if (typeof value === 'string' && /^\?view=[^&#]+$/.test(value)) {
                return url('index.html', new URLSearchParams(value).get('view')).href;
            }
            return value;
        }
    };
})();
