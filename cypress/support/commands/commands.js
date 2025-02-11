// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
require("cypress-file-upload");

/**
 * Logs in to the Administration manually
 * @memberOf Cypress.Chainable#
 * @name login
 * @function
 * @param {Object} userType - The type of the user logging in
 */
Cypress.Commands.add('login', (userType) => {
    const types = {
        admin: {
            name: 'admin',
            pass: 'shopware',
        },
    };

    const user = types[userType];

    cy.visit('/admin');

    cy.contains('Username');
    cy.contains("Password");

    cy.get('#sw-field--username')
        .type(user.name)
        .should('have.value', user.name);
    cy.get('#sw-field--password')
        .type(user.pass)
        .should('have.value', user.pass);
    cy.get('.sw-login-login').submit();
    cy.contains('Dashboard');
});

/**
 * Types in an input element and checks if the content was correctly typed
 * @memberOf Cypress.Chainable#
 * @name typeAndCheck
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add(
    'typeAndCheck',
    {
        prevSubject: 'element',
    },
    (subject, value) => {
        cy.wrap(subject).should('be.visible');
        cy.wrap(subject).type(value).should('have.value', value);
    }
);

/**
 * Types in an input element and checks if the content was correctly typed (Storefront version)
 * @memberOf Cypress.Chainable#
 * @name typeAndCheck
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add(
    'typeAndCheckStorefront',
    {
        prevSubject: 'element',
    },
    (subject, value) => {
        cy.wrap(subject).type(value).invoke('val').should('eq', value);
    }
);

/**
 * Clears field, types in an input element and checks if the content was correctly typed
 * @memberOf Cypress.Chainable#
 * @name clearTypeAndCheck
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add(
    'clearTypeAndCheck',
    {
        prevSubject: 'element',
    },
    (subject, value) => {
        cy.wrap(subject).should('be.visible');
        cy.wrap(subject).clear();
        cy.wrap(subject).clear(); // To make sure it's cleared
        cy.wrap(subject).type(value).should('have.value', value);
    }
);

/**
 * Clears field, types in an input element, checks if the content was correctly typed and presses enter
 * @memberOf Cypress.Chainable#
 * @name clearTypeCheckAndEnter
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add(
    'clearTypeCheckAndEnter',
    {
        prevSubject: 'element',
    },
    (subject, value) => {
        cy.wrap(subject).clearTypeAndCheck(value);
        cy.wrap(subject).type('{enter}');
    }
);

/**
 * Types in a sw-multiselect field and checks if the content was correctly typed
 * @memberOf Cypress.Chainable#
 * @name typeMultiSelectAndCheck
 * @function
 * @param {String} value - Desired value of the element
 * @param {Object} [options={}] - Options concerning swSelect usage
 */
Cypress.Commands.add(
    'typeMultiSelectAndCheck',
    {
        prevSubject: 'element',
    },
    (subject, value, options = {}) => {
        const resultPrefix = '.sw-select';
        const inputCssSelector = '.sw-select-selection-list__input';
        const searchTerm = options.searchTerm || value;
        const position = options.position || 0;

        // Request we want to wait for later
        cy.intercept({
            url: `${Cypress.env('apiPath')}/search/*`,
            method: 'post'
        }).as('filteredResultCall');

        cy.wrap(subject).should('be.visible');

        // type in the search term if available
        if (options.searchTerm) {
            cy.get(`${subject.selector} ${inputCssSelector}`).type(searchTerm);
            cy.get(`${subject.selector} ${inputCssSelector}`).should(
                'have.value',
                searchTerm
            );

            cy.wait('@filteredResultCall').then(() => {
                cy.get(`${resultPrefix}-option--${position}`).should(
                    'be.visible'
                );

                cy.wait('@filteredResultCall').then(() => {
                    cy.get('.sw-loader__element').should('not.exist');
                });
            });
            cy.get(`${resultPrefix}-option--${position}`).should('be.visible');
            cy.get(
                `${resultPrefix}-option--${position} .sw-highlight-text__highlight`
            ).contains(value);

            // select the first result (or at another position)
            cy.get(`${resultPrefix}-option--${position}`).click({
                force: true,
            });
        } else {
            cy.wrap(subject).click();
            cy.get('.sw-select-result').should('be.visible');
            cy.contains('.sw-select-result', value).click();
        }

        // in multi selects we can check if the value is the selected item
        cy.get(
            `${subject.selector} .sw-select-selection-list__item-holder--0`
        ).contains(value);

        // close search results
        cy.get(`${subject.selector} ${inputCssSelector}`).type('{esc}');
        cy.get(`${subject.selector} .sw-select-result-list`).should(
            'not.exist'
        );
    }
);

