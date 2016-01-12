$(function() {
  var $sidebar = $('#sidebar');
  var $nav = $sidebar.find('nav');
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
});
