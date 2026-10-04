"use strict";

var models = require("../models");
var sequelize = models.sequelize;

function pick(items, index) {
    var count = items.length;
    if (index === undefined) {
        index = Math.floor(Math.random() * count);
    }

    return items[index % count];
}

module.exports = {
    reset: function() {
        console.info('Populating database with example data...');
        return sequelize.transaction(function(t) {
            return sequelize.sync({ force: true, transaction: t }).then(function () {
                return Promise.all([
                    models.Action.destroy({ truncate: true, transaction: t }),
                    models.Office.destroy({ truncate: true, transaction: t }),
                    models.Organization.destroy({ truncate: true, transaction: t }),
                    models.Person.destroy({ truncate: true, transaction: t })
                ]);
            }).then(function() {
                var peopleData = require('../data/People.json');
                var createPeoplePromises = peopleData.map(function(data) {
                    return models.Person.create(data, { include: [{ model: models.Action, as: 'actions' }], transaction: t });
                });

                return Promise.all([
                    models.Office.bulkCreate(require('../data/Offices.json'), { transaction: t }),
                    models.Organization.bulkCreate(require('../data/Organizations.json'), { transaction: t }),
                    Promise.all(createPeoplePromises)
                ]);
            });
        }).then(function() {
            return sequelize.transaction(function(t) {
                return Promise.all([
                    models.Action.findAll(),
                    models.Person.findAll(),
                    models.Office.findAll(),
                    models.Organization.findAll()
                ]).then(function(results) {
                    var actions = results[0];
                    var persons = results[1];
                    var offices = results[2];
                    var organizations = results[3];

                    var managerPromises = organizations.map(function(organization) {
                        return organization.setManager(pick(persons), { transaction: t });
                    });

                    var orgPromises = persons.map(function(person) {
                        return person.setOrganization(pick(organizations), { transaction: t });
                    });

                    var officePromises = persons.map(function(person) {
                        return person.setOffice(pick(offices), { transaction: t });
                    });

                    var actionPromises = actions.map(function(action) {
                        var recipient = pick(persons);
                        action.subject = models.Action.subject(action.type, recipient);
                        return Promise.all([
                            action.setRecipient(recipient, { transaction: t }),
                            action.save({ transaction: t })
                        ]);
                    });

                    return Promise.all([
                        Promise.all(managerPromises),
                        Promise.all(orgPromises),
                        Promise.all(officePromises),
                        Promise.all(actionPromises)
                    ]);
                });
            });
        }).then(function() {
            console.info('Populating database: DONE');
        });
    }
};