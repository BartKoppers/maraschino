$(document).ready(function() {
  // helper functions
  var settings_buttons = '<div class="module_settings"><span>Settings</span></div><div class="module_remove"><span>Remove</span></div>';
  // where all polls will reside
  var timeOuts = new Array([]);

  function construct_inactive_module(name, title) {
    return '<div id="' + name + '_inactive" class="inactive_module" data-module="' + name + '">' + settings_buttons + '<h2>' + title + '</h2></div></div>';
  }

  function confirmation_dialog(customsettings) {
    var settings = {
      question: 'Are you sure?',
      confirm: function() {},
      cancel: function() {}
    };

    if (customsettings !== undefined) {
      $.extend(settings, customsettings);
    }

    var dialog = '<div id="confirmation_dialog" class="dialog"><h3>' + settings.question + '</h3><div class="choices"><div class="confirm">Yes</div><div class="cancel">No</div></div></div>';

    $('body').append(dialog);

    $('#confirmation_dialog').showPopup({
      dispose: true,
      on_confirm: settings.confirm,
      on_close: settings.cancel
    });
  }

  function validate_form(form) {
    var valid = true;
    var required = $(form).find('.required');

    required.each(function() {
      var formrow = $(this).closest('.formrow');

      if ($(this).val() === '') {
        valid = false;
        formrow.addClass('invalid');

      } else {
        formrow.removeClass('invalid');
      }
    });

    return valid;
  }

  function popup_message(message) {
    var popup = $('<div id="popup_message" class="dialog"><div class="close">x</div><p>' + message + '</p><div class="choices"><div class="cancel">OK</div></div></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });
  }

  // get/poll module

  function get_module(module, customsettings) {
    var settings = {
      poll: 0,
      placeholder: $('.placeholder[data-module=' + module + ']'),
      params: []
    };

    if (customsettings !== undefined) {
      $.extend(settings, customsettings);
    }

    var url = WEBROOT + '/xhr/' + module;

    for (var i=0; i < settings.params.length; i++) {
      url += '/' + settings.params[i];
    }

    var module_ele = $('#' + module);

    if (!module_ele.hasClass('edit_settings')) {
      $.get(url, function(data) {
        // if module is already on page
        if (module_ele.length > 0) {

          // if module has been returned by the XHR view
          if ($(data).attr('id') === module) {
            module_ele.replaceWith(data);

            // else placeholder has been returned by the XHR view
          } else {
            module_ele.fadeOut(200, function() {
              $(this).replaceWith(data);
            });
          }

          // placeholder is on page
        } else {
          var new_module = $(data).hide();
          settings.placeholder.replaceWith(new_module);
          $('.module[data-module=' + module + ']').fadeIn(200);
        }
      });
    }

    // poll
    if (settings.poll !== 0) {
      var timer = module+'_timer';
      if(timer){
        clearTimeout(timeOuts[timer]);
        timeOuts[timer] = setTimeout(function() {
          get_module(module, {
            poll: settings.poll,
            params: [settings.params]
          });
        }, settings.poll * 1000);
      }
    }
  }

  // initialise modules on page load

  function init_modules() {
    $('.placeholder:not(.initialised)').each(function() {
      $(this).addClass('initialised');
      var delay = $(this).data('delay');
      if (delay === undefined) {
        get_module($(this).data('module'), {
          poll: $(this).data('poll')
        });
      } else {
        var module = $(this).data('module');
        var poll = $(this).data('poll');
        setTimeout(function() {
          get_module(module, {
            poll: poll
          });
        }, delay * 1000);
      }
    });
  }

  init_modules();

  // currently playing

  var currently_playing = setTimeout(function() {
      get_currently_playing();
    }, 5000
  );

  function get_currently_playing() {
    $.get(WEBROOT + '/xhr/plex/now_playing', function(data) {
      if (data.playing === false) {

        // hide currently playing
        $('#currently_playing').slideUp(200, function() {
          $(this).remove();
        });

        currently_playing_id = null;

      } else {
        var currently_playing_module = $('#currently_playing');

        if (currently_playing_module.length > 0) {
          currently_playing_module.replaceWith(data);

        } else {
          module = $(data).hide();
          $('body').append(module);
          $('#currently_playing').slideDown(200);
        }
      }
      currently_playing = setTimeout(function() { get_currently_playing(); }, 5000 );
    });
  }


  // post trakt shout

  $(document).on('click', '#add_shout .submit', function() {
    var add_shout = $('#add_shout');
    var spoiler = $('.spoiler_check');
    var textarea = add_shout.find('textarea');
    var submit_wrapper = add_shout.find('.submit_wrapper');

    if (textarea.val().length === 0) {
      var error_message = submit_wrapper.find('p');

      if (error_message.length === 0) {
        submit_wrapper.append('<p>');
        error_message = submit_wrapper.find('p');
      }

      error_message.text('You need to enter a shout.');
      return false;
    }

    var type = add_shout.data('type');

    var dict = {
      type: type,
      itemid: add_shout.data('itemid'),
      shout: textarea.val()
    };

    if (spoiler.is(':checked')) {
      dict['spoiler'] = 'true';
    }
    else {
      dict['spoiler'] = 'false';
    }

    if (type === 'episode') {
      dict['season'] = add_shout.data('season');
      dict['episode'] = add_shout.data('episode');
    }

    submit_wrapper.addClass('xhrloading');

    $.post(WEBROOT + '/xhr/trakt/add_shout', dict, function(data) {
      submit_wrapper.removeClass('xhrloading');
      submit_wrapper.find('p').remove();
      textarea.val('');

      if (data.status === 'error') {
        submit_wrapper.append('<p>There was a problem submitting your shout.</p>');
        return false;
      }

      if ($(data).attr('id') === 'trakt') {
        $('#trakt').replaceWith(data);
      }
    });
  });

  /*** PLEX ***/
  // tutorial settings save on change input
  $(document).on('change', '#tutorial input#myPlex_username, #tutorial input#myPlex_password', function(event) {
    event.preventDefault();
    if ($('#tutorial input#myPlex_username').val() === "" || $('#tutorial input#myPlex_password').val() === "" ) {
      return;
    }
    var settings = $('#tutorial input').serializeArray();
    settings[0].name = 'myPlex_'+settings[0].name;
    settings[1].name = 'myPlex_'+settings[1].name;
    $.post(WEBROOT + '/xhr/plex/tutorial_save/',
      { settings: JSON.stringify(settings) }, function(data) {
        if(data.success){
          $.get(WEBROOT+'/xhr/plex/listServers/', function(data) {
            if(data.success){
              $('#server_settings .submenu ul').html('');
              for (var i = 0; i < data.servers.length; i++) {
                $('#server_settings .submenu ul').append('<li class="switch_server" data-server_id="'+data.servers[i][1]+'">'+data.servers[i][0]+'</li>');
              }
            } else {
              popup_message(data.msg);
            }
          });
        } else {
          popup_message('Could not save myPlex info: ' + data.msg);
        }
      }
    );
  });

  $(document).on('click', 'div#plex.module .plexMenu li, #plex ul.list li', function(){
    $(this).children().css('background', 'url('+WEBROOT+'/static/images/xhrloading.gif) no-repeat center').html('&nbsp;');
    id = $(this).data('key');
    $.get(WEBROOT + '/xhr/plex/'+id, function(data){
      $('div#plex.module').replaceWith($(data));
    });
  });

  $(document).on('click', 'div#plex div.actions ul li.refresh', function() {
    event.preventDefault();
    el = $(this);
    css_loading_gif(el);
    var request = $.get(WEBROOT + '/xhr/plex/refresh/' + $(this).data('id'));
    request.error(function() {
      css_error_image(el);
    });
    request.success(function() {
      css_success_image(el);
    });
  });

  $(document).on('change keydown keyup search', '#plex .filter', function(e){
    var filter = $(this).val().toLowerCase();
    $('#plex .section li').filter(function(index) {
      console.log($(this));
      return $(this).attr('filter').toLowerCase().indexOf(filter) < 0;
    }).css('display', 'none');
    $('#plex .section li').filter(function(index) {
      return $(this).attr('filter').toLowerCase().indexOf(filter) >= 0;
    }).css('display', '');
    if(e.which == 13){
      $('#plex .section li:visible:first').click();
    }
  });

  $(document).on('click', '#server_settings li.switch_server', function() {
    if ($(this).hasClass('switch_server')) {
      var li = $(this);

      $.get(WEBROOT + '/xhr/switch_server/' + $(this).data('server_id'), function(data) {
        if (data.status === 'error') {
          popup_message('There was an error switching Plex servers.');
          return;
        }

        li.closest('ul').find('.active').removeClass('active');
        li.addClass('active');

        $.get(WEBROOT + '/xhr/plex/onDeck', function(data){
          $('div#plex.module').replaceWith($(data));
        });
      });
    }
  });

  $(document).on('change', 'select#change_movies, select#change_albums, select#change_episodes, select#change_photos', function(event) {
    var parent = $(this).parent(".module").attr('id');
    $.get(WEBROOT + '/xhr/'+ parent +'/'+$(this).val(), function(data){
      $('div#'+parent+'.module').replaceWith($(data));
    });
  });

  /*** END PLEX ***/

  /*** SICKBEARD ***/

  // Loading wheel on menu click
  $(document).on('click', '#sickbeard .menu li', function() {
    $(this).children().css('background', 'url('+WEBROOT+'/static/images/xhrloading.gif) no-repeat center').html('&nbsp;');
  });

  // Search Episode Functionality on Magnifying Glass png
  $(document).on('click', '#sickbeard .coming_ep div.options img.search', function(){
    $(this).attr('src', WEBROOT + '/static/images/xhrloading.gif');
    var ep = $(this).attr('episode');
    var season = $(this).attr('season');
    var id = $(this).attr('id');
    $.get(WEBROOT + '/xhr/sickbeard/search_ep/'+id+'/'+season+'/'+ep)
    .success(function(data){
      if(data.result === 'success'){
        $('#sickbeard #'+id+'_'+season+'_'+ep+' div.options img.search').attr('src', WEBROOT + '/static/images/yes.png');
      } else {
        $('#sickbeard #'+id+'_'+season+'_'+ep+' div.options img.search').attr('src', WEBROOT + '/static/images/no.png');
      }
    })
    .error(function(){
      popup_message('Could not reach SickBeard.');
    });
  });

  // Air time on hover
  $(document).on('hover', '#sickbeard .coming_ep', function(){
    var id = ($(this).attr('id'));
  });


  // Load show info from banner display
  $(document).on('click', '#sickbeard .coming_ep .options img.banner', function(){
    var tvdb = $(this).attr('id');
    $.get(WEBROOT + '/xhr/sickbeard/get_show_info/'+tvdb, function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Plot display function
  $(document).on('mouseenter', '#sickbeard .coming_ep .details .plot-title', function(){
    $(this).toggle();
    var id = $(this).closest('div.coming_ep').attr('id');
    $('#sickbeard #'+id+' .details .plot').toggle();
  });

  // Plot hide function
  $(document).on('mouseleave', '#sickbeard .coming_ep', function(){
    var id = $(this).attr('id');
    $('#sickbeard #'+id+' .details .plot-title').show();
    $('#sickbeard #'+id+' .details .plot').hide();
  });

  // Toggle missed episodes
  $(document).on('click', '#sickbeard #missed', function(){
    $('#sickbeard .missed').toggle();
  });

  // All Shows menu
  $(document).on('click', '#sickbeard .menu .all', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_all', function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Coming episodes Menu
  $(document).on('click', '#sickbeard .menu .upcoming', function(){
    $.get(WEBROOT + '/xhr/sickbeard', function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // History menu
  $(document).on('click', '#sickbeard .menu .history', function(){
    $.get(WEBROOT + '/xhr/sickbeard/history/30', function(data){
      $('#sickbeard').html($(data).html());
      $('#sickbeard .menu').prepend('<li class="snatched" title="View snatched"><span>Snatched</span></li>');
    });
  });

  $(document).on('click', '#sickbeard .menu li.snatched', function(){
    $('#sickbeard .history .Snatched').toggle();
    $(this).toggleClass('active');
    $(this).children().css('background', 'url('+WEBROOT+'/static/images/snatched.png) no-repeat center').html('Snatched');
  });

  // Show Menu
  $(document).on( 'click', '#sickbeard .menu-icon', function(){
    $('#sickbeard .menu').fadeToggle(200);
  });

  // Show info
  $(document).on('click', '#sickbeard #sickbeard-list ul', function(){
    var id = $(this).attr('id');
    $.get(WEBROOT + '/xhr/sickbeard/get_show_info/'+id, function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Episode list back button functionality
  $(document).on('click', '#sb_content > #show .sb-back', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_all', function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Season info
  $(document).on('click', '#sb_content > #show ul.seasons li', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_season/'+$(this).attr('tvdbid')+'/'+$(this).attr('season'), function(data){
      $('#sickbeard').replaceWith(data);
      $('#sickbeard .episode-list .tablesorter').tablesorter({sortList: [[0,0]]});
    });
  });

  // Going into episode info
  $(document).on('click', '#sickbeard .episode-list #season tbody tr', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_ep_info/'+$(this).attr('link'), function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Episode info back button functionality
  $(document).on('click', '#sickbeard .episode-info div.back', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_season/'+$(this).attr('tvdbid')+'/'+$(this).attr('season'), function(data){
      $('#sickbeard').replaceWith(data);
      $('#sickbeard .episode-list .tablesorter').tablesorter({sortList: [[0,0]]});
    });
  });

  // Back Button Episode List
  $(document).on('click', '#sickbeard .episode-list >.back', function(){
    $.get(WEBROOT + '/xhr/sickbeard/get_show_info/'+$(this).attr('tvdbid'), function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Show Banner manager display
  $(document).on('click', '#sickbeard #show .banner .options' , function(){
    if($(this).hasClass('open')){  // closing
      $('#sickbeard #show .banner').transition({ y: '0px' });
    } else { // opening
      $('#sickbeard #show .banner').transition({ y: '-40px' });
    }
    $(this).toggleClass('open');
  });

  // Delete show function
  $(document).on('click', '#sickbeard #show .manage .delete' , function(){
    var id = $('#sickbeard #show .manage').attr('tvdbid');
    $.get(WEBROOT + '/xhr/sickbeard/delete_show/'+id)
    .success(function(data){
      popup_message(data);
    })
    .error(function(){
      popup_message('Could not reach Sickbeard.');
    });
  });

  // Refresh show function
  $(document).on('click', '#sickbeard #show .manage .refresh' , function(){
    var id = $('#sickbeard #show .manage').attr('tvdbid');
    $.get(WEBROOT + '/xhr/sickbeard/refresh_show/'+id)
    .success(function(data){
      popup_message(data);
    })
    .error(function(){
      popup_message('Could not reach Sickbeard.');
    });
  });

  // Update show function
  $(document).on('click', '#sickbeard #show .manage .update' , function(){
    var id = $('#sickbeard #show .manage').attr('tvdbid');
    $.get(WEBROOT + '/xhr/sickbeard/update_show/'+id)
    .success(function(data){
      popup_message(data);
    })
    .error(function(){
      popup_message('Could not reach Sickbeard.');
    });
  });

  // Shutoff function
  $(document).on('click', '#sickbeard div.powerholder .power', function(){
    $.get(WEBROOT + '/xhr/sickbeard/shutdown')
    .success(function(data){
      popup_message(data);
    })
    .error(function(){
      popup_message('Could not reach Sickbeard.');
    });
  });

  // Restart Function
  $(document).on('click', '#sickbeard div.powerholder .restart', function(){
    $.get(WEBROOT + '/xhr/sickbeard/restart')
    .success(function(data){
      popup_message(data);
    })
    .error(function(){
      popup_message('Could not reach Sickbeard.');
    });
  });

  // Log function
  $(document).on('click', '#sickbeard div.powerholder .log', function(){
    $.get(WEBROOT + '/xhr/sickbeard/log/error', function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Log info level change
  $(document).on('change', '#sickbeard #log .level', function(){
    var level = $('#sickbeard #log .level').attr('value');
    $.get(WEBROOT + '/xhr/sickbeard/log/'+level, function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  // Load search template
  $(document).on('click', '#sickbeard div.powerholder .add', function(){
    $.get(WEBROOT + '/xhr/sickbeard/search/')
    .success(function(data){
      $('#sickbeard').replaceWith(data);
    })
    .error(function(){
      popup_message('Could not reach Maraschino.');
    });
  });

  // Load search results
  $(document).on('keypress', '#sickbeard .powerholder input', function(e){
    if(e.which == 13){
      e.preventDefault();
      add_loading_gif($('#sickbeard .powerholder .loading'));
      var name = $(this).val();
      params = '';
      if(name !== ''){
        params = 'name='+name;
      }
      $.get(WEBROOT + '/xhr/sickbeard/search/?'+params)
      .success(function(data){
        $('#sickbeard').replaceWith(data);
      })
      .error(function(){
        popup_message('Could not reach Maraschino.');
      });
    }
  });

  // Add show function
  $(document).on('click', '#sickbeard #sb_search #result li', function(){
    var status = $('#sb_search #status').find(':selected').val();
    var lang = $('#sb_search #lang').find(':selected').val();
    var initial = $('#sb_search #quality').find(':selected').val();
    var params = 'lang='+lang+'&status='+status+'&initial='+initial;
    $.get(WEBROOT + '/xhr/sickbeard/add_show/'+$(this).attr('tvdbid')+'/?'+params)
    .success(function(data){
      popup_message(data);
    })
    .error(function(data){
      popup_message('Could not reach Maraschino.');
    });
  });

  // Magnifying Glass Episode INFO
  $(document).on('click', '#sickbeard .episode-info .status .search', function(){
    $(this).attr('src', WEBROOT + '/static/images/xhrloading.gif');
    var ep = $(this).attr('episode');
    var season = $(this).attr('season');
    var id = $(this).attr('id');
    $.get(WEBROOT + '/xhr/sickbeard/search_ep/'+id+'/'+season+'/'+ep)
    .success(function(data){
      console.log(data.result);
      if(data.result === "failure"){
        $('#sickbeard .episode-info .status .search').attr('src', WEBROOT + '/static/images/no.png');
      } else {
        $('#sickbeard .episode-info .status .search').attr('src', WEBROOT + '/static/images/yes.png');
      }
    })
    .error(function(){
      popup_message('There was a problem with SickBeard.');
    });
  });

  // Episode set status info
  $(document).on('change', '#sickbeard .episode-info .status select', function(){
    var ep = $(this).attr('episode');
    var season = $(this).attr('season');
    var id = $(this).attr('id');
    var status = this.value;
    $.get(WEBROOT + '/xhr/sickbeard/set_ep_status/'+id+'/'+season+'/'+ep+'/'+status)
    .success(function(data){
      if (data.status !== 'success') {
        popup_message('An error ocurred: '+data);
      }
    })
    .error(function(){
      popup_message('There was a problem with SickBeard.');
    });
  });

  /******  END SICKBEARD Functions  *******/

  /*********** EXTRA SETTINGS *************/

  $(document).on('click', '#extra_settings', function() {
    if (!$(this).hasClass('active')) {
      $(this).addClass('active');
    }
  });

  /********* START SABNZBD ***********/

  $(document).on('click', '#sabnzbd .inner #status', function(){
    var state = false;
    if($(this).attr('status').toLowerCase() === 'true'){
      //queue is paused
      state = 'resume';
    } else {
      state = 'pause';
    }
    $.get(WEBROOT + '/xhr/sabnzbd/queue/'+state+'/')
    .success(function(data){
      if(data.status === 'true'){
        get_module('sabnzbd');
      }
    })
    .error(function(){
      popup_message('Problem reaching Maraschino on /xhr/sabnzbd/queue/<var>/');
    });
  });

  $(document).on('keypress', '#sabnzbd .inner .speed input', function(e){
    if(e.which == 13){
      $.get(WEBROOT + '/xhr/sabnzbd/speedlimit/'+$(this).val())
      .success(function(data){
        if(data.status == 'true'){
          get_module('sabnzbd');
        }
      })
      .error(function(){
        popup_message('Problem reaching Maraschino on /xhr/sabnzbd/speedlimit/<var>/');
      });
    }
  });

  $(document).on('click', '#sabnzbd .inner .queue-title', function(){
    $('#sabnzbd .inner .queue').toggle();
    if($('#sabnzbd .inner .queue').css('display') != 'none' ){
      get_module('sabnzbd', { poll:10, params: [ 'show' ] });
    } else {
      get_module('sabnzbd', { poll:10 });
    }
  });

  $(document).on('click', '#sabnzbd .inner .queue table tr td.pause', function(){
    var id = $(this).parent('tr').attr('id');
    var state = $(this).parent('tr').data('action');
    $.get(WEBROOT + '/xhr/sabnzbd/individual/'+state+'/'+id)
    .success(function(data){
      if(data.status == 'true'){
        get_module('sabnzbd', { poll:10, params: [ 'show' ] });
      }
    })
    .error(function(){
      popup_message('Problem reaching Maraschino on /xhr/sabnzbd/individual/<var>/<var>');
    });
  });

  $(document).on('click', '#sabnzbd .inner .queue table tr td.delete', function(){
    var id = $(this).parent('tr').attr('id');
    $.get(WEBROOT + '/xhr/sabnzbd/individual/delete/'+id)
    .success(function(data){
      if(data.status == 'true'){
        get_module('sabnzbd', { poll:10, params: [ 'show' ] });
      }
    })
    .error(function(){
      popup_message('Problem reaching Maraschino on /xhr/sabnzbd/individual/delete/<var>');
    });
  });


  $(document).on('mouseenter', '#sabnzbd .status img', function(){
    $('#sabnzbd .pause_list').show();
    });

  $(document).on('mouseleave', '#sabnzbd .status', function(){
    $('#sabnzbd .pause_list').hide();
    });

  $(document).on('click', '#sabnzbd .status .pause_time', function(e){
    e.stopPropagation();
    var time = $(this).data('time');
    $.get(WEBROOT + '/xhr/sabnzbd/queue/pause/'+time)
    .success(function(data){
      $('#sabnzbd .pause_list').hide();
      if(data.status == 'true'){
        get_module('sabnzbd', { poll:10, params: [ 'show' ] });
      }
    })
    .error(function(){
      popup_message('Problem reaching Maraschino on /xhr/sabnzbd/queue/pause/'+time);
    });
  });

  $(document).on('click', '#sabnzbd .status .pause_for', function(){
    $.get(WEBROOT + '/xhr/sabnzbd/custom_pause/', function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('click', '#sabnzbd_pause_dialog .save_pause', function(){
    var time = $('#sabnzbd_pause_dialog input').val();
    if (time) {
      $('#sabnzbd_pause_dialog .close').click();

      $.get(WEBROOT + '/xhr/sabnzbd/queue/pause/'+time)
      .success(function(data){
        $('#sabnzbd .pause_list').hide();
        if(data.status == 'true'){
          get_module('sabnzbd', { poll:10, params: [ 'show' ] });
        }
      })
      .error(function(){
        popup_message('Problem reaching Maraschino on /xhr/sabnzbd/queue/pause/'+time);
      });
    }
  });

  /********* END SABNZBD ***********/

  /********* CouchPotato **********/

  // Loading wheel on menu click
  $(document).on('click', '#couchpotato .menu li', function() {
    $(this).children().css('background', 'url('+WEBROOT+'/static/images/xhrloading.gif) no-repeat center').html('&nbsp;');
  });

  // menu 'wanted' click
  $(document).on('click', '#couchpotato .menu .wanted', function(){
    $.get(WEBROOT + '/xhr/couchpotato/')
    .success(function(data){
      $('#couchpotato').replaceWith(data);
    });
  });

  // menu 'all' click
  $(document).on('click', '#couchpotato .menu .all', function(){
    $.get(WEBROOT + '/xhr/couchpotato/done/')
    .success(function(data){
      $('#couchpotato').replaceWith(data);
    });
  });

  // menu 'history' click
  $(document).on('click', '#couchpotato .menu .history', function(){
    $.get(WEBROOT + '/xhr/couchpotato/history/')
    .success(function(data){
      $('#couchpotato').replaceWith(data);
      if($('span#unread').text() != '0'){
        $('#couchpotato .menu').prepend('<li class="mark_read" title="Mark all notifications as read"><span>Mark All as Read</span></li>');
      }
    });
  });
  // Load search results
  // on enter
  $(document).on('keydown', '#couchpotato .search_div input', function(e) {
    if(e.which == 13){
      var name = $(this).val();
      params = '';
      if(name !== ''){
          params = 'name='+encodeURIComponent(name);
      }
      add_loading_gif($('#couchpotato .search_div .loading'));
      $.get(WEBROOT + '/xhr/couchpotato/search/?'+params)
      .success(function(data){
        $('#couchpotato').replaceWith(data);
      })
      .error(function(){
        popup_message('Could not reach Maraschino.');
      });
    }
  });
  // Search add movie click
  $(document).on('click', '#couchpotato .search ul li .choices .add', function() {
    var imdbid = $(this).parent().parent().data('imdbid');
    var title = $(this).parent().parent().data('title').replace('/','%20');
    var profile = $('#couchpotato .search ul li .choices .profiles').find(':selected').val();
    $.get(WEBROOT + '/xhr/couchpotato/add_movie/'+imdbid+'/'+encodeURIComponent(title)+'/'+profile, function(data) {
      if(data.success){
        popup_message('Movie added successfully');
      } else {
        popup_message('Failed to add movie to CouchPotato');
      }
    });
  });
  // wanted slide option
  $(document).on('click', '#couchpotato #cp_content .movie .image', function(e) {
    e.stopPropagation();
    var id = $(this).parent().attr('id');
    var el = $('#'+id);
    el.toggleClass('selected');
    if(el.hasClass('selected')){
      if ($(this).parent().hasClass('releases')) {
        var x_move = $('#couchpotato').width() - ($(this).width() * 1.55);
        var ul_width = x_move - 40;
        x_move = x_move + 'px';
        ul_width = ul_width + 'px';
        $('#couchpotato .release_list').css('width', ul_width);
        var option = '#couchpotato #cp_content .options.'+id;
        if($(option + ' .release_list').text() === ''){
          $.get(WEBROOT + '/xhr/couchpotato/release/for_movie/'+$(option).data('cpid'), function(data) {
            if(data.success){
              $(data.releases).each(function(index, el) {
                if(el.info.name){
                  $(option + ' .release_list ul').append(
                    '<li data-id="'+ el.id +'" data-imdbid="'+id+'" title="Provider: '+el.info.provider+'&#13;Size: '+el.info.size+'MB">'+
                    '<a href="'+el.info.detail_url+'" target="_blank">'+el.info.name+'</a>'+
                    '<img id="download" class="release_btn" src="'+ WEBROOT + '/static/images/download.png" data-action="download" />'+
                    '<img id="delete" class="release_btn" src="'+ WEBROOT + '/static/images/no.png" data-action="delete" /></li>'
                  );
                }
              });
            } else {
              popup_message('Failed to get releases for movie id: '+id);
            }
          });
        }
        el.transition({x: x_move, opacity: 0.7}, function(){
          $('#couchpotato #cp_content .options.'+id).transition({opacity: 1});
        });
      }
      else {
        el.transition({x: '30px', opacity: 0.7}, function(){
          $('#couchpotato #cp_content .options.'+id).transition({opacity: 1});
        });
      }
    } else {
      $('#couchpotato #cp_content .options.'+id).transition({opacity: 0}, function(){
        el.transition({opacity: 1, x: '0px'});
      });
    }
  });
  // release action (download, remove, ignore)
  $(document).on('click', '#couchpotato .release_list .release_btn', function() {
    var id = $(this).parent().data('id');
    var el = $(this);
    var action = el.data('action');
    el.attr('src', WEBROOT + '/static/images/xhrloading.gif');

    $.get(WEBROOT+'/xhr/couchpotato/release/'+action+'/'+id, function(data) {
      if(data.success) {
        if(action === 'delete') {
          el.parent().transition({opacity: 0, duration: 1000}, function(){
            el.parent().remove();
          });
        } else {
          popup_message('Successfully sent download request');
          $.get(WEBROOT+'/xhr/couchpotato/', function(data) {
            $('#couchpotato').replaceWith(data);
          });
        }
      } else {
        popup_message('Failed to '+action+' release, see log for more datials');
      }
    });
  });
  // wanted delete, info delete
  $(document).on('click', '#couchpotato #cp_content .options img.delete, #couchpotato #info .options img.delete', function(selector) {
    var id = $(this).parent().data('cpid');
    var imdbid = $(this).parent().data('imdbid');
    var el = $(this);
    el.attr('src', WEBROOT + '/static/images/xhrloading.gif');
    $.get(WEBROOT+'/xhr/couchpotato/delete_movie/'+id, function(data) {
      if(data.success){
        if(el.parent().parent().parent().attr('id') === 'info'){
          el.attr('src', WEBROOT + '/static/images/yes.png');
          $.get(WEBROOT + '/xhr/couchpotato/done/')
          .success(function(data){
            $('#couchpotato').replaceWith(data);
          });
        } else {
          $('#couchpotato #cp_content #'+imdbid).transition({opacity: 0, duration: 1000}, function(){
            $(this).remove();
            $('#couchpotato #cp_content .options.'+imdbid).remove();
          });
        }
      } else {
        popup_message('Failed to delete movie, see log for more datials');
        $('#couchpotato #cp_content #'+imdbid).transition({opacity: 1, x: '0px'});
      }
    });
  });
  // wanted refresh, info refresh
  $(document).on('click', '#couchpotato #cp_content .options img.search, #couchpotato #info .options img.search', function() {
    var id = $(this).parent().data('cpid');
    var imdbid = $(this).parent().data('imdbid');
    var el = $(this);
    el.attr('src', WEBROOT + '/static/images/xhrloading.gif');
    $.get(WEBROOT+'/xhr/couchpotato/refresh_movie/'+id, function(data) {
      if(data.success){
        if(el.parent().parent().attr('id') === 'info'){
          el.attr('src', WEBROOT + '/static/images/yes.png');
        } else {
          el.attr('src', WEBROOT + '/static/images/search.png');
        }
      } else {
        popup_message('Failed to refresh movie, see log for more datials');
      }
    });
  });
  // movie info
  $(document).on('click', '#couchpotato .movie', function() {
    var id = $(this).data('cpid');
    add_loading_gif($(this));
    $.get(WEBROOT + '/xhr/couchpotato/get_movie/'+id, function(data) {
      $('#couchpotato').replaceWith(data);
    });
  });
  // movie info change profile
  $(document).on('change', '#couchpotato #info td.profile select.profiles', function() {
    var movieid = $(this).data('id');
    var profileid = $(this).find(':selected').val();
    var td = $(this).parent();
    add_loading_gif(td);
    $.get(WEBROOT + '/xhr/couchpotato/edit_movie/'+movieid+'/'+profileid+'/', function(data){
      if(data.success){
        remove_loading_gif(td);
      } else {
        popup_message('Failed to get qulaity profiles from CouchPotato');
      }
    });
  });
  // img popup
  $(document).on('click', '#couchpotato #info .thumbs img', function() {
    var popup = $('<div id="cp_image" class="dialog" align="center"><div class="close">x</div><img src ="'+$(this).attr('src')+'" style="max-height: 100%;max-width:100%;" /></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });
    $(document).on('keydown', 'body', function() {
      $('#cp_image .close').click();
      $(document).off('keydown', 'body');
    });
  });
  // shutdown
  $(document).on('click', '#couchpotato div.powerholder a.power', function() {
    $('#couchpotato div.powerholder a.power img').attr('src', WEBROOT + '/static/images/yes.png');
    $.get(WEBROOT + '/xhr/couchpotato/shutdown/', function(data) {
      console.log(data);
      if(data.success){
        $('#couchpotato div.powerholder a.power img').attr('src', WEBROOT + '/static/images/yes.png');
        var x = setInterval(function(){
          $('#couchpotato').remove();
          clearInterval(x);
        }, 3000);
      }
    });
  });
  // restart
  $(document).on('click', '#couchpotato div.powerholder a.restart', function() {
    $('#couchpotato div.powerholder a.restart img').attr('src', WEBROOT + '/static/images/yes.png');
    $.get(WEBROOT + '/xhr/couchpotato/restart/', function(data) {
      console.log(data);
      if(data.success){
        $('#couchpotato div.powerholder a.restart img').attr('src', WEBROOT + '/static/images/yes.png');
        var x = setInterval(function(){
          $.get(WEBROOT + '/xhr/couchpotato/')
          .success(function(data){
            $('#couchpotato').replaceWith(data);
            clearInterval(x);
          });
        }, 3000);
      }
    });
  });
  // log
  $(document).on('click', '#couchpotato div.powerholder a.log', function() {
    $.get(WEBROOT + '/xhr/couchpotato/log/', function(data){
      if(data){
        $('#couchpotato').replaceWith(data);
      }
    });
  });
  // log level change
  $(document).on('change', '#couchpotato #cp_log select.level', function() {
    $.get(WEBROOT + '/xhr/couchpotato/log/' + $(this).find(':selected').val() + '/30/', function(data) {
      $('#couchpotato').replaceWith(data);
    });
  });
  // notification read click
  $(document).on('click', '#couchpotato #history ul li.new', function() {
    var el = $(this);
    $.get(WEBROOT + '/xhr/couchpotato/notification/read/' + $(this).data('id'), function(data) {
        if(data.success){
            el.removeClass('new');
            $('#unread').text($('#unread').text()-1);
        } else {
            popup_message('Failed to mark notification as read, check logs for details');
        }
    });
  });

  // notification read click
  $(document).on('click', '#couchpotato .menu .mark_read', function(e) {
    var el = $(this);
    $.get(WEBROOT + '/xhr/couchpotato/notification/read/', function(data) {
        if(data.success){
            $('#unread').text('0');
            el.hide();
        } else {
            popup_message('Failed to mark notifications as read, check logs for details');
        }
    });
  });

  /********* END CouchPotato ***********/

  /********* SEARCH ***********/

  $(document).on('click', '#activate_search', function (e) {
    if ($(e.target).hasClass('edit')) {
      return;
    }

    var search_enabled = $('body').data('search_enabled') === 'True';

    if (!search_enabled) {
      return;
    }

    if ($('#search').length === 0) {
      $.get(WEBROOT + '/xhr/search/')
        .success(function(data) {
          if (data) {
            $('body').append(data);
            $('#search').hide();
            $('#search').slideDown(300).find('input[type=search]').focus();
          }
        });
    } else {
      $('#search').slideToggle(300);
    }
  });

  $(document).on('keydown', 'body', function(e) {
    alt = (e.altKey) ? true : false;

    if (alt && e.which === 83) {
      e.preventDefault();
      $('#activate_search').click();
    } else if (e.which === 27) {
      $('#search #close').click();
    }
  });

  $(document).on('keypress', '#search form #value', function(e){
    if(e.which == 13){
      e.preventDefault();
      var query = $('#search form #value').val();
      var site = $('#search form #site').val();
      var cat = $('#search form #category').val();
      var maxage = $('#search form #maxage').val();

      if(site === ''){
        popup_message('You must pick a website');
        return false;
      }
      if(!maxage) {
        maxage = '0';
      }

      var url = '/search/'+site+'/'+cat+'/'+maxage+'/';
      if(query !== ''){
        url = url + query;
      }

      $('#search .searching').show();
      $.get(WEBROOT + url, function(data){
        $('#search .searching').hide();
        if(data['error']){
          popup_message(data['error']);
          $('#search input[type=search]').blur();
        } else {
          $('#search').replaceWith(data);
          byteSizeOrdering();
          $('#search form #value').val(query);
          $('#search #results .tablesorter').tablesorter({headers: { 2: { sorter: 'filesize'}}});
        }
      });
    }
  });

  $(document).on('change', '#search form #site', function(){
    var value = $(this).val();
    var query = $('#search form #value').val();
    $('#search form #category').remove();
    $('#search .searching').show();

    $.get(WEBROOT + '/xhr/search/'+value)
    .success( function(data){
      $('#search').replaceWith(data);
      $('#search form #value').val(query);
    });
  });

  $(document).on('click', '#search #results table tbody tr td:first-child img', function(){
    var link = $(this).attr('nzb-link');
    $.post(WEBROOT + '/sabnzbd/add/',{url: link}, function(data){
      data = eval('(' + data + ')');
      if(data['status']){
        popup_message('Successfully added to SabNZBd');
      } else {
        popup_message(data['error']);
      }
    });
  });

  $(document).on('click', '#search #close', function() {
    $(search).slideUp(300);
  });

  $(document).on('click', '#add_newznab', function() {
    var url = WEBROOT + '/search/newznab_dialog';
    if ($(this).hasClass('edit')){
      url = url + '/' + $(this).data('id');
    }

    $('#search_settings_dialog .save').click();
    $.get(url, function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('click', '#add_edit_newznab_dialog .choices .save', function() {
    var form = $('#add_edit_newznab_dialog form');

    if (!validate_form(form)) {
      return false;
    }

    var settings = form.serialize();
    $.post(WEBROOT + '/search/add_edit_newznab/', settings, function(data) {
      if (!data.error) {
        $('#add_edit_newznab_dialog .close').click();
        $('#search_settings').click();
        $('#search').replaceWith(data);
      }
    });
  });

  $(document).on('click', '#add_edit_newznab_dialog .choices .delete', function() {
    var newznab_id = $('#add_edit_newznab_dialog input[name=newznab_id]').val();
    $.get(WEBROOT + '/search/delete_newznab/' + newznab_id, function(data) {
      if (!data.status) {
        $('#search').replaceWith(data);
        $('#add_edit_newznab_dialog .close').click();
        $('#search_settings').click();
      }
    });
  });

  /********* END SEARCH ***********/

  /********* START NZBGET ***********/
  // queue pause/resume
  $(document).on('click', '#nzbget #status', function() {
    action = 'pause';
    if($(this).data('paused') === 'True'){
      action = 'resume';
    }
    $.get(WEBROOT + '/xhr/nzbget/queue/' + action, function(data) {
      if(data.success){
        $.get(WEBROOT + '/xhr/nzbget/', function(data) {
          if(data){
            $('#nzbget').replaceWith(data);
          } else {
            popup_message('Maraschino could not reach NZBGet');
          }
        });
      } else {
        popup_message('Problem reaching Maraschino: '+ data);
      }
    });
  });
  // individual pause/resume
  $(document).on('click', '#nzbget .inner div.queue table tr td.pause', function() {
    var action = $(this).parent().data('action');
    var id = $(this).parent().attr('id');
    $.get(WEBROOT + '/xhr/nzbget/individual/'+ id + '/' + action, function(data) {
      if(data.success){
        $.get(WEBROOT + '/xhr/nzbget/', function(data) {
          if(data){
            $('#nzbget').replaceWith(data);
          } else {
            popup_message('Maraschino could not reach NZBGet');
          }
        });
      } else {
        popup_message('Problem reaching Maraschino: '+ data);
      }
    });
  });
  // individual delete
  $(document).on('click', '#nzbget .inner div.queue table tr td.delete', function() {
    var id = $(this).parent().attr('id');
    $.get(WEBROOT + '/xhr/nzbget/individual/'+ id + '/delete/', function(data) {
      if(data.success){
        $.get(WEBROOT + '/xhr/nzbget/', function(data) {
          if(data){
            $('#nzbget').replaceWith(data);
          } else {
            popup_message('Maraschino could not reach NZBGet');
          }
        });
      } else {
        popup_message('Problem reaching Maraschino: '+ data);
      }
    });
  });
  // Speed limit - erase the current value, give focus and switch to kb's
  $(document).on('click', '#nzbget .inner div.speed input', function() {
    $(this).attr('value', '');
    $(this).parent().html($('<div>').append($(this).clone()).html()+'KB');
    $('#nzbget .inner div.speed input').focus();
  });
  // send new speed limit when pressing enter
  $(document).on('keypress', '#nzbget .inner div.speed input', function(e) {
    if(e.which == 13){
      var speed = $(this).attr('value');
      $.get(WEBROOT + '/xhr/nzbget/set_speed/' + speed, function(data) {
        if(data.success){
          $.get(WEBROOT + '/xhr/nzbget/', function(data) {
            if(data){
              $('#nzbget').replaceWith(data);
            } else {
              popup_message('Maraschino could not reach NZBGet');
            }
          });
        } else {
          popup_message('Problem reaching Maraschino: '+ data);
        }
      });
    }
  });
  /********* END NZBGET ***********/

  /********* TableSorter byte size sorting ***********/
  function byteSizeOrdering() {
    jQuery.tablesorter.addParser(
    {
      id: 'filesize',
      is: function (s)
      {
        return s.match(new RegExp(/[0-9]+(\.[0-9]+)?\ (KB|B|GB|MB|TB)/i));
      },
      format: function (s)
      {
        var suf = s.match(new RegExp(/(KB|B|GB|MB|TB)$/i))[1];
        var num = parseFloat(s.match(new RegExp(/^[0-9]+(\.[0-9]+)?/))[0]);
        switch (suf)
        {
          case 'B':
            return num;
          case 'KB':
            return num * 1024;
          case 'MB':
            return num * 1024 * 1024;
          case 'GB':
            return num * 1024 * 1024 * 1024;
          case 'TB':
            return num * 1024 * 1024 * 1024 * 1024;
        }
      },
      type: 'numeric'
    });
  }
  /********* END TableSorter byte size sorting ***********/

  /********* Trakt Plus *********/

  $(document).on('click', '#traktplus .addloading', function() {
    var loading = $('#traktplus .loading');
    add_loading_gif(loading);
  });

  $(document).on('click', '#traktplus .button', function() {
    $.get(WEBROOT + '/xhr/trakt/' + $(this).data('xhr_url'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .goto_show', function() {
    $.get(WEBROOT + '/xhr/trakt/summary/show/' + $(this).data('id'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .goto_movie', function() {
    $.get(WEBROOT + '/xhr/trakt/summary/movie/' + $(this).data('id'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .goto_episode', function() {
    $.get(WEBROOT + '/xhr/trakt/summary/episode/' + $(this).data('id') + '/' + $(this).data('season') + '/' + $(this).data('episode'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .get_list', function() {
    $.get(WEBROOT + '/xhr/trakt/' + $(this).data('xhr_url'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .list_link', function(e) {
    e.stopPropagation();
  });

  $(document).on('click', '#traktplus .toggle_hidden', function(e) {
    e.stopPropagation();
  });

  $(document).on('click', '#traktplus .toggle_hidden', function() {
    var arrow = $(this).children('img');
    var div = $(this).next('.hidden');

    if (div.hasClass('active')) {
      div.removeClass('active');
      div.slideUp(200);
      arrow.attr('src', WEBROOT + '/static/images/arrow_down.png');
    }
    else {
      div.addClass('active');
      div.slideDown(200);
      arrow.attr('src', WEBROOT + '/static/images/arrow_up.png');
    }
  });

  $(document).on('click', '#traktplus .trakt_user', function() {
    $.get(WEBROOT + '/xhr/trakt/profile/' + $(this).data('username'), function(data){
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .friend_action', function(e) {
    e.stopPropagation();
    var li = $(this).parent().parent();
    var action = $(this).data('action');
    var user = $(this).data('user');

    $.get(WEBROOT + '/xhr/trakt/friend/' + action + '/' + user, function(data){
      if (data.status == 'successful') {
        if (action == 'approve') {
          li.children('.req_buttons').remove()
          li.css('background', 'url(' + WEBROOT + '/static/images/alpha/fff_10.png)');
          popup_message(user + ' has been added to friends list');
        }
        else {
          li.transition({opacity: 0, duration: 1000}, function(){
            li.remove();
          });
          popup_message(user + 's friend request has been denied');
        }
      }
      else {
        popup_message(data.status);
      }
    });
  });

  $(document).on('mouseenter', '#traktplus .poster', function(){
      $(this).find('.item_info').hide();
      $(this).find('.item_rate').show();
      $(this).find('.overlay_menu').show();
    });
  $(document).on('mouseleave', '#traktplus .poster', function(){
      $(this).find('.item_rate').hide();
      $(this).find('.overlay_menu').hide();
      $(this).find('.item_info').show();
    });

  function title_str (str) {
    return (str + '').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
  }

  $(document).on('click', '#traktplus .poster .rate', function() {
    var poster = $(this).parent().parent().parent();
    var button = $(this);
    var type = poster.data('type');
    var rating = $(this).data('rating');
    var data = poster.dataset();
    var unrate = false;

    if (button.hasClass('rated')) {
      data['rating'] = 'unrate';
      unrate = true;
    }
    else {
      data['rating'] = rating;
    }

    button.css('background', 'url(' + WEBROOT + '/static/images/xhrloading.gif)');
    $.post(WEBROOT + '/xhr/trakt/action/rate/' + type + '/', data, function(data){
      if (data.status == 'successful') {
        if (unrate) {
          poster.find('.'+rating).remove();
          button.removeClass('rated');
          button.attr('title', title_str(rating) + 'd');
          popup_message(type + ' successfully unrated');
        }
        else {
          poster.append('<div class="' + rating + '"></div>');
          button.addClass('rated');
          button.attr('title', 'Unrate');
          popup_message(type + ' successfully rated as ' + rating + 'd');
        }
      }
      else {
        popup_message(data.status);
      }
      button.css('background', 'url(' + WEBROOT + '/static/images/trakt/heart-' + rating + '.png)');
    });
  });

  $(document).on('click', '#traktplus .poster .add_customlist', function() {
    var poster = $(this).parent().parent();
    var button = $(this);
    var data = poster.dataset();

    button.css('background', 'url(' + WEBROOT + '/static/images/xhrloading.gif)');
    $.post(WEBROOT + '/xhr/trakt/get_lists/', data, function(data){
      button.css('background', 'url(' + WEBROOT + '/static/images/trakt/list.png)');
      $('#traktplus').replaceWith(data);
    });
  });

  $(document).on('change', '#traktplus .custom_lists .list', function() {
    var togglebar = $('#traktplus .custom_lists .toggle_hidden');
    var arrow = togglebar.children('img');
    var form = $('#traktplus .custom_lists .add_list_form');

    if ($(this).val() != 'none') {
      if( form.is(':visible') ) {
        arrow.attr('src', WEBROOT + '/static/images/arrow_down.png');
        form.removeClass('active');
        form.slideUp(200);
      }

      togglebar.hide();
    }
    else {
      togglebar.show();
    }
  });

  $(document).on('click', '#traktplus .custom_lists .save', function() {
    var media = $('#traktplus .list_media').dataset();
    var list_select = $('#traktplus .custom_lists .list').find(':selected');
    var form = $('#traktplus .custom_lists form').serializeArray();
    var data = {};

    if (list_select.val() != 'none') {
      var list = list_select.dataset();
      data = {
        media: JSON.stringify(media),
        list: JSON.stringify(list),
        exist: true
      };
    }
    else {
      data = {
        media: JSON.stringify(media),
        list: JSON.stringify(form),
        exist: false
      };
    }

    $.post(WEBROOT + '/xhr/trakt/add_to_list/', data, function(data){
      remove_loading_gif($('#traktplus .loading'));

      if (data.status == 'successful') {
        if (list_select.val() != 'none') {
        popup_message('successfully added ' + media['title'] + ' to ' + list['name']);
        }
        else {
          popup_message('successfully added ' + media['title'] + ' to ' + form[0]['value']);
        }
      }
      else {
        popup_message(data.status);
      }
    });
  });

  $(document).on('click', '#traktplus .poster .mark_watched', function() {
    var poster = $(this).parent().parent();
    var button = $(this);
    var type = poster.data('type');

    button.css('background', 'url(' + WEBROOT + '/static/images/xhrloading.gif)');
    $.post(WEBROOT + '/xhr/trakt/action/seen/' + type + '/', poster.dataset(), function(data){
      if (data.status == 'successful') {
        poster.append('<div class="watched"></div>');
        button.transition({opacity: 0, duration: 1000}, function(){
          button.remove();
        });
        popup_message(type + ' successfully marked as watched');
      }
      else {
        img.attr('src', WEBROOT + '/static/images/trakt/seen.png');
        popup_message(data.status);
      }
    });
  });

  $(document).on('click', '#traktplus .poster .add_collection', function() {
    var poster = $(this).parent().parent();
    var button = $(this);
    var type = poster.data('type');

    button.css('background', 'url(' + WEBROOT + '/static/images/xhrloading.gif)');
    $.post(WEBROOT + '/xhr/trakt/action/library/' + type + '/', poster.dataset(), function(data){
      if (data.status == 'successful') {
        poster.append('<div class="collection"></div>');
        button.transition({opacity: 0, duration: 1000}, function(){
          button.remove();
        });
        popup_message(type + ' successfully added to collection');
      }
      else {
        img.attr('src', WEBROOT + '/static/images/trakt/collection.png');
        popup_message(data.status);
      }
    });
  });

  $(document).on('click', '#traktplus .poster .add_watchlist', function() {
    var poster = $(this).parent().parent();
    var button = $(this);
    var type = poster.data('type');

    button.css('background', 'url(' + WEBROOT + '/static/images/xhrloading.gif)');
    $.post(WEBROOT + '/xhr/trakt/action/watchlist/' + type + '/', poster.dataset(), function(data){
      if (data.status == 'successful') {
        poster.append('<div class="watchlist"></div>');
        button.transition({opacity: 0, duration: 1000}, function(){
          button.remove();
        });
        popup_message(type + ' successfully added to watchlist');
      }
      else {
        img.attr('src', WEBROOT + '/static/images/trakt/watchlist.png');
        popup_message(data.status);
      }
    });
  });

  $(document).on('click', '#traktplus .media_btn', function(e) {
    e.stopPropagation();
  });

  $(document).on('click', '#traktplus .add_sickbeard', function() {
    $.get(WEBROOT + '/xhr/sickbeard/search/?tvdbid=' + $(this).data('tvdb_id'), function(data){
      $('#sickbeard').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .add_couchpotato', function() {
    $.get(WEBROOT + '/xhr/couchpotato/search/?name=' + encodeURIComponent($(this).data('name')), function(data){
      $('#couchpotato').replaceWith(data);
    });
  });

  $(document).on('click', '#traktplus .trailer', function() {
    $.get(WEBROOT + '/xhr/play/trailer/url/' + encodeURIComponent($(this).data('trailer')));
  });

  $(document).on('click', '#traktplus .recommendations .dismiss', function() {
    var li = $(this).parent().parent().parent();
    var type = li.data('type');
    var img = $(this).children('img');

    img.attr('src', WEBROOT + '/static/images/xhrloading.gif');

    $.post(WEBROOT + '/xhr/trakt/action/dismiss/' + type + '/', li.dataset(), function(data){
      if (data.status == 'successful') {
        li.transition({opacity: 0, duration: 1000}, function(){
          li.remove();
      });
      }
      else {
        img.attr('src', WEBROOT + '/static/images/remove_icon.png');
        popup_message(data.status);
      }
    });
  });

  /********* END Trakt Plus *********/

  /*****WEATHER CLOCK*****/
  setInterval( function() {
    var seconds = new Date().getSeconds();
    $('#weather .sec').text(( seconds < 10 ? '0' : '' ) + seconds);
  }, 1000);

  setInterval( function() {
    var minutes = new Date().getMinutes();
    $('#weather .min').text(( minutes < 10 ? '0' : '' ) + minutes);
  }, 1000);

  //24 hour time
  setInterval( function() {
    var hours = new Date().getHours();
    $('#weather .hours').text(( hours < 10 ? '0' : '' ) + hours);
  }, 1000);

  //12 hour time
  setInterval( function() {
    var hours = new Date().getHours();
    var meridian = 'AM';

    if (hours >= 12) {
      hours = hours -12;
      meridian = 'PM';
    }

    if (hours === 0) {
      hours = 12;
    }

    $('#weather .12hours').text(( hours < 10 ? '0' : '' ) + hours);
    $('#weather .meridian').text(meridian);
  }, 1000);

  $(document).on('click', '#weather #time_banner', function(){
    $('#weather #time_banner .clock').toggle();
    $('#weather #time_banner .current').toggle();
  });

  $(document).on('click', '#weather tr.forecast_title', function(){
    $('#weather tr.forecast').toggle();
  });
  /*****END WEATHER CLOCK*****/

  /*****START IPCamera*****/
  $(document).on('click', '#ipcamera .menu li', function () {
    var text = $(this).text();
    var alternate_text = $(this).data('alternate-text');
    var id = $(this).attr('id');
    if (id === 'more') {
      $('#more_buttons').slideToggle('slow');
    } else if (id === 'stream'){
      $('#webstreamz').slideToggle('slow');
      $('#movement_buttons').slideToggle('slow');
    }
    console.log($(this));
    $(this).children("span").html(alternate_text);
    $(this).data('alternate-text', text);
  });

  $(document).on('click', '#ipcamera .toggle', function () {
    var text = $(this).text();
    var alternate_text = $(this).data('alternate-text');
    var command = false;
    var id = $(this).attr('id');
    if (id === 'resolution'){
      command = 'camera_settings/resolution_' + alternate_text.toLowerCase();
    } else if (id === 'vp') {
      if (text === 'VP') {
        command = 'control_base/vertical_patrol';
      } else {
        command = 'control_base/stop_vertical_patrol';
      }
    } else if (id === 'hp'){
      if (text === 'HP') {
        command = 'control_base/horizontal_patrol';
      } else {
        command = 'control_base/stop_horizontal_patrol';
      }
    } else if (id === 'ms') {
      if(text === 'MS ON'){
        command = 'set_alarm/motion_armed_on';
      } else {
        command = 'set_alarm/motion_armed_off';
      }
    } else if (id === 'ir'){
      if(text === 'IR ON'){
        command = 'control_base/ir_on';
      } else {
        command = 'control_base/ir_off';
      }
    }
    $(this).text(alternate_text);
    $(this).data('alternate-text', text);
    if(command){
      $.get('/xhr/ipcamera/' + command, function(data){
        if(!data.status){
          popup_message('Error connecting to camera. Check log for further details.');
        }
      });
    }
  });

  $(document).on('mousedown', '#ipcamera .movement .direction', function() {
      $.get('/xhr/ipcamera/control_base/'+$(this).attr('id'), function(data) {
        if(!data.status){
          popup_message('Error connecting to camera. Check log for further details.');
        }
      });
  });

  $(document).on('mouseup', '#ipcamera .movement .direction', function() {
    $.get('/xhr/ipcamera/control_base/'+$(this).attr('id')+'_stop', function(data) {
      if(!data.status){
        popup_message('Error connecting to camera. Check log for further details.');
      }
    });
  });

  $(document).on('click', '#ipcamera .custom', function() {
    $.get('/xhr/ipcamera/'+$(this).data('command'), function(data) {
      if(!data.status){
        popup_message('Error connecting to camera. Check log for further details.');
      }
    });
  });
  /*****END IPCamera*****/

  function add_loading_gif(element) {
    $(element).append('<img src="' + WEBROOT + '/static/images/xhrloading.gif" class="xhrloading" width="18" height="15" alt="Loading...">');
  }

  function css_loading_gif(element) {
    $(element).children().css('background', 'url('+WEBROOT+'/static/images/xhrloading.gif) no-repeat center').html('&nbsp;');
  }

  function remove_loading_gif(element) {
    $(element).find('.xhrloading').remove();
  }

  function css_error_image(element) {
    $(element).children().css('background', 'url('+WEBROOT+'/static/images/no.png) no-repeat center').html('&nbsp;');
  }

  function css_success_image(element) {
    $(element).children().css('background', 'url('+WEBROOT+'/static/images/yes.png) no-repeat center').html('&nbsp;');
  }
  // generic expand truncated text

  $(document).on('click', '.expand', function() {
    var parent = $(this).parent();
    parent.find('.truncated').hide();
    parent.find('.spoiler_alert').hide();
    parent.find('.expanded').show();
    $(this).hide();
    return false;
  });

  // sortable modules

  $('ul.modules').sortable({
    connectWith: 'ul.modules',
    opacity: 0.8,
    distance: 80,
    disabled: true,
    stop: function() {
      var modules = [];

      $('.module, .inactive_module, .placeholder').each(function() {
        var position = 0;
        var li = $(this).closest('li');
        var column_ele = $(this).closest('.col');
        var lis = column_ele.find('ul.modules > li');

        for (var i = 0; i < lis.length; i++) {
          if (lis[i] == li.get(0)) {
            position = i+1;
            break;
          }
        }

        modules.push({
          name: $(this).data('module'),
          column: column_ele.attr('id').replace('col', ''),
          position: position
        });
      });

      $.post(WEBROOT + '/xhr/rearrange_modules', { modules: JSON.stringify(modules) }, function() {});
    }
  });

  // settings mode

  function toggle_settings_mode() {
    $('body').toggleClass('f_settings_mode');
    $('body').toggleClass('f_operation_mode');
    $('add_module').toggle();
    $('#tutorial').remove();

    if ($('body').hasClass('f_settings_mode')) {
      $('ul.modules').sortable({ disabled: false });
    } else {
      $('ul.modules').sortable({ disabled: true });
      $('.edit_settings .choices .cancel').click();
    }
  }

  $(document).on('click', '#settings_icon', function() {
    toggle_settings_mode();
  });

  $(document).on('taptwo', function() {
    toggle_settings_mode();
  });

  // add module

  $(document).on('click', '.add_module', function() {
    var column = $(this).closest('.col').attr('id');
    $.get(WEBROOT + '/xhr/add_module_dialog', function(data) {
      var existing_dialog = $('#add_module_dialog').length > 0;
      if (!existing_dialog) {
        var popup = $(data);
        $('body').append(popup);
        popup.data('col', column.replace('col', ''));
        popup.showPopup({ dispose: true });
      }
    });
  });

  $(document).on('change', '#add_module_dialog #select_module', function() {
    var module_description = $('#add_module_dialog .description');
    if (module_description.length === 0) {
      $('#add_module_dialog #select_module').after('<p class="description">');
      module_description = $('#add_module_dialog .description');
    }
    module_description.text($(this).find(':selected').data('description'));
  });

  $(document).on('click', '#add_module_dialog .submit', function() {
    var module_id = $('#add_module_dialog #select_module :selected').val();
    var column = $('#add_module_dialog').data('col');
    var position = $('#col' + column).find('.module, .placeholder').length + 1;

    $.post(WEBROOT + '/xhr/add_module', {
      module_id: module_id,
      column: column,
      position: position
    }, function(data) {
      $('#col' + column).find('ul.modules').append('<li>' + data + '</li>');
      init_modules();
      $('#add_module_dialog').fadeOut(300, function() {
        $(this).find('.close').click();
      });
    });
  });

  // remove module

  $(document).on('click', '.module_remove', function() {
    var button = $(this);

    confirmation_dialog({
      question: 'Are you sure that you want to remove this module?',
      confirm: function() {
        var module = button.closest('.module, .inactive_module, .placeholder');
        $.post(WEBROOT + '/xhr/remove_module/' + module.data('module'), {}, function() {
          module.fadeOut(300, function() {
            $(this).remove();
          });
        });
      }
    });
  });

  // module settings

  $(document).on('click', '.module_settings', function() {
    var module = $(this).closest('.module, .inactive_module, .placeholder');

    $.get(WEBROOT + '/xhr/module_settings_dialog/' + module.data('module'), function(data) {
      module.replaceWith(data);
    });
  });

  // save settings

  $(document).on('click', '.edit_settings .choices .save', function() {
    var module = $(this).closest('.module, .inactive_module, .placeholder');
    var module_name = module.data('module');
    var settings = module.find('form').serializeArray();

    $.post(WEBROOT + '/xhr/module_settings_save/' + module_name,
      { settings: JSON.stringify(settings) },
      function(data) {
        module.replaceWith(data);
        init_modules();
      }
    );
  });

  // cancel settings

  $(document).on('click', '.edit_settings .choices .cancel', function() {
    var module = $(this).closest('.module, .inactive_module, .placeholder');

    $.get(WEBROOT + '/xhr/module_settings_cancel/' + module.data('module'), function(data) {
      module.replaceWith(data);
      init_modules();
    });
  });

  // add/edit application

  $(document).on('click', '#add_application', function() {
    $.get(WEBROOT + '/xhr/add_application_dialog', function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('click', '.f_settings_mode #applications li a', function() {
    $.get(WEBROOT + '/xhr/edit_application_dialog/' + $(this).data('id'), function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
    return false;
  });

  $(document).on('click', '#add_edit_application_dialog .choices .save', function() {
    var form = $('#add_edit_application_dialog form');

    if (!validate_form(form)) {
      return false;
    }

    var settings = form.serialize();
    $.post(WEBROOT + '/xhr/add_edit_application', settings, function(data) {
      if (!data.status) {
        $('#applications').replaceWith(data);
        $('#add_edit_application_dialog .close').click();
      }
    });
  });

  $(document).on('click', '#add_edit_application_dialog .choices .delete', function() {
    var application_id = $('#add_edit_application_dialog input[name=application_id]').val();
    $.post(WEBROOT + '/xhr/delete_application/' + application_id, {}, function(data) {
      if (!data.status) {
        $('#applications').replaceWith(data);
        $('#add_edit_application_dialog .close').click();
      }
    });
  });

  // diskspace
  $(document).on('click', '#diskspace .group', function() {
    var ul = $(this).next('.group_disks');

    if (ul.hasClass('active')) {
      ul.removeClass('active');
      ul.slideUp(200);
    }
    else {
      ul.addClass('active');
      ul.slideDown(200);
    }
  });

  // add/edit disk

  $(document).on('click', '#add_disk', function() {
    $.get(WEBROOT + '/xhr/add_disk_dialog', function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('click', '.f_settings_mode #diskspace .disk', function() {
    $.get(WEBROOT + '/xhr/edit_disk_dialog/' + $(this).data('id'), function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
    return false;
  });

  $(document).on('click', '#add_edit_disk_dialog .choices .save', function() {
    var form = $('#add_edit_disk_dialog form');

    if (!validate_form(form)) {
      return false;
    }

    var settings = form.serialize();
    $.post(WEBROOT + '/xhr/add_edit_disk', settings, function(data) {
      if (!data.status) {
        $('#diskspace').replaceWith(data);
        $('#add_edit_disk_dialog .close').click();

      } else {
        $('#add_edit_disk_dialog label[for=id_disk_path]').html('Path (required) <span class="invalid">(invalid)</span>');
      }
    });
  });

  $(document).on('click', '#add_edit_disk_dialog .choices .delete', function() {
    var disk_id = $('#add_edit_disk_dialog input[name=disk_id]').val();
    $.post(WEBROOT + '/xhr/delete_disk/' + disk_id, {}, function(data) {
      if (!data.status) {
        $('#diskspace').replaceWith(data);
        $('#add_edit_disk_dialog .close').click();
      }
    });
  });

  // extra settings dialog

  $('#extra_settings').on('click', '.settings', function() {
    var dialog_type = $(this).attr('id');
    $.get(WEBROOT + '/xhr/extra_settings_dialog/' + dialog_type, function(data) {
      $('body').append(data);
      var popup = $('#' + dialog_type + '_dialog');
      popup.showPopup({
        dispose: true,
        confirm_selector: '.choices .save',
        on_confirm: function() {
          var settings = popup.find('form').serializeArray();

          $.post(WEBROOT + '/xhr/module_settings_save/' + dialog_type,
            { settings: JSON.stringify(settings) },
            function(data) {
              if (dialog_type === 'search_settings') {
                var search_enabled_val = popup.find('#id_search').val() === '1' ? 'True' : 'False';
                $('body').data('search_enabled', search_enabled_val);
              } else if (dialog_type === 'misc_settings') {
                window.location.reload();
              }
            }
          );
        }
      });
    });
  });

  $(document).on('click', '.enter_server_settings', function() {
    $('li#server_settings .add_server').click();
  });

  // Log Dialog
  $(document).on('click', '#log_dialog .pastebin', function(){
    $(this).text('');
    add_loading_gif(this);
    $.get(WEBROOT + '/xhr/log/pastebin', function(data){
      var popup = $(data);
      $('#log_dialog .close').click();
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('change', '#log_dialog .level_select', function(){
    var level = $('#log_dialog .level_select').val();

    if (level === 'all') {
      $('#log_dialog .log_body').each(function() {
        $(this).removeClass('disabled');
      });
    }

    else {
      $('#log_dialog .log_body').each(function() {
        if (!$(this).hasClass(level)) {
          $(this).addClass('disabled');
        }
        else {
          $(this).removeClass('disabled');
        }
      });
    }
  });

  // VIEW LOG
  $(document).on('click', '#manage_settings #view_log', function(){
    $.get(WEBROOT + '/xhr/log', function(data){
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  // RESTART
  $(document).on('click', '#manage_settings #restart', function(){
    var popup = $('<div id="updater" class="dialog" align="center"><div class="close" style="display:none;"></div><p>Restarting  <img src="' + WEBROOT + '/static/images/xhrloading.gif"/></p></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });
    stop_polling();
    $.get(WEBROOT + '/xhr/restart', function(data){
      if(data['restart_complete']){
        setTimeout(
          function() {
            window.location.reload(true);
          }, 2000
        );
      }
    });
  });

  // SHUTDOWN
  $(document).on('click', '#manage_settings #shutdown', function(){
    var popup = $('<div id="updater" class="dialog" align="center"><div class="close" style="display:none;"></div><p>Maraschino is shutting down...</p></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });
    stop_polling();
    $.get(WEBROOT + '/xhr/shutdown', function(data){
      if(data['shutdown_complete']){
        window.open('', '_self', '');
        window.close();
      } else {
        $("updater").text("Something prevented Maraschino from shutting down. Please check the logs for more details...");
      }
    });
  });

  // UPDATER
  function check_for_update() {
    $.get(WEBROOT + '/xhr/update_bar', function(data){
      if(data['up_to_date']) {
        return false;
      }
      else {
        $('#update_bar').replaceWith(data);
        $('#update_bar').slideDown(200);
      }
    });
  }

  $(document).on('click', '#manage_settings #update_check', function(){
    var popup = $('<div id="updater" class="dialog" align="center"><div class="close" style="display:none;"></div><p>Checking for updates  <img src="' + WEBROOT + '/static/images/xhrloading.gif"/></p></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });

    $.get(WEBROOT + '/xhr/updater/check', function(data){
      $('#updater .close').click();

      if(data['update'] !== 0){
        check_for_update();
      }
      else {
        popup_message('Maraschino is up to date.');
      }
    });
  });

  $(document).on('click', '#update_bar .dismiss', function(){
    $('#update_bar').slideUp(200);
  });

  $(document).on('click', '#update_bar .update', function(){
    var popup = $('<div id="updating" class="dialog" align="center"><div class="close" style="display:none;"></div><p>Maraschino is updating  <img src="' + WEBROOT + '/static/images/xhrloading.gif"/></p></div>');
    $('body').append(popup);
    popup.showPopup({ dispose: true });


    $.get(WEBROOT + '/xhr/updater/update', function(data){
      if(data['updated'] !== false){
        $('#updating p').replaceWith('<p>Update Complete.</p>');

        $.get(WEBROOT + '/xhr/restart', function(data){
          $('#updating p').replaceWith('<p>Restarting  <img src="' + WEBROOT + '/static/images/xhrloading.gif"/></p>');
          if(data['restart_complete']){
            setTimeout(
              function() {
                window.location.reload(true);
              }, 2000
            );
          }
        });
      } else {
        $('#updating .close').click();
        popup_message('Update failed.');
      }
    });
  });

  check_for_update();

  // Headphones
  $(document).on('click', '#headphones .get', function() {
    $.get(WEBROOT + '/xhr/headphones' + $(this).data('url'), function(data){
      $('#headphones').replaceWith(data);
    });
  });

  $(document).on('click', '#headphones .artists .action', function() {
    var li = $(this).parent().parent();
    $.get(WEBROOT + '/xhr/headphones/artist/' + li.data('id') + '/' + $(this).data('action'));
  });

  $(document).on('change keydown search', '#headphones .search .query', function(e) {
    var search_type = $('#headphones .search .search_type').val();
    var query = $(this).val();

    if(e.which == 13) {
      add_loading_gif('#headphones .search .loading');

      $.get(WEBROOT + '/xhr/headphones/search/' + search_type + '/' + query, function(data){
        var popup = $(data);
        $('body').append(popup);
        popup.showPopup({ dispose: true });
        remove_loading_gif('#headphones .search .loading');
      });
    }
  });

  $(document).on('click', '#headphones-search_dialog .add_artist', function() {
    var id = $(this).data('id');
    add_loading_gif('#headphones-search_dialog .inner .loading');

    $.get(WEBROOT + '/xhr/headphones/artist/' + id + '/add', function(data){
      $('#headphones-search_dialog .close').click();

      if (data.status == 'successful') {
        $.get(WEBROOT + '/xhr/headphones/artist/' + id, function(data){
          $('#headphones').replaceWith(data);
        });
      }
      else {
        popup_message('Failed to add artist');
      }
    });
  });

  $(document).on('click', '#headphones .add_artist', function(e) {
    e.stopPropagation();
    $.get(WEBROOT + '/xhr/headphones/artist/' + $(this).data('id') + '/add');
    $.get(WEBROOT + '/xhr/headphones/artist/' + $(this).data('id'), function(data){
      $('#headphones').replaceWith(data);
    });
  });

  $(document).on('click', '#headphones .control', function() {
    $.get(WEBROOT + '/xhr/headphones/control/' + $(this).data('control'));
  });

  $(document).on('click', '#headphones .artists .remove', function(e) {
    e.stopPropagation();
    var li = $(this).parent().parent();

    $(this).children('img').attr('src', WEBROOT + '/static/images/xhrloading.gif');

    $.get(WEBROOT + '/xhr/headphones/artist/' + li.data('id') + '/remove', function(data){
      if (data.status == 'successful') {
        li.transition({opacity: 0, duration: 1000}, function(){
          li.remove();
      });
      }
      else {
        popup_message('Failed to remove artist.');
      }
    });
  });

  $(document).on('click', '#headphones .artists .play_pause', function(e) {
    e.stopPropagation();
    var li = $(this).parent().parent();
    var button = $(this);

    $.get(WEBROOT + '/xhr/headphones/artist/' + li.data('id') + '/' + $(this).data('action'), function(data) {
      if (data.status == 'successful') {
        if (button.data('action') === 'pause') {
          button.data('action', 'resume').attr('title', 'Resume');
          button.children('img').attr('src', WEBROOT + '/static/images/play.png');
        }
        else {
          button.data('action', 'pause').attr('title', 'Pause');
          button.children('img').attr('src', WEBROOT + '/static/images/pause.png');
        }
      }
      else {
        popup_message('Failed to ' + button.data('action') + ' artist.');
      }
    });
  });

  $(document).on('click', '#headphones .artists .refresh', function(e) {
    e.stopPropagation();
    var li = $(this).parent().parent();

    $(this).children('img').attr('src', WEBROOT + '/static/images/xhrloading.gif');

    $.get(WEBROOT + '/xhr/headphones/artist/' + li.data('id') + '/' + $(this).data('action'));
  });

  $(document).on('change', '#headphones .album_status', function() {
    $.get(WEBROOT + '/xhr/headphones/album/' + $(this).data('id') + '/' + $(this).val());
  });

  $(document).on('click', '#headphones .similar .list_item', function() {
    window.open('http://musicbrainz.org/artist/' + $(this).data('id'));
  });

  $(document).on('click', '#headphones .hp_update', function() {
    $(this).hide();
    popup_message('Sent update request to Headphones.');
  });

  $(document).on('click', '#headphones .head_item', function() {
    $(this).children().replaceWith('<img src="' + WEBROOT + '/static/images/xhrloading.gif" width="14" height="14">');
  });
//script launcher

  $(document).on('click', '#add_script', function() {
    $.get(WEBROOT + '/xhr/add_script_dialog', function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
  });

  $(document).on('click', '.f_settings_mode #script_launcher li', function() {
    $.get(WEBROOT + '/xhr/edit_script_dialog/' + $(this).data('id'), function(data) {
      var popup = $(data);
      $('body').append(popup);
      popup.showPopup({ dispose: true });
    });
    return false;
  });

  $(document).on('click', '#add_edit_script_dialog .choices .save', function() {
    var form = $('#add_edit_script_dialog form');

    if (!validate_form(form)) {
      return false;
    }

    var settings = form.serialize();
    $.post(WEBROOT + '/xhr/add_edit_script', settings, function(data) {
      if (!data.status) {
        $('#script_launcher').replaceWith(data);
        $('#add_edit_script_dialog .close').click();
      } else  if (data.status == 'Command Required') {
        $('#add_edit_script_dialog label[for=id_script_command]').html('Command (required) <span class="invalid">(invalid)</span>');
      } else if (data.status == 'Label Required'){
        $('#add_edit_script_dialog label[for=id_script_label]').html('Label (required) <span class="invalid">(invalid)</span>');
      } else {
        $('#add_edit_script_dialog label[for=id_script_command]').html('Command (required) <span class="invalid">(invalid)</span>');
        $('#add_edit_script_dialog label[for=id_script_label]').html('Label (required) <span class="invalid">(invalid)</span>');
      }
    });
  });

  $(document).on('click', '#add_edit_script_dialog .choices .delete', function() {
    var script_id = $('#add_edit_script_dialog input[name=script_id]').val();
    $.post(WEBROOT + '/xhr/delete_script/' + script_id, {}, function(data) {
      if (!data.status) {
        $('#script_launcher').replaceWith(data);
        $('#add_edit_script_dialog .close').click();
      }
    });
  });

  $(document).on('click', '#script_launcher .script', function() {
    $.get(WEBROOT + '/xhr/script_launcher/start_script/' + $(this).data('id'), function(data) {
        $('#script_launcher').replaceWith(data);
    });
  });

  // Quit module polling
  function stop_polling(){
    for (var key in timeOuts) {
      clearTimeout(timeOuts[key]);
    }
  }

  // Poll list of modules
  function poll_modules(list){
    $.each(list, function(i){
      if ($('#'+list[i]).hasClass('module')) {
        get_module(list[i]);
      }
    });
  }

  // Prevent body scrolling
  $(document).on('mousewheel', 'div[class*=noscroll]', function (e, d) {
    var height = $(this).height(),
        scrollHeight = this.scrollHeight,
        scrollTop = this.scrollTop;

    if((scrollTop === (scrollHeight - height) && d < 0) || (scrollTop === 0 && d > 0)) {
      e.preventDefault();
    }
  });});