/**
 * Types in a sw-multi-select field all the specified values and checks if the content was correctly set.
 * @memberOf Cypress.Chainable#
 * @name typeMultiSelectAndCheckMultiple
 * @function
 * @param {String[]} values - Desired values of the element
 */
Cypress.Commands.add(
    "typeMultiSelectAndCheckMultiple",
    {
        prevSubject: "element",
    },
    (subject, values) => {
        // Request we want to wait for later
        cy.server();
        cy.route({
            url: `${Cypress.env("apiPath")}/search/*`,
            method: "post",
        }).as("filteredResultCall");

        cy.wrap(subject)
            .scrollIntoView() // try to make it visible so it does not error out if it is not in view
            .should("be.visible");

        // type in each value and select it
        for (let i = 0; i < values.length; i += 1) {
            cy.get(`${subject.selector} .sw-select-selection-list__input`)
                .clear()
                .type(values[i])
                .should(
                    "have.value",
                    values[i]
                );

            // wait for the first request (which happens on opening / clicking in the input
            cy.wait("@filteredResultCall").then(() => {
                // wait for the second request (which happens on stop typing with the actual search)
                cy.wait("@filteredResultCall").then(() => {
                    cy.get(".sw-loader__element").should("not.exist");
                });
            });

            // select the value
            cy.contains('.sw-select-result-list__content .sw-select-result', values[i]).should('be.visible').click();
        }

        // close search results
        cy.get(`${subject.selector} .sw-select-selection-list__input`).type("{esc}");
        cy.get(`${subject.selector} .sw-select-result-list`).should(
            "not.exist"
        );

        // check if all values are selected
        for (let i = 0; i < values.length; i += 1) {
            cy.get(`${subject.selector} .sw-select-selection-list`)
                .should('contain', values[i]);
        }

        // return same element as the one this command works on so it can be chained with other commands.
        // otherwise it will return the last element which is in this case a '.sw-select-selection-list' element.
        cy.wrap(subject);
    }
);

/**
 * Types in an sw-singleselect field
 * @memberOf Cypress.Chainable#
 * @name typeSingleSelect
 * @function
 * @param {String} value - Desired value of the element
 * @param {String} selector - selector of the element
 */
Cypress.Commands.add(
    'typeSingleSelect',
    {
        prevSubject: 'element',
    },
    (subject, value, selector) => {
        const resultPrefix = '.sw-select';
        const inputCssSelector = `.sw-select__selection input`;

        cy.wrap(subject).should('be.visible');
        cy.wrap(subject).click();

        // type in the search term if available
        if (value) {
            cy.get('.sw-select-result-list').should('be.visible');
            cy.get(`${selector} ${inputCssSelector}`).clear();
            cy.get(`${selector} ${inputCssSelector}`).type(value);
            cy.get(`${selector} ${inputCssSelector}`).should(
                'have.value',
                value
            );

            // Wait the debounce time for the search to begin
            cy.wait(500);

            cy.get(`${selector}.sw-loader__element`).should('not.exist');

            cy.get(`${selector} .is--disabled`).should('not.exist');

            cy.get('.sw-select-result__result-item-text').should('be.visible');

            cy.get('.sw-select-result__result-item-text')
                .contains(value)
                .click({force: true});
        } else {
            // Select the first element
            cy.get(`${resultPrefix}-option--0`).click({force: true});
        }

        cy.get(`${selector} .sw-select-result-list`).should('not.exist');
    }
);

