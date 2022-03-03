  $('.hero__menu-btn').on('click', function () {
      console.log('YOBA ETO TY?')
      $('.hero__menu-btn').toggleClass('hero__menu-btn--active');
      $('.hero__menu-list').toggleClass('hero__menu-list--active');
      $('body').toggleClass('lock');
  });

  $('.hero__menu-list-link').on('click', function () {
      console.log('YOBA ETO TY?2')
      $('.hero__menu-btn').removeClass('hero__menu-btn--active');
      $('.hero__menu-list').removeClass('hero__menu-list--active');
      $('body').removeClass('lock');
  });