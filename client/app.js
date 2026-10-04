/*
 * This file is generated and updated by Sencha Cmd. You can edit this file as
 * needed for your application, but these edits will have to be merged by
 * Sencha Cmd when upgrading.
 */

// 1. Disable Sencha Cmd's dynamic HTTP loader
Ext.Loader.setConfig({
    enabled: false,
    paths: {
        'App': 'app'
    }
});

 // 2. Import your Application class so Webpack bundles it
import './app/Application';

Ext.application({
    name: 'App',

    extend: 'App.Application'

    //-------------------------------------------------------------------------
    // Most customizations should be made to App.Application. If you need to
    // customize this file, doing so below this section reduces the likelihood
    // of merge conflicts when upgrading to new versions of Sencha Cmd.
    //-------------------------------------------------------------------------
});
