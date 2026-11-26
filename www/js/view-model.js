'use strict';

// Only the diagram belongs to a view. Settings, data sources and calculations
// stay on the same configuration object while the editor switches diagrams.
class EnergyFlowViews {
    static diagramKeys = ['elements', 'defs', 'lines', 'animations'];

    static emptyDiagram() {
        return Object.fromEntries(this.diagramKeys.map(key => [key, Object.create(null)]));
    }

    constructor(config, requestedId) {
        this.current = { ...config };
        const defaultView = { id: 'default', name: '', diagram: EnergyFlowViews.emptyDiagram() };
        this.records = new Map([[defaultView.id, defaultView]]);
        this.hasViewMetadata = Array.isArray(config.views);
        if (this.hasViewMetadata) {
            for (const view of config.views) {
                if (!view || typeof view.id !== 'string' || !view.id || typeof view.name !== 'string') continue;
                if (view.id === 'default') {
                    defaultView.name = view.name;
                } else if (!this.records.has(view.id)) {
                    this.records.set(view.id, { ...view, diagram: EnergyFlowViews.emptyDiagram() });
                }
            }
        }
        for (const key of EnergyFlowViews.diagramKeys) {
            for (const [id, entry] of Object.entries(config[key] || {})) {
                const { diagram } = this.records.get(entry.view) || defaultView;
                diagram[key][id] = entry;
            }
        }
        this.select(this.records.has(requestedId) ? requestedId : defaultView.id);
    }

    get views() {
        return Array.from(this.records.values(), ({ diagram, ...view }) => view);
    }

    get activeId() {
        return this.active.id;
    }

    select(id) {
        const view = this.records.get(id);
        if (!view) return false;
        Object.assign(this.current, view.diagram);
        this.active = view;
        return true;
    }

    create(name) {
        name = name.trim();
        if (!name) return false;

        // getRandomValues also works on a local ioBroker installation using HTTP.
        let id;
        do {
            const bytes = crypto.getRandomValues(new Uint32Array(2));
            id = 'view-' + Array.from(bytes, value => value.toString(16).padStart(8, '0')).join('');
        } while (this.records.has(id));
        this.records.set(id, { id, name, diagram: EnergyFlowViews.emptyDiagram() });
        this.hasViewMetadata = true;
        return this.select(id);
    }

    rename(name) {
        name = name.trim();
        if (!name) return false;
        this.active.name = name;
        this.hasViewMetadata = true;
        return true;
    }

    remove() {
        if (this.activeId === 'default') return false;
        this.records.delete(this.activeId);
        return this.select('default');
    }

    nextElementId() {
        let max = -1;
        for (const { diagram } of this.records.values()) {
            for (const id of Object.keys(diagram.elements)) max = Math.max(max, Number(id));
        }
        return max + 1;
    }

    // The adapter consumes one flat set of IDs for subscriptions and calculations.
    // Stamp ownership here, including for newly drawn, duplicated or imported items.
    snapshot() {
        const result = { ...this.current, ...EnergyFlowViews.emptyDiagram() };
        if (this.hasViewMetadata) result.views = this.views;
        for (const { id: viewId, diagram } of this.records.values()) {
            for (const key of EnergyFlowViews.diagramKeys) {
                for (const [id, entry] of Object.entries(diagram[key])) {
                    if (viewId === 'default') {
                        const { view, ...properties } = entry;
                        result[key][id] = properties;
                    } else {
                        result[key][id] = { ...entry, view: viewId };
                    }
                }
            }
        }
        return result;
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = EnergyFlowViews;
