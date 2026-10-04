Ext.define('App.view.office.ShowController', {
    extend: 'App.view.widgets.ShowController',
    alias: 'controller.officeshow',

    onRecordChange: function(view, record) {
        var vm = this.getViewModel(),
            people = vm.getStore('people'),
            history = vm.getStore('history');

        if (record) {
            people.filter('office_id', record.get('id'));
            history.filter('recipient.office_id', record.get('id'));
        } else {
            people.removeAll();
            history.removeAll();
        }

        this.callParent(arguments);
    },

    onPeopleHeadcountTap: function() {
        this.redirectTo('people/office/' + this.getRecord().getId())
    },

    onHistoryAllTap: function() {
        this.redirectTo('history/office/' + this.getRecord().getId());
    }
});