/**
 * Types in an sw-singleselect field and checks if the content was correctly typed
 * @memberOf Cypress.Chainable#
 * @name typeSingleSelectAndCheck
 * @function
 * @param {String} value - Desired value of the element
 * @param {String} selector - Options concerning swSelect usage
 */
Cypress.Commands.add(
    'typeSingleSelectAndCheck',
    {
        prevSubject: 'element',
    },
    (subject, value, selector) => {
        cy.get(subject).typeSingleSelect(value, selector);

        // expect the placeholder for an empty select field not be shown and search for the value
        cy.get(
            `${subject.selector} .sw-select__selection .is--placeholder`
        ).should("not.exist");
        cy.get(`${subject.selector} .sw-select__selection`).contains(value);
    }
);

/**
 * Types in an legacy sw-select field and checks if the content was correctly typed
 * @memberOf Cypress.Chainable#
 * @name typeLegacySelectAndCheck
 * @function
 * @param {String} value - Desired value of the element
 * @param {Object} options - Options concerning swSelect usage
 */
Cypress.Commands.add(
    'typeLegacySelectAndCheck',
    {
        prevSubject: '"element",'
    },
    (subject, value, options) => {
        const inputCssSelector = options.isMulti
            ? '.sw-select__input'
            : '.sw-select__input-single';

        cy.wrap(subject).should('be.visible');

        if (options.clearField && options.isMulti) {
            cy.get(`${subject.selector} .sw-label__dismiss`).click();
            cy.get(`${subject.selector} ${".sw-label"}`).should('not.exist');
        }

        if (!options.isMulti) {
            // open results list
            cy.wrap(subject).click();
            cy.get('.sw-select__results').should('be.visible');
        }

        // type in the search term if available
        if (options.searchTerm) {
            cy.get(`${subject.selector} ${inputCssSelector}`).type(
                options.searchTerm
            );
            cy.get(
                `${subject.selector} .sw-select__indicators .sw-loader`
            ).should('not.exist');
            cy.get('.sw-select__results').should('be.visible');
            cy.get(
                '.sw-select-option--0 .sw-select-option__result-item-text'
            ).contains(value);
        }

        // select the first result
        cy.get(`${subject.selector} ${inputCssSelector}`).type("{enter}");

        if (!options.isMulti) {
            // expect the placeholder for an empty select field not be shown and search for the value
            cy.get(`${subject.selector} .sw-select__placeholder`).should(
                'not.exist'
            );
            cy.get(`${subject.selector} .sw-select__single-selection`).contains(
                value
            );
        } else {
            // in multi selects we can check if the value is a selected item
            cy.get(`${subject.selector} .sw-select__selection-item`).contains(
                value
            );

            // close search results
            cy.get(`${subject.selector} ${inputCssSelector}`).type("{esc}");
        }
    }
);

/**
 * Assert that an SW Grid with a row containing a given label also contains another column with a given value
 * @memberOf Cypress.Chainable#
 * @name assertRowWithLabelContains
 * @function
 * @param {String|RegExp} columnValue - The value which should exists in the row
 * @param {String} columnSelector - Selector to select the value row
 * @param {String|RegExp} labelColumnValue - Label of the row to assert
 * @param {String} [labelColumnSelector] - Selector to select the label row
 */
Cypress.Commands.add(
    'assertRowWithLabelContains',
    {
        prevSubject: 'element',
    },
    (
        subject,
        columnValue,
        columnSelector,
        labelColumnValue,
        labelColumnSelector = '.sw-data-grid__cell--label'
    ) => {
        subject
            .children()
            .get(labelColumnSelector)
            .contains(labelColumnValue)
            .parent()
            .parent()
            .parent()
            .within(($row) => {
                cy.get(
                    `${columnSelector} > .sw-data-grid__cell-content`
                ).contains(columnValue);
            });
    }
);

