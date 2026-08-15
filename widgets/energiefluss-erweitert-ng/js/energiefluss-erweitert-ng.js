/*
    ioBroker.vis energiefluss-erweitert-ng Widget-Set

    Copyright 2025 SKB-CGN
*/
'use strict';

// add translations for edit mode
$.extend(true, systemDictionary, {
    // Add your translations here, e.g.:
    energieflussErweitertNgInstance: {
        en: 'adapter instance',
        de: 'Adapterinstanz',
        ru: 'экземпляр адаптера',
        pt: 'instância do adaptador',
        nl: 'adapter instantie',
        fr: "instance d'adaptateur",
        it: "istanza dell'adattatore",
        es: 'instancia de adaptador',
        pl: 'instancja adaptera',
        'zh-cn': '适配器实例',
    },
});

// this code can be placed directly in energiefluss-erweitert-ng.html
vis.binds['energiefluss-erweitert-ng'] = {
    createWidget: function (widgetID, view, data, style) {
        const instance = data._data.energieflussErweitertNgInstance || '0';
        console.log(
            `${new Date().toLocaleTimeString()} energiefluss-erweitert-ng[${widgetID}]: Trying to render widget for Instance: ${instance}`,
        );
        const $div = $(`#${widgetID}`);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds['energiefluss-erweitert-ng'].createWidget(widgetID, view, data, style);
            }, 100);
        }

        const sandbox = 'allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-top-navigation';
        const text = `<iframe class="ef-Frame" title="Energiefluss-erweitert NG" src="/energiefluss-erweitert-ng/?instance=${instance}" sandbox="${sandbox}">`;

        $(`#${widgetID}`).html(text);
    },
};
