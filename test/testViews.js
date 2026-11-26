'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');
const EnergyFlowViews = require('../www/js/view-model');
const legacy = require('../www/js/basic_config.json');

describe('Energy flow views', () => {
    it('round-trips a legacy diagram and falls back to it for an unknown URL', () => {
        const views = new EnergyFlowViews(structuredClone(legacy), 'missing');
        expect(views.activeId).to.equal('default');
        expect(views.snapshot()).to.deep.equal(legacy);
        expect(views.remove()).to.be.false;
    });

    it('saves every diagram, including unsaved edits made before switching views', () => {
        const views = new EnergyFlowViews(structuredClone(legacy), 'default');
        const firstId = views.nextElementId();
        views.create(' Inverter ');
        const detail = views.activeId;
        expect(views.nextElementId()).to.equal(firstId);
        expect(Object.keys(views.current.elements)).to.be.empty;
        expect(Object.keys(views.current.lines)).to.be.empty;

        views.current.elements[firstId] = { id: firstId, type: 'rect' };
        const secondId = views.nextElementId();
        views.current.elements[secondId] = { id: secondId, type: 'circle' };
        const path = `path_${firstId}_${secondId}`;
        views.current.defs[path] = { id: path, type: 'def' };
        views.current.lines['line_' + path] = { type: 'line', href: '#' + path };
        views.current.animations['anim_' + path] = { type: 'animation', href: '#' + path, source: 1 };
        views.current.datasources[1] = { alias: 'PV', source: 'pv.power' };
        views.rename('Roof');
        expect(views.activeId).to.equal(detail);
        views.select('default');
        expect(views.current.elements[firstId]).to.be.undefined;
        expect(views.nextElementId()).to.equal(secondId + 1);
        expect(views.current.datasources[1].alias).to.equal('PV');
        delete views.current.elements[2];

        const saved = views.snapshot();
        expect(saved.elements[2]).to.be.undefined;
        expect(saved.views).to.deep.include({ id: detail, name: 'Roof' });
        expect(saved.elements[firstId].view).to.equal(detail);
        const restored = new EnergyFlowViews(JSON.parse(JSON.stringify(saved)), detail);
        expect(Object.keys(restored.current.elements)).to.deep.equal([String(firstId), String(secondId)]);
        expect(Object.keys(restored.current.defs)).to.deep.equal([path]);
        expect(Object.keys(restored.current.lines)).to.deep.equal(['line_' + path]);
        expect(Object.keys(restored.current.animations)).to.deep.equal(['anim_' + path]);
        expect(restored.snapshot()).to.deep.equal(saved);
    });

    it('removes only the selected diagram and keeps shared data and other views', () => {
        const views = new EnergyFlowViews(structuredClone(legacy));
        expect(views.create('  ')).to.be.false;
        views.create('Roof');
        const roof = views.activeId;
        views.current.elements[99] = { id: 99 };
        views.create('Garage');
        const garage = views.activeId;
        views.current.elements[100] = { id: 100 };
        views.select(roof);
        expect(views.rename('')).to.be.false;
        expect(views.remove()).to.be.true;
        const saved = views.snapshot();
        expect(views.activeId).to.equal('default');
        expect(saved.elements[99]).to.be.undefined;
        expect(saved.elements[100].view).to.equal(garage);
        expect(saved.lines).to.deep.equal(legacy.lines);
        expect(saved.calculation).to.deep.equal(legacy.calculation);
        expect(views.select(roof)).to.be.false;
    });
});