/**
 * Types in the global search field and verify search terms in url
 * @memberOf Cypress.Chainable#
 * @name typeAndCheckSearchField
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add('typeAndCheckSearchField', {
    prevSubject: 'element',
}, (subject, value) => {
    // Request we want to wait for later
    cy.intercept({
        url: `${Cypress.env('apiPath')}/search/**`,
        method: 'post',
    }).as('searchResultCall');

    cy.wrap(subject).type(value).should('have.value', value);

    cy.wait('@searchResultCall')
        .its('response.statusCode').should('equal', 200);
    cy.url().should('include', encodeURI(value));
});

/**
 * Wait for a notification to appear and check its message
 * @memberOf Cypress.Chainable#
 * @name awaitAndCheckNotification
 * @function
 * @param {String} message - The message to look for
 * @param {Object}  [options={}] - Options concerning the notification
 */
Cypress.Commands.add(
    'awaitAndCheckNotification',
    (
        message,
        options = {
            position: 0,
            collapse: true,
        }
    ) => {
        const notification = `.sw-notifications__notification--${options.position}`;

        cy.get(`${notification} .sw-alert__message`)
            .should('be.visible')
            .contains(message);

        if (options.collapse) {
            cy.get(`${notification} .sw-alert__close`)
                .click()
                .should('not.exist');
        }
    }
);

/**
 * Click context menu in order to cause a desired action
 * @memberOf Cypress.Chainable#
 * @name clickContextMenuItem
 * @function
 * @param {String} menuButtonSelector - The message to look for
 * @param {String} menuOpenSelector - The message to look for
 * @param {Object} [scope=null] - Options concerning the notification
 * @param {String} [menuButtonText=null] - Text of the menu button
 */
Cypress.Commands.add(
    'clickContextMenuItem',
    (
        menuButtonSelector,
        menuOpenSelector,
        scope = null,
        menuButtonText = "",
        force = false
    ) => {
        const contextMenuCssSelector = '.sw-context-menu';
        const activeContextButtonCssSelector = '.is--active';

        if (scope != null) {
            cy.get(scope).should('be.visible');

            if (!force) {
                cy.get(`${scope} ${menuOpenSelector}`).should('be.visible');
            }

            cy.get(`${scope} ${menuOpenSelector}`).click({force});

            if (scope.includes('row')) {
                cy.get(
                    `${menuOpenSelector}${activeContextButtonCssSelector}`
                ).should('be.visible');
            }
        } else {
            cy.get(menuOpenSelector)
                .should('be.visible')
                .click({force});
        }

        cy.get(contextMenuCssSelector).should('be.visible');
        let element = cy.get(menuButtonSelector);
        if (menuButtonText !== "") {
            element = element.contains(menuButtonText);
        }
        element.click();
        cy.get(contextMenuCssSelector).should('not.exist');
    }
);

/**
 * Navigate to module by clicking the corresponding main menu item
 * @memberOf Cypress.Chainable#
 * @name legacyClickMainMenuItem
 * @function
 * @param {Object} obj - Menu options
 * @param {String} obj.targetPath - The url the user should end with
 * @param {String} obj.mainMenuId - Id of the Main Menu item
 * @param {String} [obj.subMenuId=null] - Id of the sub menu item
 */
Cypress.Commands.add(
    'legacyClickMainMenuItem',
    ({targetPath, mainMenuId, subMenuId = null}) => {
        const finalMenuItem = `.sw-admin-menu__item--${mainMenuId}`;

        cy.get('.sw-admin-menu')
            .should('be.visible')
            .then(() => {
                if (subMenuId) {
                    cy.get(finalMenuItem).click();
                    cy.get(
                        `.sw-admin-menu__item--${mainMenuId} .router-link-active`
                    ).should("be.visible");
                    cy.get(`.${subMenuId}`).click();
                } else {
                    cy.get(finalMenuItem).should('be.visible').click();
                }
            });
        cy.url().should('include', targetPath);
    }
);

