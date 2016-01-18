$(function() {
  // $(document).foundation();

  var $sidebar = $('#sidebar');
  if ($sidebar.length) {
    var $docs = $('#docs');
    var $nav = $sidebar.find('nav');

    //
    // Setup sidebar navigation
    var traverse = new Traverse($nav, {
      threshold: 10,
      barOffset: $sidebar.position().top
    });

    $nav.on('update.traverse', function(event, element) {
      $nav.find('section').removeClass('expand');
      var $section = element.parents('section:first');
      if ($section.length) {
        $section.addClass('expand');
      }
    });

    //
    // Bind the drawer layout
    var $drawerLayout = $('.drawer-layout'),
      $drawer = $drawerLayout.find('.drawer'),
      closeDrawer = function() {
        $drawer.removeClass('slide-right slide-left');
        $drawer.find('.drawer-overlay').remove();
        $drawerLayout.removeClass('drawer-open drawer-slide-left-large drawer-slide-right-large');
        return false;
      };

    // Drawer open buttons
    $drawerLayout.find('[data-drawer-slide]').click(function(e) {
      var $this = $(this),
        direction = $this.data('drawer-slide');
      $drawerLayout.addClass('drawer-open');
      $drawer.addClass('slide-' + direction);

      var $overlay = $('<a href="#" class="drawer-overlay"></a>')
      $drawer.append($overlay);
      $overlay.click(closeDrawer);

      return false;
    });

    // Drawer close buttons
    $drawerLayout.find('[data-drawer-close]').click(closeDrawer);
  }
});
