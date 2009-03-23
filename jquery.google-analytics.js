/*
* jquery-google-analytics plugin
*
* A jQuery plugin that makes it easier to implement Google Analytics tracking, including event and link tracking.
*
* Adds the following methods to jQuery:
* - $.trackPage() - Adds Google Analytics tracking to the page it's called from.
* - $('a').track() - Adds click tracking to elements.
* - $.trackEvent() - Tracks an event using the given parameters. 
* - $.timePageLoad() - Measures the time it takes  an event using the given parameters. 
*
* Features:
*
* - Improves page load times by loading Google Analytics code without blocking
* - Easy and extensible event and link tracking plugin for jQuery and Google Analytics
* - Automatic internal/external link detection. Default behavior is to skip tracking of internal links.
* - Configurable: skip internal link tracking, metadata extraction using callbacks.
* - Enforces that tracking event handler is added only once.
*
* Copyright (c) 2008 Christian Hellsten
*
* Plugin homepage:
* http://aktagon.com/projects/jquery/google-analytics/
* http://github.com/christianhellsten/jquery-google-analytics/
*
* Examples:
* http://aktagon.com/projects/jquery/google-analytics/examples/
* http://code.google.com/apis/analytics/docs/eventTrackerGuide.html
*
* Repository:
* git://github.com/christianhellsten/jquery-google-analytics.git
*
* Version 1.1.0
*
* Tested with:
* - Mac: Firefox 3
* - Linux: Firefox 3
* - Windows: Firefox 3, Internet Explorer 6
*
* Licensed under the MIT license:
* http://www.opensource.org/licenses/mit-license.php
*
* Credits:
*   - http://google.com/analytics: 
*   - http://lyncd.com: 
*       The trackPage method was found here http://lyncd.com/2009/03/better-google-analytics-javascript/ and improved on slightly.
*
*/

(function($) {

  var pageTracker;

  /**
   * Enables Google Analytics tracking on the page it's called from. 
   *
   * Example:
   *
   *  <script type="text/javascript">
   *    $.trackPage('UA-xxx-xxx', options);
   *  </script>
   *
   * Parameters:
   *
   *  account_id - Your Google Analytics account ID.
   *  options - An associative array containing one or more optional parameters:
   *    - onload - If false, the Google Analytics code is loaded when this method is called instead of on window.onload.
   *    - status_code - The HTTP status code of the current server response. If this is set to something other than 200 then the page is tracked as an error page. See this page for details: http://www.google.com/support/analytics/bin/answer.py?hl=en&answer=86927
   *
   */
  $.trackPage = function(account_id, options) {
    var host = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
    var script;

    // Use default options, if necessary
    var settings = $.extend({}, {onload: true, status_code: 200}, options);
    
    script    = document.createElement('script');
    script.src  = host + 'google-analytics.com/ga.js';
    script.type   = 'text/javascript';
    script.onloadDone = false;
    
    function init_analytics() {
      if (!script.onloadDone) {
        debug('Google Analytics loaded');

        script.onloadDone = true;

        try {
          pageTracker = _gat._getTracker(account_id);

          if(settings.status_code == null || settings.status_code == 200) {
            pageTracker._trackPageview();
          } else {
            debug('Tracking error ' + settings.status_code);
            pageTracker._trackPageview("/" + settings.status_code + ".html?page=" + document.location.pathname + document.location.search + "&from=" + document.referrer);
          }
          
        } catch(err) {
          debug('Google Analytics failed to load: ' + err);
        }

      }
    }
    
    script.onload = function () {
      init_analytics();
    };
    
    script.onreadystatechange = function() {
      if ('loaded' === script.readyState) {
        init_analytics();
      }
    };

    // Enable tracking by adding script to head
    load_script = function() {
      document.getElementsByTagName('head')[0].appendChild(script);
    }

    // Enable tracking when called or on page load?
    if(settings.onload == true || settings.onload == null) {
      $(window).load(load_script);
    } else {
      load_script();
    }
  }

  /**
   * Tracks an event using the given parameters. 
   *
   * The trackEvent method takes four arguments:
   *
   *  category - required string used to group events
   *  action - required string used to define event type, eg. click, download
   *  label - optional label to attach to event, eg. buy
   *  value - optional numerical value to attach to event, eg. price
   *  skip_internal - optional boolean value. If true then internal links are not tracked.
   *
   */
  $.trackEvent = function(category, action, label, value) {
    if(typeof pageTracker == 'undefined') {
      debug('FATAL: pageTracker is not defined'); // blocked by whatever
    } else {
      pageTracker._trackEvent(category, action, label, value);
    }
  };

  /**
   * Adds click tracking to elements. Usage:
   *
   *  $('a').track()
   *
   */
  $.fn.track = function(options) {
    
    var element = $(this);
    
    // Prevent link from being tracked multiple times 
    if (element.hasClass("tracked")) {
      return;
    }

    element.addClass("tracked");

    // Add click handler to all matching elements
    return this.each(function() {
      var link   = $(this);

      // Use default options, if necessary
      var settings = $.extend({}, $.fn.track.defaults, options);

      var category = evaluate(link, settings.category);
      var action   = evaluate(link, settings.action);
      var label    = evaluate(link, settings.label);
      var value    = evaluate(link, settings.value);
      var event_name = evaluate(link, settings.event_name);
      
      var message  = "category:'" + category + "' action:'" + action + "' label:'" + label + "' value:'" + value + "'";
      
      debug('Tracking ' + event_name + ' ' + message);

      link.bind(event_name, function() {       
        
        // Should we skip internal links?
        var skip = settings.skip_internal && (link[0].hostname == location.hostname);
      
        if(!skip) {
          $.trackEvent(category, action, label, value);
          debug('Tracked ' + message);
        } else {
          debug('Skipped ' + message);
        }

        return true;
      });
    });
    
    /**
     * If second parameter is a string: returns the value of the second parameter.
     * If the second parameter is a function: passes the element to the function and returns function's return value.
     */
    function evaluate(element, text_or_function) {
      if(typeof text_or_function == 'function') {
        text_or_function = text_or_function(element);
      }
      return text_or_function;
    };
  };

  /**
   * Prints to Firebug console if available. 
   */
  function debug(message) {
    if(typeof console != 'undefined') {
      console.debug(message);
    }     
  };

  // Default (overridable) settings
  $.fn.track.defaults = {
    category      : function(element) { return (element[0].hostname == location.hostname) ? 'internal':'external'; },
    action        : 'click',
    label         : function(element) { return element.attr('href') },
    value         : null,
    skip_internal : true,
    event_name    : 'click'
  };
})(jQuery);