/**
 * Reload listing using sidebar button
 * @memberOf Cypress.Chainable#
 * @name reloadListing
 * @function
 * @param {Object} [reloadSelectors=null] - The message to look for
 * @param {String} reloadSelectors.reloadButtonSelector - The message to look for
 * @param {String} reloadSelectors.loadingIndicatorSelector - The message to look for
 */
Cypress.Commands.add(
    'reloadListing',
    (
        reloadSelectors = {
            reloadButtonSelector:
                '.sw-sidebar-navigation-item .icon--default-arrow-360-left',
            loadingIndicatorSelector: 'sw-data-grid-skeleton',
        }
    ) => {
        cy.get(reloadSelectors.reloadButtonSelector).should('be.visible');
        cy.get(reloadSelectors.reloadButtonSelector).click();
        cy.get(reloadSelectors.loadingIndicatorSelector).should('not.exist');
    }
);

/**
 * Click user menu to open it up
 * @memberOf Cypress.Chainable#
 * @name openUserActionMenu
 * @function
 */
Cypress.Commands.add('openUserActionMenu', () => {
    cy.get('.sw-admin-menu__user-actions-toggle').should('be.visible');

    cy.get('.sw-admin-menu__user-actions-indicator').then(($btn) => {
        if ($btn.hasClass('icon--small-arrow-medium-up')) {
            cy.get('.sw-admin-menu__user-actions-toggle').click();
            cy.get('.sw-admin-menu__logout-action').should('be.visible');
        }
    });
});

/**
 * Selects a date in date field component
 * @memberOf Cypress.Chainable#
 * @name fillAndCheckDateField
 * @function
 * @param {String} value - The value to type
 * @param {String} selector - Field selector
 */
Cypress.Commands.add(
    'fillAndCheckDateField',
    {
        prevSubject: 'element',
    },
    (subject, value, selector) => {
        // Get selector for both fields
        cy.get(subject).should('be.visible');

        const hiddenDateFieldSelector = `${selector} .flatpickr-input:nth-of-type(1)`;
        const visibleDateFieldSelector = `${selector} .flatpickr-input.form-control`;

        cy.get(hiddenDateFieldSelector).should('exist');
        cy.get(visibleDateFieldSelector).should('be.visible');

        // Set hidden ISO date
        const dateParts = value.split(" ");
        let isoDate = "";

        // no Time
        if (dateParts.length === 1) {
            isoDate = `${dateParts[0]}T00:00:00+00:00`;
        } else {
            isoDate = `${dateParts.join("T")}:00+00:00`;
        }
        cy.get(hiddenDateFieldSelector).then((elem) => {
            elem.val(isoDate);
        });

        // Set visible date
        cy.get(visibleDateFieldSelector).type(value);
        cy.get(visibleDateFieldSelector).type('{enter}');
    }
);

/**
 * Performs a drag and drop operation
 * @memberOf Cypress.Chainable#
 * @name dragTo
 * @param {String} targetEl - The target element to drag source to
 * @function
 */
Cypress.Commands.add(
    "dragTo",
    {prevSubject: 'element'},
    (subject, targetEl) => {
        cy.wrap(subject).trigger("mousedown", {buttons: 1});

        cy.get('.is--dragging').should('be.visible');
        cy.get(targetEl)
            .should('be.visible')
            .trigger('mouseenter')
            .trigger('mousemove', 'center')
            .should('have.class', 'is--valid-drop')
            .trigger('mouseup');
    }
);

