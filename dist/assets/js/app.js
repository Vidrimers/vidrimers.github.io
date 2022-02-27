console.log("created by Shiryakov Yaroslav");


// //= components/tabs.js
// //= components/modal.js


// //= ../../../node_modules/slick-carousel/slick/slick.js

$(function () {
  $('.hero__menu-btn').on('click', function () {
      console.log('YOBA ETO TY?')
      $('.hero__menu-list').toggleClass('hero__menu-list--active');
  });
})