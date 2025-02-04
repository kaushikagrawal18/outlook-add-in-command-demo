// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE.txt in the project root for license information.

(function () {
  'use strict';

  let rawToken = '';
  let parsedToken = '';

  let getItemSpinnerElement = null;
  let getItemSpinner = null;
  let updateItemSpinnerElement = null;
  let updateItemSpinner = null;

  let markUnreadPayload = { IsRead: false };
  let flagFollowupPayload = { Flag: { FlagStatus: 'Flagged' } };
  let applyCategoryPayload = { Categories: ['Red Category'] };

  // The Office initialize function must be run each time a new page is loaded
  Office.initialize = function (reason) {
      $(document).ready(function () {
          app.initialize();
          const PivotElements = document.querySelectorAll('.ms-Pivot');
          PivotElements.forEach(element => {
            new fabric['Pivot'](element);
          });

          const ToggleElements = document.querySelectorAll('.ms-Toggle');
          ToggleElements.forEach(element => {
            new fabric['Toggle'](element);
          });

          getItemSpinnerElement = document.querySelector('.get-item-spinner');
          getItemSpinner = new fabric['Spinner'](getItemSpinnerElement);
          getItemSpinner.stop();

          updateItemSpinnerElement = document.querySelector('.update-item-spinner');
          updateItemSpinner = new fabric['Spinner'](updateItemSpinnerElement);
          updateItemSpinner.stop();

          const DropdownHTMLElements = document.querySelectorAll('.ms-Dropdown');
          DropdownHTMLElements.forEach(element => {
            new fabric['Dropdown'](element);
          });

          $('.change-select').change(function() {
            const newValue = $('.change-dropdown .ms-Dropdown-title').first().text();
            loadItemChangePayload(newValue);
          });

          $('#parse-token-toggle').click(function() {
            loadToken($('#parse-token-toggle').is(':checked'));
          });

          $('.get-item-button').click(function() {
            getItemViaRest();
          });

          $('.update-item-button').click(function() {
            updateItemViaRest();
          });

          loadRestDetails();
      });
  };

  function loadRestDetails() {
    $('.hostname').text(Office.context.mailbox.diagnostics.hostName);
    $('.hostversion').text(Office.context.mailbox.diagnostics.hostVersion);
    $('.owaview').text(Office.context.mailbox.diagnostics.OWAView);

    let restId = '';
    if (Office.context.mailbox.diagnostics.hostName !== 'OutlookIOS') {
      // Loaded in non-mobile context, so ID needs to be converted
      restId = Office.context.mailbox.convertToRestId(
        Office.context.mailbox.item.itemId,
        Office.MailboxEnums.RestVersion.Beta
      );
    } else {
      restId = Office.context.mailbox.item.itemId;
    }

    // Build the URL to the item
    //var itemUrl = Office.context.mailbox.restUrl + 
    const itemUrl = 'https://outlook.office.com' +
      '/api/beta/me/messages/' + restId;

    $('.resturl-display code').text(itemUrl);
    
    Office.context.mailbox.getCallbackTokenAsync({isRest: true}, function(result){
      if (result.status === "succeeded") {
        rawToken = result.value;
        loadToken($('#parse-token-toggle').is(':checked'));
        enableButtons();
      } else {
        rawToken = 'error';
      }
    });
  }

  function loadToken(parseToken) {
    const code = $('.token-display code');
    if (rawToken === 'error') {
      code.text('ERROR RETRIEVING TOKEN');
      return;
    }

    if (parseToken) {
      if (parsedToken === '') {
        parsedToken = jwt_decode(rawToken);
      }

      code.text(JSON.stringify(parsedToken, null, 2));
    } else {
      code.text(rawToken);
    }
  }

  function getItemViaRest() {
    let itemUrl = $('.resturl-display code').text();

    toggleGetItemSpinner(true);
    
    $.ajax({
      url: itemUrl,
      dataType: 'json',
      headers: { 'Authorization': 'Bearer ' + rawToken }
    }).done(function(item){
      toggleGetItemSpinner(false);
      $('.item-display code').text(
        JSON.stringify(item, null, 2)
      );
    }).fail(function(error){
      toggleGetItemSpinner(false);
      $('.item-display code').text(JSON.stringify(error, null, 2));
    });
  }

  function updateItemViaRest() {
    var itemUrl = $('.resturl-display code').text();
    var payload = $('.update-display code').text();

    toggleUpdateItemSpinner(true);
    
    $.ajax({
      type: 'PATCH',
      url: itemUrl,
      dataType: 'json',
      data: payload,
      headers: { 
        'Authorization': 'Bearer ' + rawToken,
        'Content-Type': 'application/json' 
      }
    }).done(function(item){
      toggleUpdateItemSpinner(false);
      $('.update-display code').text(
        JSON.stringify(item, null, 2)
      );
    }).fail(function(error){
      toggleUpdateItemSpinner(false);
      $('.update-display code').text(JSON.stringify(error, null, 2));
    });
  }

  function loadItemChangePayload(payloadName) {
    $('.update-display code').text('loadpayload');
    var payloadText = '';

    switch(payloadName) {
      case "Mark unread":
        payloadText = JSON.stringify(markUnreadPayload, null, 2);
        break;
      case "Flag for followup":
        payloadText = JSON.stringify(flagFollowupPayload, null, 2);
        break;
      case "Apply category":
        payloadText = JSON.stringify(applyCategoryPayload, null, 2);
        break;
      default:
        payloadText = "Choose a change..."
    }

    $('.update-display code').text(payloadText);
  }

  function enableButtons() {
    $('.get-item-button').removeClass('is-disabled');
    $('.update-item-button').removeClass('is-disabled');
  }

  function toggleGetItemSpinner(showSpinner) {
    if (showSpinner) {
      getItemSpinner.start();
      getItemSpinnerElement.style.display = "block";
    } else {
      getItemSpinner.stop();
      getItemSpinnerElement.style.display = "none";
    }
  }

  function toggleUpdateItemSpinner(showSpinner) {
    if (showSpinner) {
      updateItemSpinner.start();
      updateItemSpinnerElement.style.display = "block";
    } else {
      updateItemSpinner.stop();
      updateItemSpinnerElement.style.display = "none";
    }
  }

  function isPersistenceSupported() {
    // This feature is part of the preview 1.5 req set
    // Since 1.5 isn't fully implemented, just check that the 
    // method is defined.
    // Once 1.5 is implemented, we can replace this with
    // Office.context.requirements.isSetSupported('Mailbox', 1.5)
    return Office.context.mailbox.addHandlerAsync !== undefined;
  };

})();