/**
 * @memberOf Cypress.Chainable#
 * @name featureIsActive
 * @param {String} feature
 */
 Cypress.Commands.add('featureIsActive', (feature) => {
    cy.window().then((win) =>{
        // Check directly if admin is already loaded
        if (
            win !== undefined &&
            win.Shopware !== undefined &&
            win.Shopware.Feature !== undefined &&
            typeof win.Shopware.Feature.isActive === 'function'
        ) {
            return cy.wrap(win.Shopware.Feature.isActive(feature));
        }

        // Otherwise save current URL
        // and go to admin and check feature flags
        cy.url().then(previousUrl => {
            cy.visit(`${Cypress.env('admin')}#/login`);
            cy.get('#app').should('exist');

            cy.window().then(win => {
                let isActive = false;

                if (
                    win !== undefined &&
                    win.Shopware !== undefined &&
                    win.Shopware.Feature !== undefined
                ) {
                    isActive = win.Shopware.Feature.isActive(feature);
                } else {
                    isActive = false;
                }

                win.location.href = previousUrl;

                return cy.wrap(isActive);
            })
        })
    })
});

/**
 * Skip test on active feature
 * @memberOf Cypress.Chainable#
 * @name skipOnFeature
 * @function
 * @param {String} feature - Skip the test if feature is active
 * @param {() => void} cb - Optional, run the given callback if the condition passes
 */
Cypress.Commands.add('skipOnFeature', (feature, cb) => {
    cy.featureIsActive(feature).then(isActive => {
        if (isActive) {
            cy.log(
                `Skipping test because feature flag '${feature}' is activated.`
            );
        }

        cy.skipOn(isActive, cb);
    });
});

/**
 * Skip test on inactive feature
 * @memberOf Cypress.Chainable#
 * @name onlyOnFeature
 * @function
 * @param {String} feature - Skip test if feature is inactive
 * @param {() => void} cb - Optional, run the given callback if the condition passes
 */
 Cypress.Commands.add('onlyOnFeature', (feature, cb) => {
    cy.featureIsActive(feature).then(isActive => {
        if (isActive) {
            cy.log(
                `Running test because feature flag '${feature}' is activated.`
            );
        }

        cy.onlyOn(isActive, cb);
    })
});

/**
 * Types in an input element and checks if the content was correctly typed, tailored for Storefront
 * @memberOf Cypress.Chainable#
 * @name typeAndCheck
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add('typeAndCheckStorefront', {
    prevSubject: 'element'
}, (subject, value) => {
    cy.wrap(subject).type(value).invoke('val').should('eq', value);
});

/**
 * Selects an option in an select element
 * @memberOf Cypress.Chainable#
 * @name typeAndCheck
 * @function
 * @param {String} value - The value to type
 */
Cypress.Commands.add('typeAndSelect', {
    prevSubject: 'element'
}, (subject, value) => {
    cy.wrap(subject).select(value);
});

/**
 * Sorts a listing via clicking on name column
 * @memberOf Cypress.Chainable#
 * @name sortAndCheckListingAscViaColumn
 * @function
 * @param {String} columnTitle - Title of the column to sort with
 * @param {String} firstEntry - String of the first entry to be in listing after sorting
 * @param {String} [rowZeroSelector = .sw-data-grid__row--0]  - Column to be checked
 */
Cypress.Commands.add('sortAndCheckListingAscViaColumn', (
    columnTitle,
    firstEntry,
    rowZeroSelector = '.sw-data-grid__row--0',
) => {
    // Sort listing
    cy.contains('.sw-data-grid__cell-content', columnTitle).should('be.visible');
    cy.contains('.sw-data-grid__cell-content', columnTitle).click();

    // Assertions to make sure listing is loaded
    cy.get('.sw-data-grid__skeleton').should('not.exist');
    cy.get('.sw-loader').should('not.exist');

    // Assertions to make sure sorting was applied
    cy.get('.sw-data-grid__sort-indicator').should('be.visible');
    cy.get('.icon--small-arrow-small-down').should('not.exist');
    cy.get('.icon--small-arrow-small-up').should('be.visible');
    cy.get(rowZeroSelector).should('be.visible');
    cy.contains(rowZeroSelector, firstEntry).should('be.visible');
});

