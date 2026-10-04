Ext.define('App.view.office.Show', {
    extend: 'App.view.widgets.Show',
    xtype: 'officeshow',

    controller: 'officeshow',
    viewModel: {
        type: 'officeshow'
    },

    title: 'Office',

    items: {
        header: {
            items: {
                title: {
                    tpl: [
                        '<div class="icon x-fa fa-globe"></div>',
                        '<div class="name">{name}</div>',
                        '<div class="desc">{city}, <b>{country}</b><div>'
                    ]
                }
            }
        },

        content: {
            items: {
                left: {
                    items: {
                        details: {
                            xtype: 'officeshowdetails'
                        },

                        people: {
                            xtype: 'officeshowpeople'
                        }
                    }
                }
            }
        }
    }
});