/**
 * Test whether the searchTerm, sorting, page and limit get applied to the URL and the listing
 * @memberOf Cypress.Chainable#
 * @name testListing
 * @function
 * @param {String} searchTerm - the searchTerm for witch should be searched for
 * @param {Object} sorting - the sorting to be checked
 * @param {Number} sorting.location - the column in wich the number is
 * @param {String} sorting.text - the text in the column header
 * @param {String} sorting.propertyName - the 'technical' name for the column
 * @param {('ASC'|'DESC')} sorting.sortDirection - the sort direction
 * @param {Number} page - the page to be checked
 * @param {Number} limit - the limit to be checked
 * @param {boolean} changesUrl - whether changing the sorting or page updates the URL

 */
Cypress.Commands.add('testListing', ({ searchTerm, sorting = {
    location: undefined,
    text: undefined,
    propertyName: undefined,
    sortDirection: undefined,
}, page, limit, changesUrl = true }) => {
    cy.get('.sw-loader').should('not.exist');
    cy.get('.sw-data-grid__skeleton').should('not.exist');

    // check search term if supplied
    if (searchTerm) {
        cy.url().should('contain', `term=${searchTerm}`);
        cy.get('.sw-search-bar__input').should('have.value', searchTerm);
    }

    // determine what icon class should be displayed
    let iconClass;
    switch (sorting.sortDirection) {
        case 'ASC':
            iconClass = '.icon--small-arrow-small-up';
            break;
        case 'DESC':
            iconClass = '.icon--small-arrow-small-down';
            break;
        default:
            throw new Error(`${sorting.sortDirection} is not a valid sorting direction`);
    }

    if (changesUrl) {
        cy.url().should('contain', `sortBy=${sorting.propertyName}`);
        cy.url().should('contain', `sortDirection=${sorting.sortDirection}`);
        cy.url().should('contain', `page=${page}`);
        cy.url().should('contain', `limit=${limit}`);
    }

    // check sorting
    cy.get(`.sw-data-grid__cell--${sorting.location} > .sw-data-grid__cell-content`).contains(sorting.text);
    cy.get(`.sw-data-grid__cell--${sorting.location} > .sw-data-grid__cell-content`).get(iconClass)
        .should('be.visible');

    // check page
    cy.get(`:nth-child(${page}) > .sw-pagination__list-button`).should('have.class', 'is-active');

    // check limit
    cy.get('#perPage').contains(limit);
    // here we have to add 1 because the <th> has the same class
    cy.get('.sw-data-grid__row').should('have.length', (limit + 1));
});

/**
 * Types in a sw-multi-select field all the specified values and checks if the content was correctly set.
 * @memberOf Cypress.Chainable#
 * @name typeMultiSelectAndCheckMultiple
 * @function
 * @param {String[]} values - Desired values of the element
 */
Cypress.Commands.add(
    'typeMultiSelectAndCheckMultiple',
    {
        prevSubject: 'element',
    },
    (subject, values) => {
        // Request we want to wait for later
        cy.server();
        cy.route({
            url: `${Cypress.env('apiPath')}/search/*`,
            method: 'post',
        }).as('filteredResultCall');

        cy.wrap(subject)
            .scrollIntoView() // try to make it visible so it does not error out if it is not in view
            .should('be.visible');

        // type in each value and select it
        for (let i = 0; i < values.length; i += 1) {
            cy.get(`${subject.selector} .sw-select-selection-list__input`)
                .clear()
                .type(values[i])
                .should(
                    'have.value',
                    values[i],
                );

            // wait for the first request (which happens on opening / clicking in the input
            cy.wait('@filteredResultCall').then(() => {
                // wait for the second request (which happens on stop typing with the actual search)
                cy.wait('@filteredResultCall').then(() => {
                    cy.get('.sw-loader__element').should('not.exist');
                });
            });

            // select the value
            cy.contains('.sw-select-result-list__content .sw-select-result', values[i])
                .should('be.visible')
                .click();
        }

        // close search results
        cy.get(`${subject.selector} .sw-select-selection-list__input`).type('{esc}');
        cy.get(`${subject.selector} .sw-select-result-list`).should(
            'not.exist',
        );

        // check if all values are selected
        for (let i = 0; i < values.length; i += 1) {
            cy.get(`${subject.selector} .sw-select-selection-list`)
                .should('contain', values[i]);
        }

        // return same element as the one this command works on so it can be chained with other commands.
        // otherwise it will return the last element which is in this case a '.sw-select-selection-list' element.
        cy.wrap(subject);
    },
);

/**
 * Get an element which is attached correctly
 * @memberOf Cypress.Chainable#
 * @name typeMultiSelectAndCheckMultiple
 * @function
 * @param {String} selector - Desired values of the element
 */
Cypress.Commands.add('getAttached', selector => {
    const getElement = typeof selector === 'function' ? selector : $d => $d.find(selector);
    let $el = null;

    return cy.document().should($d => {
        $el = getElement(Cypress.$($d));

        // eslint-disable-next-line no-unused-expressions
        expect(Cypress.dom.isDetached($el)).to.be.false;
    }).then(() => cy.wrap($el));
});

/**
 * Navigate to module by clicking the corresponding main menu item
 * @memberOf Cypress.Chainable#
 * @name clickMainMenuItem
 * @function
 * @param {Object} obj - Menu options
 * @param {String} obj.targetPath - The url the user should end with
 * @param {String} obj.mainMenuId - Id of the Main Menu item
 * @param {String} [obj.subMenuId=null] - Id of the sub menu item
 */
Cypress.Commands.add(
    'clickMainMenuItem',
    ({ targetPath, mainMenuId, subMenuId = null }) => {
        const finalMenuItem = `.sw-admin-menu__item--${mainMenuId}`;

        cy.get('.sw-loader').should('not.exist');
        cy.get('.sw-admin-menu')
            .should('be.visible')
            .then(() => {
                if (subMenuId) {
                    cy.get(finalMenuItem).click();
                    cy.get(`.sw-admin-menu__item--${mainMenuId} .router-link-active`).should('be.visible');
                    cy.get(`.sw-admin-menu__navigation-list-item .${subMenuId}`).should('be.visible')
                        .then($el => Cypress.dom.isDetached($el));
                    cy.log(`Element ${subMenuId} is detached.`);
                    cy.get(`.sw-admin-menu__navigation-list-item .${subMenuId}`).should('be.visible')
                        .then($el => Cypress.dom.isAttached($el));
                    cy.log(`Element ${subMenuId} is now attached to the DOM.`);

                    // the admin menu sometimes replaces the dom element. So we wait for some time
                    cy.wait(500);
                    cy.get(`.sw-admin-menu__item--${mainMenuId} .sw-admin-menu__navigation-list-item.${subMenuId}`)
                        .should('be.visible');

                    cy.get(`.sw-admin-menu__item--${mainMenuId} .sw-admin-menu__navigation-list-item.${subMenuId}`)
                        .click();
                } else {
                    cy.get(finalMenuItem).should('be.visible').click();
                }
            });
        cy.url().should('include', targetPath);
    },
);

/**
 * Ensures Shopware's modals are fully loaded
 * @memberOf Cypress.Chainable#
 * @name handleModalSnapshot
 * @param {String} title - Modal title
 * @function
 */
Cypress.Commands.add('handleModalSnapshot', (title) => {
    cy.contains('.sw-modal__header', title).should('be.visible');

    cy.get('.sw-modal').should('be.visible').then(() => {
        cy.get('.sw-modal-fade-enter-active').should('not.exist');
        cy.get('.sw-modal-fade-enter').should('not.exist');
    }).then(() => {
        cy.get('.sw-modal-fade-leave-active').should('not.exist');
        cy.get('.sw-modal-fade-leave-to').should('not.exist');
    })
        .then(() => {
            cy.get('.sw-modal').should('have.css', 'opacity', '1');
        });
});
